import { useEffect, useRef } from "react";
import { useAppDispatch, useAppSelector } from "../store/hooks";
import { addMessage, updateMessage } from "../store/slices/messagesSlice";
import {
	updateConversationLastMessage,
	incrementUnreadCount,
} from "../store/slices/conversationsSlice";
import { supabase } from "../services/supabase";
import type { Message } from "../types";

export function useMessagesRealtime(currentConversationId: string | null) {
	const dispatch = useAppDispatch();
	const { user } = useAppSelector(state => state.auth);
	const channelRef = useRef<ReturnType<typeof supabase.channel> | null>(null);
	const reconnectTimeoutRef = useRef<number | null>(null);
	const isSubscribingRef = useRef(false);
	const currentConversationIdRef = useRef<string | null>(null);

	// Keep ref in sync with prop
	useEffect(() => {
		currentConversationIdRef.current = currentConversationId;
	}, [currentConversationId]);

	const subscribeToChannel = async () => {
		if (!user || isSubscribingRef.current) return;

		// Verify user is authenticated before subscribing
		const {
			data: { session },
		} = await supabase.auth.getSession();

		if (!session) {
			console.error("❌ Cannot subscribe to messages: User not authenticated");
			return;
		}

		// Capture user ID at subscription time to avoid closure issues
		const currentUserId = user.id;

		// Remove existing channel if any
		if (channelRef.current) {
			supabase.removeChannel(channelRef.current);
		}

		isSubscribingRef.current = true;

		// Create a channel for messages changes
		const channel = supabase
			.channel(`messages:${currentUserId}`)
			.on(
				"postgres_changes" as any,
				{
					event: "INSERT",
					schema: "public",
					table: "messages",
					// Listen to messages where current user is the receiver
					// We'll filter for receiver_id in the callback since filters don't work well with joins
				},
				async (payload: { eventType: "INSERT"; new: any }) => {
					if (payload.eventType === "INSERT" && payload.new) {
						const newMessage = payload.new;

						// Get conversation to check receiver_id
						const { data: conversation } = await supabase
							.from("conversations")
							.select("*")
							.eq("id", newMessage.conversation_id)
							.single();

						if (!conversation) return;

						// Determine if current user is the receiver
						const isReceiver =
							(conversation.user1_id === currentUserId &&
								newMessage.sender_id !== currentUserId) ||
							(conversation.user2_id === currentUserId &&
								newMessage.sender_id !== currentUserId);

						if (!isReceiver) return; // Not a message for this user

						// Fetch sender profile
						const { data: senderProfile } = await supabase
							.from("profiles")
							.select("*")
							.eq("id", newMessage.sender_id)
							.single();

						const message: Message = {
							...newMessage,
							sender: senderProfile || undefined,
						};

						// If viewing this conversation, add message directly
						if (
							currentConversationIdRef.current === newMessage.conversation_id
						) {
							dispatch(addMessage(message));
							// Mark as read immediately since user is viewing
							await supabase
								.from("messages")
								.update({ read: true })
								.eq("id", newMessage.id);

							// Mark any related notifications as read since user is viewing
							// No need to check first - update will only affect matching rows
							await supabase
								.from("notifications")
								.update({ read: true })
								.eq("user_id", currentUserId)
								.eq("type", "message")
								.eq("related_id", newMessage.conversation_id)
								.eq("read", false);
						}

						// Update conversation last message
						dispatch(
							updateConversationLastMessage({
								conversationId: newMessage.conversation_id,
								message,
							}),
						);

						// Increment unread count if not viewing this conversation
						if (
							currentConversationIdRef.current !== newMessage.conversation_id
						) {
							dispatch(incrementUnreadCount(newMessage.conversation_id));
						}

						// Notification will be created by database trigger
						// The notifications realtime hook will handle adding it to Redux state
						// If user is viewing this conversation, we've already marked it as read above
					}
				},
			)
			.on(
				"postgres_changes" as any,
				{
					event: "UPDATE",
					schema: "public",
					table: "messages",
				},
				async (payload: { eventType: "UPDATE"; new: any; old: any }) => {
					if (payload.eventType === "UPDATE" && payload.new) {
						const updatedMessage = payload.new;

						// Fetch sender profile
						const { data: senderProfile } = await supabase
							.from("profiles")
							.select("*")
							.eq("id", updatedMessage.sender_id)
							.single();

						const message: Message = {
							...updatedMessage,
							sender: senderProfile || undefined,
						};

						// Update message in state if it exists
						dispatch(updateMessage(message));

						// If message was marked as read and we're viewing this conversation,
						// update conversation unread count
						if (
							updatedMessage.read &&
							!payload.old.read &&
							currentConversationIdRef.current ===
								updatedMessage.conversation_id
						) {
							// Unread count will be handled by markMessagesAsRead
						}
					}
				},
			)
			.subscribe(status => {
				isSubscribingRef.current = false;

				if (status === "SUBSCRIBED") {
					console.log("✅ Messages channel subscribed successfully");
					// Clear any pending reconnect attempts
					if (reconnectTimeoutRef.current) {
						clearTimeout(reconnectTimeoutRef.current);
						reconnectTimeoutRef.current = null;
					}
				} else if (status === "CHANNEL_ERROR") {
					console.error(
						"❌ Messages channel error - Will attempt to reconnect...",
					);
					// Attempt to reconnect after a delay
					if (!reconnectTimeoutRef.current) {
						reconnectTimeoutRef.current = window.setTimeout(() => {
							reconnectTimeoutRef.current = null;
							console.log("🔄 Attempting to reconnect to messages channel...");
							subscribeToChannel();
						}, 3000);
					}
				} else if (status === "TIMED_OUT") {
					console.warn(
						"⚠️ Messages channel subscription timed out - Will attempt to reconnect...",
					);
					if (!reconnectTimeoutRef.current) {
						reconnectTimeoutRef.current = window.setTimeout(() => {
							reconnectTimeoutRef.current = null;
							console.log("🔄 Attempting to reconnect to messages channel...");
							subscribeToChannel();
						}, 3000);
					}
				} else if (status === "CLOSED") {
					console.log(
						"📡 Messages channel closed - Will attempt to reconnect...",
					);
					if (!reconnectTimeoutRef.current) {
						reconnectTimeoutRef.current = window.setTimeout(() => {
							reconnectTimeoutRef.current = null;
							console.log("🔄 Attempting to reconnect to messages channel...");
							subscribeToChannel();
						}, 3000);
					}
				} else {
					console.log("📡 Channel status:", status);
				}
			});

		channelRef.current = channel;
	};

	useEffect(() => {
		if (!user) {
			// Clean up if user logs out
			if (channelRef.current) {
				supabase.removeChannel(channelRef.current);
				channelRef.current = null;
			}
			if (reconnectTimeoutRef.current) {
				clearTimeout(reconnectTimeoutRef.current);
				reconnectTimeoutRef.current = null;
			}
			return;
		}

		subscribeToChannel();

		// Cleanup function
		return () => {
			if (channelRef.current) {
				supabase.removeChannel(channelRef.current);
				channelRef.current = null;
			}
			if (reconnectTimeoutRef.current) {
				clearTimeout(reconnectTimeoutRef.current);
				reconnectTimeoutRef.current = null;
			}
			isSubscribingRef.current = false;
		};
	}, [user, dispatch]);
}
