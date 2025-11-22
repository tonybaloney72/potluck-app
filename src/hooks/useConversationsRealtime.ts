import { useEffect, useRef } from "react";
import { useAppDispatch, useAppSelector } from "../store/hooks";
import { supabase } from "../services/supabase";
import {
	addConversation,
	updateConversation,
} from "../store/slices/conversationsSlice";
import type { Conversation, Message } from "../types";

export function useConversationsRealtime() {
	const dispatch = useAppDispatch();
	const { user } = useAppSelector(state => state.auth);
	const channelRef = useRef<ReturnType<typeof supabase.channel> | null>(null);
	const reconnectTimeoutRef = useRef<number | null>(null);
	const isSubscribingRef = useRef(false);

	const subscribeToChannel = async () => {
		if (!user || isSubscribingRef.current) return;

		// Verify user is authenticated before subscribing
		const {
			data: { session },
		} = await supabase.auth.getSession();

		if (!session) {
			console.error(
				"❌ Cannot subscribe to conversations: User not authenticated",
			);
			return;
		}

		// Capture user ID at subscription time to avoid closure issues
		const currentUserId = user.id;

		// Remove existing channel if any
		if (channelRef.current) {
			supabase.removeChannel(channelRef.current);
		}

		isSubscribingRef.current = true;

		// Create a channel for conversations changes
		const channel = supabase
			.channel(`conversations:${currentUserId}`)
			.on(
				"postgres_changes" as any,
				{
					event: "INSERT",
					schema: "public",
					table: "conversations",
					// Listen to conversations where current user is involved
					filter: `user1_id=eq.${currentUserId}`,
				},
				async (payload: { eventType: "INSERT"; new: any }) => {
					if (payload.eventType === "INSERT" && payload.new) {
						const newConversation = payload.new;

						// Fetch user profiles
						const { data: user1Profile } = await supabase
							.from("profiles")
							.select("*")
							.eq("id", newConversation.user1_id)
							.single();

						const { data: user2Profile } = await supabase
							.from("profiles")
							.select("*")
							.eq("id", newConversation.user2_id)
							.single();

						const conversation: Conversation = {
							...newConversation,
							user1: user1Profile || undefined,
							user2: user2Profile || undefined,
							unread_count: 0,
						};

						dispatch(addConversation(conversation));
					}
				},
			)
			.on(
				"postgres_changes" as any,
				{
					event: "INSERT",
					schema: "public",
					table: "conversations",
					filter: `user2_id=eq.${currentUserId}`,
				},
				async (payload: { eventType: "INSERT"; new: any }) => {
					if (payload.eventType === "INSERT" && payload.new) {
						const newConversation = payload.new;

						// Fetch user profiles
						const { data: user1Profile } = await supabase
							.from("profiles")
							.select("*")
							.eq("id", newConversation.user1_id)
							.single();

						const { data: user2Profile } = await supabase
							.from("profiles")
							.select("*")
							.eq("id", newConversation.user2_id)
							.single();

						const conversation: Conversation = {
							...newConversation,
							user1: user1Profile || undefined,
							user2: user2Profile || undefined,
							unread_count: 0,
						};

						dispatch(addConversation(conversation));
					}
				},
			)
			.on(
				"postgres_changes" as any,
				{
					event: "UPDATE",
					schema: "public",
					table: "conversations",
					filter: `user1_id=eq.${currentUserId}`,
				},
				async (payload: { eventType: "UPDATE"; new: any }) => {
					if (payload.eventType === "UPDATE" && payload.new) {
						const updatedConversation = payload.new;

						// Fetch user profiles
						const { data: user1Profile } = await supabase
							.from("profiles")
							.select("*")
							.eq("id", updatedConversation.user1_id)
							.single();

						const { data: user2Profile } = await supabase
							.from("profiles")
							.select("*")
							.eq("id", updatedConversation.user2_id)
							.single();

						// Fetch last message if last_message_at was updated
						let lastMessage: Message | undefined;
						if (updatedConversation.last_message_at) {
							const { data: lastMessageData } = await supabase
								.from("messages")
								.select(
									`
                  *,
                  sender:profiles!messages_sender_id_fkey(*)
                `,
								)
								.eq("conversation_id", updatedConversation.id)
								.order("created_at", { ascending: false })
								.limit(1)
								.single();

							lastMessage = lastMessageData as Message | undefined;
						}

						const conversation: Conversation = {
							...updatedConversation,
							user1: user1Profile || undefined,
							user2: user2Profile || undefined,
							last_message: lastMessage,
						};

						dispatch(updateConversation(conversation));
					}
				},
			)
			.on(
				"postgres_changes" as any,
				{
					event: "UPDATE",
					schema: "public",
					table: "conversations",
					filter: `user2_id=eq.${currentUserId}`,
				},
				async (payload: { eventType: "UPDATE"; new: any }) => {
					if (payload.eventType === "UPDATE" && payload.new) {
						const updatedConversation = payload.new;

						// Fetch user profiles
						const { data: user1Profile } = await supabase
							.from("profiles")
							.select("*")
							.eq("id", updatedConversation.user1_id)
							.single();

						const { data: user2Profile } = await supabase
							.from("profiles")
							.select("*")
							.eq("id", updatedConversation.user2_id)
							.single();

						// Fetch last message if last_message_at was updated
						let lastMessage: Message | undefined;
						if (updatedConversation.last_message_at) {
							const { data: lastMessageData } = await supabase
								.from("messages")
								.select(
									`
                  *,
                  sender:profiles!messages_sender_id_fkey(*)
                `,
								)
								.eq("conversation_id", updatedConversation.id)
								.order("created_at", { ascending: false })
								.limit(1)
								.single();

							lastMessage = lastMessageData as Message | undefined;
						}

						const conversation: Conversation = {
							...updatedConversation,
							user1: user1Profile || undefined,
							user2: user2Profile || undefined,
							last_message: lastMessage,
						};

						dispatch(updateConversation(conversation));
					}
				},
			)
			.subscribe(status => {
				isSubscribingRef.current = false;

				if (status === "SUBSCRIBED") {
					if (reconnectTimeoutRef.current) {
						clearTimeout(reconnectTimeoutRef.current);
						reconnectTimeoutRef.current = null;
					}
				} else if (status === "CHANNEL_ERROR") {
					console.error(
						"❌ Conversations channel error - Will attempt to reconnect...",
					);
					if (!reconnectTimeoutRef.current) {
						reconnectTimeoutRef.current = window.setTimeout(() => {
							reconnectTimeoutRef.current = null;
							subscribeToChannel();
						}, 3000);
					}
				} else if (status === "TIMED_OUT") {
					console.warn(
						"⚠️ Conversations channel subscription timed out - Will attempt to reconnect...",
					);
					if (!reconnectTimeoutRef.current) {
						reconnectTimeoutRef.current = window.setTimeout(() => {
							reconnectTimeoutRef.current = null;
							subscribeToChannel();
						}, 3000);
					}
				} else if (status === "CLOSED") {
					if (!reconnectTimeoutRef.current) {
						reconnectTimeoutRef.current = window.setTimeout(() => {
							reconnectTimeoutRef.current = null;
							subscribeToChannel();
						}, 3000);
					}
				}
			});

		channelRef.current = channel;
	};

	useEffect(() => {
		if (!user) {
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
