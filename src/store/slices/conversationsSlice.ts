import {
	createSlice,
	createAsyncThunk,
	type PayloadAction,
} from "@reduxjs/toolkit";
import { supabase } from "../../services/supabase";
import type { Conversation, Message } from "../../types";
import type { RootState } from "../index";
import { markMessagesAsRead } from "./messagesSlice";
import { fetchFriendships } from "./friendsSlice";
import { requireAuth } from "../../utils/auth";

interface ConversationsState {
	// ✅ Normalized structure - single source of truth
	conversationsById: {
		[conversationId: string]: Conversation;
	};
	// Maintain sorted order by last_message_at (descending)
	conversationIds: string[];
	currentConversationId: string | null;
	loading: boolean;
	creatingConversation: boolean;
	error: string | null;
}

const initialState: ConversationsState = {
	conversationsById: {},
	conversationIds: [],
	currentConversationId: null,
	loading: false,
	creatingConversation: false,
	error: null,
};

export const fetchConversations = createAsyncThunk(
	"conversations/fetchConversations",
	async (_, { getState, dispatch }) => {
		const user = await requireAuth();

		const state = getState() as RootState;
		let friendshipsById = state.friends.friendshipsById;
		let friendshipIds = state.friends.friendshipIds;

		// Fetch friendships if not already loaded
		if (friendshipIds.length === 0) {
			const friendshipsResult = await dispatch(fetchFriendships());
			if (fetchFriendships.fulfilled.match(friendshipsResult)) {
				friendshipsById = friendshipsResult.payload.friendshipsById;
				friendshipIds = friendshipsResult.payload.friendshipIds;
			}
		}

		const friendIds = new Set<string>();
		friendshipIds.forEach(friendshipId => {
			const friendship = friendshipsById[friendshipId];
			if (friendship && friendship.status === "accepted") {
				if (friendship.user_id === user.id) {
					friendIds.add(friendship.friend_id);
				} else if (friendship.friend_id === user.id) {
					friendIds.add(friendship.user_id);
				}
			}
		});

		if (friendIds.size === 0)
			return { conversationsById: {}, conversationIds: [] };

		const { data, error } = await supabase
			.from("conversations")
			.select(
				`
    *,
    user1:profiles!conversations_user1_id_fkey(*),
    user2:profiles!conversations_user2_id_fkey(*)
  `,
			)
			.or(`user1_id.eq.${user.id},user2_id.eq.${user.id}`)
			.order("last_message_at", { ascending: false, nullsFirst: false });

		if (error) throw error;

		const conversationsWithFriends = (data as Conversation[]).filter(conv => {
			const otherUserId =
				conv.user1_id === user.id ? conv.user2_id : conv.user1_id;
			return friendIds.has(otherUserId);
		});

		const conversationsWithDetails = await Promise.all(
			conversationsWithFriends.map(async conv => {
				const { data: lastMessageData } = await supabase
					.from("messages")
					.select(
						`
        *,
        sender:profiles!messages_sender_id_fkey(*)
      `,
					)
					.eq("conversation_id", conv.id)
					.order("created_at", { ascending: false })
					.limit(1)
					.single();

				const { count: unreadCount } = await supabase
					.from("messages")
					.select("*", { count: "exact", head: true })
					.eq("conversation_id", conv.id)
					.eq("read", false)
					.neq("sender_id", user.id);

				return {
					...conv,
					last_message: lastMessageData as Message,
					unread_count: unreadCount ?? undefined,
				};
			}),
		);

		// Return normalized structure: { conversationsById, conversationIds }
		const conversationsById: { [id: string]: Conversation } = {};
		const conversationIds: string[] = [];

		conversationsWithDetails.forEach(conv => {
			conversationsById[conv.id] = conv;
			conversationIds.push(conv.id);
		});

		// Sort conversationIds by last_message_at descending
		conversationIds.sort((a, b) => {
			const aTime =
				conversationsById[a].last_message_at || conversationsById[a].created_at;
			const bTime =
				conversationsById[b].last_message_at || conversationsById[b].created_at;
			return new Date(bTime).getTime() - new Date(aTime).getTime();
		});

		return { conversationsById, conversationIds } as {
			conversationsById: { [id: string]: Conversation };
			conversationIds: string[];
		};
	},
);

