import { useRealtimeSubscription } from "./useRealtimeSubscription";
import { useAppDispatch, useAppSelector } from "../store/hooks";
import { store } from "../store";
import { addMessage, updateMessage } from "../store/slices/messagesSlice";
import {
	updateConversationLastMessage,
	incrementUnreadCount,
	addConversation,
} from "../store/slices/conversationsSlice";
import { supabase } from "../services/supabase";
import type { Message, Conversation } from "../types";

export function useMessagesRealtime() {
	const dispatch = useAppDispatch();
	const { user } = useAppSelector(state => state.auth);
	// Get current conversation from Redux state
	const currentConversationId = useAppSelector(
		state => state.conversations.currentConversationId,
	);

	useRealtimeSubscription({
		channelName: `messages:${user?.id}:insert`,
		table: "messages",
		// No filter - we check receiver in callback
		onInsert: async (payload: { eventType: "INSERT"; new: any }) => {
			if (payload.eventType === "INSERT" && payload.new && user) {
				const newMessage = payload.new;
				const currentUserId = user.id;

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

				// ALWAYS add message to Redux (regardless of current page)
				dispatch(addMessage(message));

				// If viewing this conversation, mark as read immediately
				if (currentConversationId === newMessage.conversation_id) {
					await supabase
						.from("messages")
						.update({ read: true })
						.eq("id", newMessage.id);

					// Mark any related notifications as read
					await supabase
						.from("notifications")
						.update({ read: true })
						.eq("user_id", currentUserId)
						.eq("type", "message")
						.eq("related_id", newMessage.conversation_id)
						.eq("read", false);
				}

				// Check if conversation exists in state - if not, add it
				const state = store.getState();
				const conversationExists =
					!!state.conversations.conversationsById[newMessage.conversation_id];

				if (!conversationExists) {
					// Conversation doesn't exist in list, add it
					// Fetch full conversation data with profiles
					const { data: fullConversation } = await supabase
						.from("conversations")
						.select(
							`
						*,
						user1:profiles!conversations_user1_id_fkey(*),
						user2:profiles!conversations_user2_id_fkey(*)
					`,
						)
						.eq("id", newMessage.conversation_id)
						.single();

					if (fullConversation) {
						// Fetch unread count
						const { count: unreadCount } = await supabase
							.from("messages")
							.select("*", { count: "exact", head: true })
							.eq("conversation_id", newMessage.conversation_id)
							.eq("read", false)
							.neq("sender_id", currentUserId);

						dispatch(
							addConversation({
								...fullConversation,
								last_message: message,
								unread_count: unreadCount || 0,
							} as Conversation),
						);
					}
				} else {
					// Conversation exists, just update last message
					dispatch(
						updateConversationLastMessage({
							conversationId: newMessage.conversation_id,
							message,
						}),
					);

					// Increment unread count if not viewing this conversation
					if (currentConversationId !== newMessage.conversation_id) {
						dispatch(incrementUnreadCount(newMessage.conversation_id));
					}
				}
			}
		},
	});

	useRealtimeSubscription({
		channelName: `messages:${user?.id}:update`,
		table: "messages",
		// No filter - we check in callback
		onUpdate: async (payload: { eventType: "UPDATE"; new: any; old: any }) => {
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
					currentConversationId === updatedMessage.conversation_id
				) {
					// Unread count will be handled by markMessagesAsRead
				}
			}
		},
	});
}
