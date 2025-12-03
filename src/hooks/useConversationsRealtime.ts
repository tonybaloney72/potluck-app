// src/hooks/useConversationsRealtime.ts
import { useRealtimeSubscription } from "./useRealtimeSubscription";
import { useAppDispatch, useAppSelector } from "../store/hooks";
import { store } from "../store";
import { supabase } from "../services/supabase";
import {
	addConversation,
	updateConversation,
} from "../store/slices/conversationsSlice";
import type { Conversation, Message } from "../types";

export function useConversationsRealtime() {
	const dispatch = useAppDispatch();
	const { user } = useAppSelector(state => state.auth);

	// Helper function to enrich conversation with profiles
	const enrichConversation = async (
		conversationData: any,
	): Promise<Conversation> => {
		const { data: user1Profile } = await supabase
			.from("profiles")
			.select("*")
			.eq("id", conversationData.user1_id)
			.single();

		const { data: user2Profile } = await supabase
			.from("profiles")
			.select("*")
			.eq("id", conversationData.user2_id)
			.single();

		return {
			...conversationData,
			user1: user1Profile || undefined,
			user2: user2Profile || undefined,
		};
	};

	// Helper function to fetch last message
	const fetchLastMessage = async (
		conversationId: string,
	): Promise<Message | undefined> => {
		const { data: lastMessageData, error } = await supabase
			.from("messages")
			.select(`*, sender:profiles!messages_sender_id_fkey(*)`)
			.eq("conversation_id", conversationId)
			.order("created_at", { ascending: false })
			.limit(1)
			.single();

		// Handle case where no message exists yet (new conversation)
		if (error || !lastMessageData) {
			return undefined;
		}

		return lastMessageData as Message;
	};

	// Helper function to fetch unread count
	const fetchUnreadCount = async (
		conversationId: string,
		userId: string,
	): Promise<number> => {
		const { count } = await supabase
			.from("messages")
			.select("*", { count: "exact", head: true })
			.eq("conversation_id", conversationId)
			.eq("read", false)
			.neq("sender_id", userId);

		return count || 0;
	};

	// Subscription 1: INSERT where user is user1
	useRealtimeSubscription({
		channelName: `conversations:${user?.id}:insert:user1`,
		table: "conversations",
		filter: `user1_id=eq.${user?.id}`,
		onInsert: async (payload: { eventType: "INSERT"; new: any }) => {
			if (payload.eventType === "INSERT" && payload.new) {
				const conversation = await enrichConversation(payload.new);
				const lastMessage = await fetchLastMessage(payload.new.id);

				dispatch(
					addConversation({
						...conversation,
						last_message: lastMessage,
						unread_count: 0,
					}),
				);
			}
		},
	});

	// Subscription 2: INSERT where user is user2
	useRealtimeSubscription({
		channelName: `conversations:${user?.id}:insert:user2`,
		table: "conversations",
		filter: `user2_id=eq.${user?.id}`,
		onInsert: async (payload: { eventType: "INSERT"; new: any }) => {
			if (payload.eventType === "INSERT" && payload.new) {
				const conversation = await enrichConversation(payload.new);
				const lastMessage = await fetchLastMessage(payload.new.id);

				dispatch(
					addConversation({
						...conversation,
						last_message: lastMessage,
						unread_count: 0,
					}),
				);
			}
		},
	});

	// Subscription 3: UPDATE where user is user1
	useRealtimeSubscription({
		channelName: `conversations:${user?.id}:update:user1`,
		table: "conversations",
		filter: `user1_id=eq.${user?.id}`,
		onUpdate: async (payload: { eventType: "UPDATE"; new: any }) => {
			if (payload.eventType === "UPDATE" && payload.new) {
				const conversation = await enrichConversation(payload.new);

				// Fetch last message if last_message_at was updated
				let lastMessage: Message | undefined;
				if (payload.new.last_message_at) {
					lastMessage = await fetchLastMessage(payload.new.id);
				}

				// Check if conversation exists in state - if not, add it (upsert pattern)
				const state = store.getState();
				const exists = !!state.conversations.conversationsById[payload.new.id];

				if (exists) {
					dispatch(
						updateConversation({
							...conversation,
							last_message: lastMessage,
						}),
					);
				} else {
					// Conversation doesn't exist, add it (handles case where UPDATE fires before INSERT)
					// Fetch unread count for accurate state
					const unreadCount = user
						? await fetchUnreadCount(payload.new.id, user.id)
						: 0;

					dispatch(
						addConversation({
							...conversation,
							last_message: lastMessage,
							unread_count: unreadCount,
						}),
					);
				}
			}
		},
	});

	// Subscription 4: UPDATE where user is user2
	useRealtimeSubscription({
		channelName: `conversations:${user?.id}:update:user2`,
		table: "conversations",
		filter: `user2_id=eq.${user?.id}`,
		onUpdate: async (payload: { eventType: "UPDATE"; new: any }) => {
			if (payload.eventType === "UPDATE" && payload.new) {
				const conversation = await enrichConversation(payload.new);

				// Fetch last message if last_message_at was updated
				let lastMessage: Message | undefined;
				if (payload.new.last_message_at) {
					lastMessage = await fetchLastMessage(payload.new.id);
				}

				// Check if conversation exists in state - if not, add it (upsert pattern)
				const state = store.getState();
				const exists = !!state.conversations.conversationsById[payload.new.id];

				if (exists) {
					dispatch(
						updateConversation({
							...conversation,
							last_message: lastMessage,
						}),
					);
				} else {
					// Conversation doesn't exist, add it (handles case where UPDATE fires before INSERT)
					// Fetch unread count for accurate state
					const unreadCount = user
						? await fetchUnreadCount(payload.new.id, user.id)
						: 0;

					dispatch(
						addConversation({
							...conversation,
							last_message: lastMessage,
							unread_count: unreadCount,
						}),
					);
				}
			}
		},
	});
}