export const getOrCreateConversation = createAsyncThunk(
	"conversations/getOrCreateConversation",
	async (otherUserId: string, { getState, dispatch }) => {
		const user = await requireAuth();

		const state = getState() as RootState;
		let friendshipsById = state.friends.friendshipsById;
		let friendshipIds = state.friends.friendshipIds;
		if (friendshipIds.length === 0) {
			const result = await dispatch(fetchFriendships());
			if (fetchFriendships.fulfilled.match(result)) {
				friendshipsById = result.payload.friendshipsById;
				friendshipIds = result.payload.friendshipIds;
			}
		}
		const isFriend = friendshipIds.some(friendshipId => {
			const friendship = friendshipsById[friendshipId];
			return (
				friendship &&
				friendship.status === "accepted" &&
				((friendship.user_id === user.id &&
					friendship.friend_id === otherUserId) ||
					(friendship.user_id === otherUserId &&
						friendship.friend_id === user.id))
			);
		});

		// If not friends, check if they share an event or have pending requests
		if (!isFriend) {
			// Check 1: Do they share events as participants?
			const { data: userEvents, error: userEventsError } = await supabase
				.from("event_participants")
				.select("event_id")
				.eq("user_id", user.id);

			if (userEventsError) throw userEventsError;

			const userEventIds = userEvents?.map(e => e.event_id) || [];
			let sharesEventAsParticipant = false;

			if (userEventIds.length > 0) {
				// Check if other user is also a participant in any of those events
				const { data: otherUserEvents, error: otherUserEventsError } =
					await supabase
						.from("event_participants")
						.select("event_id")
						.eq("user_id", otherUserId)
						.in("event_id", userEventIds)
						.limit(1);

				if (otherUserEventsError) throw otherUserEventsError;
				sharesEventAsParticipant =
					otherUserEvents && otherUserEvents.length > 0;
			}

			// Check 2: Does current user have pending request to event hosted by other user?
			const { data: otherUserHostedEvents, error: hostedEventsError } =
				await supabase
					.from("event_participants")
					.select("event_id")
					.eq("user_id", otherUserId)
					.in("role", ["host", "co-host"]);

			if (hostedEventsError) throw hostedEventsError;

			const otherUserHostedEventIds =
				otherUserHostedEvents?.map(e => e.event_id) || [];

			let hasPendingRequestToOtherUser = false;
			if (otherUserHostedEventIds.length > 0) {
				const { data: pendingRequestsToOtherUser, error: pendingError } =
					await supabase
						.from("pending_contribution_requests")
						.select("event_id")
						.eq("user_id", user.id)
						.in("event_id", otherUserHostedEventIds)
						.limit(1);

				if (pendingError) throw pendingError;
				hasPendingRequestToOtherUser =
					pendingRequestsToOtherUser && pendingRequestsToOtherUser.length > 0;
			}

			// Check 3: Does other user have pending request to event hosted by current user?
			const { data: currentUserHostedEvents, error: currentHostedEventsError } =
				await supabase
					.from("event_participants")
					.select("event_id")
					.eq("user_id", user.id)
					.in("role", ["host", "co-host"]);

			if (currentHostedEventsError) throw currentHostedEventsError;

			const currentUserHostedEventIds =
				currentUserHostedEvents?.map(e => e.event_id) || [];

			let otherUserHasPendingRequestToMe = false;
			if (currentUserHostedEventIds.length > 0) {
				const { data: pendingRequestsFromOtherUser, error: pendingError2 } =
					await supabase
						.from("pending_contribution_requests")
						.select("event_id")
						.eq("user_id", otherUserId)
						.in("event_id", currentUserHostedEventIds)
						.limit(1);

				if (pendingError2) throw pendingError2;
				otherUserHasPendingRequestToMe =
					pendingRequestsFromOtherUser &&
					pendingRequestsFromOtherUser.length > 0;
			}

			// Allow messaging if any of these conditions are true
			const canMessage =
				sharesEventAsParticipant ||
				hasPendingRequestToOtherUser ||
				otherUserHasPendingRequestToMe;

			if (!canMessage) {
				throw new Error(
					"You can only message your friends or users in your events",
				);
			}
		}

		// Check if the other user is active
		const { data: otherUserProfile, error: profileError } = await supabase
			.from("profiles")
			.select("active")
			.eq("id", otherUserId)
			.single();

		if (profileError) throw profileError;
		if (!otherUserProfile?.active) {
			throw new Error("Cannot create conversation with inactive user");
		}

		const { data, error } = await supabase.rpc("get_or_create_conversation", {
			p_user1_id: user.id < otherUserId ? user.id : otherUserId,
			p_user2_id: user.id < otherUserId ? otherUserId : user.id,
		});

		if (error) throw error;

		const { data: conversation, error: fetchError } = await supabase
			.from("conversations")
			.select(
				`
        *,
        user1:profiles!conversations_user1_id_fkey(*),
        user2:profiles!conversations_user2_id_fkey(*)
      `,
			)
			.eq("id", data)
			.single();

		if (fetchError) throw fetchError;

		return conversation as Conversation;
	},
);

