import { useRealtimeSubscription } from "./useRealtimeSubscription";
import { useAppDispatch, useAppSelector } from "../store/hooks";
import { store } from "../store";
import { addMessage, updateMessage } from "../store/slices/messagesSlice";
import {
	updateConversationLastMessage,
	incrementUnreadCount,
	addConversation,
	resetUnreadCount,
} from "../store/slices/conversationsSlice";
import { markConversationNotificationsAsRead } from "../store/slices/notificationsSlice";
import { supabase } from "../services/supabase";
import type { Message, Conversation } from "../types";

export function useMessagesRealtime() {
	const dispatch = useAppDispatch();
	const { user } = useAppSelector(state => state.auth);

	useRealtimeSubscription({
		channelName: `messages:${user?.id}:insert`,
		table: "messages",
		// No filter - we check receiver in callback
		onInsert: async (payload: { eventType: "INSERT"; new: any }) => {
			if (payload.eventType === "INSERT" && payload.new && user) {
				const newMessage = payload.new;
				const currentUserId = user.id;

				// Get current conversation ID fresh from Redux state (not from closure)
				// This ensures we always have the latest value
				const state = store.getState();
				const currentConversationId = state.conversations.currentConversationId;

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

					// Mark any related notifications as read (updates both DB and Redux)
					dispatch(
						markConversationNotificationsAsRead(newMessage.conversation_id),
					);

					// Reset conversation unread_count since we're viewing it
					dispatch(resetUnreadCount(newMessage.conversation_id));
				}

				// Check if conversation exists in state - if not, add it
				// Get fresh state to ensure we have latest conversation data
				const latestState = store.getState();
				const conversationExists =
					!!latestState.conversations.conversationsById[
						newMessage.conversation_id
					];

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
						// If we're viewing this conversation, unread_count should be 0
						// Otherwise, fetch actual unread count
						const isViewing =
							currentConversationId === newMessage.conversation_id;
						let unreadCount = 0;
						if (!isViewing) {
							const { count } = await supabase
								.from("messages")
								.select("*", { count: "exact", head: true })
								.eq("conversation_id", newMessage.conversation_id)
								.eq("read", false)
								.neq("sender_id", currentUserId);
							unreadCount = count || 0;
						}

						dispatch(
							addConversation({
								...fullConversation,
								last_message: message,
								unread_count: unreadCount,
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
					// Re-check currentConversationId to ensure we have latest value
					const latestCurrentConversationId =
						store.getState().conversations.currentConversationId;
					if (latestCurrentConversationId !== newMessage.conversation_id) {
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

				// Get current conversation ID fresh from Redux state
				const currentConversationId =
					store.getState().conversations.currentConversationId;

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
