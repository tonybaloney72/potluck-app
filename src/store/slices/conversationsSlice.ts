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

interface ConversationsState {
	conversations: Conversation[];
	loading: boolean;
	creatingConversation: boolean;
	error: string | null;
}

const initialState: ConversationsState = {
	conversations: [],
	loading: false,
	creatingConversation: false,
	error: null,
};

export const fetchConversations = createAsyncThunk(
	"conversations/fetchConversations",
	async (_, { getState, dispatch }) => {
		const {
			data: { user },
		} = await supabase.auth.getUser();
		if (!user) throw new Error("Not authenticated");

		const state = getState() as RootState;
		let friendships = state.friends.friendships;

		// Fetch friendships if not already loaded
		if (friendships.length === 0) {
			const friendshipsResult = await dispatch(fetchFriendships());
			if (fetchFriendships.fulfilled.match(friendshipsResult)) {
				friendships = friendshipsResult.payload;
			}
		}

		const friendIds = new Set<string>();
		friendships.forEach(friendship => {
			if (friendship.status === "accepted") {
				if (friendship.user_id === user.id) {
					friendIds.add(friendship.friend_id);
				} else if (friendship.friend_id === user.id) {
					friendIds.add(friendship.user_id);
				}
			}
		});

		if (friendIds.size === 0) return [];

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
					unread_count: unreadCount,
				};
			}),
		);

		return conversationsWithDetails as Conversation[];
	},
);

export const getOrCreateConversation = createAsyncThunk(
	"conversations/getOrCreateConversation",
	async (otherUserId: string, { getState, dispatch }) => {
		const {
			data: { user },
		} = await supabase.auth.getUser();
		if (!user) throw new Error("Not authenticated");

		const state = getState() as RootState;
		let friendships = state.friends.friendships;
		if (friendships.length === 0) {
			const result = await dispatch(fetchFriendships());
			if (fetchFriendships.fulfilled.match(result)) {
				friendships = result.payload;
			}
		}
		const isFriend = friendships.some(
			f =>
				f.status === "accepted" &&
				((f.user_id === user.id && f.friend_id === otherUserId) ||
					(f.user_id === otherUserId && f.friend_id === user.id)),
		);

		if (!isFriend) {
			throw new Error("You can only message your friends");
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

const conversationsSlice = createSlice({
	name: "conversations",
	initialState,
	reducers: {
		clearError: state => {
			state.error = null;
		},
		updateConversationLastMessage: (
			state,
			action: PayloadAction<{ conversationId: string; message: Message }>,
		) => {
			const { conversationId, message } = action.payload;
			const conversation = state.conversations.find(
				c => c.id === conversationId,
			);
			if (conversation) {
				conversation.last_message = message;
				conversation.last_message_at = message.created_at;
			}
		},
		incrementUnreadCount: (state, action) => {
			const conversation = state.conversations.find(
				c => c.id === action.payload,
			);
			if (conversation) {
				conversation.unread_count = (conversation.unread_count || 0) + 1;
			}
		},
		resetUnreadCount: (state, action) => {
			const conversation = state.conversations.find(
				c => c.id === action.payload,
			);
			if (conversation) {
				conversation.unread_count = 0;
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
				state.conversations = action.payload;
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
				const exists = state.conversations.some(
					c => c.id === action.payload.id,
				);
				if (!exists) {
					state.conversations.push(action.payload);
				}
			})
			.addCase(getOrCreateConversation.rejected, (state, action) => {
				state.creatingConversation = false;
				state.error = action.error.message || "Failed to create conversation";
			});

		builder.addCase(markMessagesAsRead.fulfilled, (state, action) => {
			const conversation = state.conversations.find(
				c => c.id === action.payload,
			);
			if (conversation) {
				conversation.unread_count = 0;
			}
		});
	},
});

export const {
	clearError,
	updateConversationLastMessage,
	incrementUnreadCount,
	resetUnreadCount,
} = conversationsSlice.actions;
export default conversationsSlice.reducer;