// Helper function to maintain sorted conversationIds
const maintainSortedOrder = (
	conversationsById: { [id: string]: Conversation },
	conversationIds: string[],
): string[] => {
	return [...conversationIds].sort((a, b) => {
		const aTime =
			conversationsById[a]?.last_message_at || conversationsById[a]?.created_at;
		const bTime =
			conversationsById[b]?.last_message_at || conversationsById[b]?.created_at;
		if (!aTime || !bTime) return 0;
		return new Date(bTime).getTime() - new Date(aTime).getTime();
	});
};

const conversationsSlice = createSlice({
	name: "conversations",
	initialState,
	reducers: {
		clearError: state => {
			state.error = null;
		},
		resetState: () => initialState,
		setCurrentConversationId: (state, action: PayloadAction<string | null>) => {
			state.currentConversationId = action.payload;
		},
		updateConversationLastMessage: (
			state,
			action: PayloadAction<{ conversationId: string; message: Message }>,
		) => {
			const { conversationId, message } = action.payload;
			const conversation = state.conversationsById[conversationId];
			if (conversation) {
				conversation.last_message = message;
				conversation.last_message_at = message.created_at;
				// Re-sort conversationIds
				state.conversationIds = maintainSortedOrder(
					state.conversationsById,
					state.conversationIds,
				);
			}
		},
		incrementUnreadCount: (state, action) => {
			const conversation = state.conversationsById[action.payload];
			if (conversation) {
				conversation.unread_count = (conversation.unread_count || 0) + 1;
			}
		},
		resetUnreadCount: (state, action) => {
			const conversation = state.conversationsById[action.payload];
			if (conversation) {
				conversation.unread_count = 0;
			}
		},
		addConversation: (state, action: PayloadAction<Conversation>) => {
			// Prevent duplicates
			if (!state.conversationsById[action.payload.id]) {
				state.conversationsById[action.payload.id] = action.payload;
				// Add to conversationIds if not already present
				if (!state.conversationIds.includes(action.payload.id)) {
					state.conversationIds.push(action.payload.id);
				}
				// Re-sort conversationIds
				state.conversationIds = maintainSortedOrder(
					state.conversationsById,
					state.conversationIds,
				);
			}
		},
		// Update conversation from realtime subscription
		updateConversation: (state, action: PayloadAction<Conversation>) => {
			if (state.conversationsById[action.payload.id]) {
				state.conversationsById[action.payload.id] = action.payload;
				// Add to conversationIds if not already present
				if (!state.conversationIds.includes(action.payload.id)) {
					state.conversationIds.push(action.payload.id);
				}
				// Re-sort conversationIds
				state.conversationIds = maintainSortedOrder(
					state.conversationsById,
					state.conversationIds,
				);
			}
		},
	},
	extraReducers: builder => {
		builder
			.addCase(fetchConversations.pending, state => {
				state.loading = true;
				state.error = null;
			})
			.addCase(fetchConversations.fulfilled, (state, action) => {
				state.loading = false;
				// ✅ Store in normalized structure
				state.conversationsById = action.payload.conversationsById;
				state.conversationIds = action.payload.conversationIds;
			})
			.addCase(fetchConversations.rejected, (state, action) => {
				state.loading = false;
				state.error = action.error.message || "Failed to fetch conversations";
			});

		// Get or create conversation
		builder
			.addCase(getOrCreateConversation.pending, state => {
				state.creatingConversation = true;
				state.error = null;
			})
			.addCase(getOrCreateConversation.fulfilled, (state, action) => {
				state.creatingConversation = false;
				// ✅ Add to normalized structure
				if (!state.conversationsById[action.payload.id]) {
					state.conversationsById[action.payload.id] = action.payload;
					if (!state.conversationIds.includes(action.payload.id)) {
						state.conversationIds.push(action.payload.id);
					}
					// Re-sort conversationIds
					state.conversationIds = maintainSortedOrder(
						state.conversationsById,
						state.conversationIds,
					);
				}
			})
			.addCase(getOrCreateConversation.rejected, (state, action) => {
				state.creatingConversation = false;
				state.error = action.error.message || "Failed to create conversation";
			});

		builder.addCase(markMessagesAsRead.fulfilled, (state, action) => {
			const conversation = state.conversationsById[action.payload];
			if (conversation) {
				conversation.unread_count = 0;
			}
		});
	},
});

export const {
	clearError,
	setCurrentConversationId,
	updateConversationLastMessage,
	incrementUnreadCount,
	resetUnreadCount,
	addConversation,
	updateConversation,
	resetState,
} = conversationsSlice.actions;
export default conversationsSlice.reducer;
