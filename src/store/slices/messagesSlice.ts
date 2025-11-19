import { createSlice, createAsyncThunk } from "@reduxjs/toolkit";
import { supabase } from "../../services/supabase";
import type { Message, Friendship } from "../../types";
import { areFriends } from "../../utils/friendship";
import type { RootState } from "../index";

interface MessagesState {
	messages: Message[];
	conversations: { [userId: string]: Message[] };
	loading: boolean;
	error: string | null;
}

const initialState: MessagesState = {
	messages: [],
	conversations: {},
	loading: false,
	error: null,
};

export const fetchMessages = createAsyncThunk(
	"messages/fetchMessages",
	async (otherUserId: string, { getState }) => {
		const {
			data: { user },
		} = await supabase.auth.getUser();
		if (!user) throw new Error("Not authenticated");

		// Check if users are friends
		const state = getState() as { friends: { friendships: Friendship[] } };
		const friendships = state.friends.friendships;
		if (!areFriends(friendships, user.id, otherUserId)) {
			throw new Error("You can only view messages with your friends");
		}

		const { data, error } = await supabase
			.from("messages")
			.select(
				`
        *,
        sender:profiles!messages_sender_id_fkey(*),
        receiver:profiles!messages_receiver_id_fkey(*)
      `,
			)
			.or(
				`and(sender_id.eq.${user.id},receiver_id.eq.${otherUserId}),and(sender_id.eq.${otherUserId},receiver_id.eq.${user.id})`,
			)
			.order("created_at", { ascending: true });

		if (error) throw error;
		return { userId: otherUserId, messages: data as Message[] };
	},
);

export const sendMessage = createAsyncThunk(
	"messages/sendMessage",
	async (
		{ receiverId, content }: { receiverId: string; content: string },
		{ getState },
	) => {
		const {
			data: { user },
		} = await supabase.auth.getUser();
		if (!user) throw new Error("Not authenticated");

		// Check if users are friends
		const state = getState() as RootState;
		const friendships = state.friends.friendships;
		if (!areFriends(friendships, user.id, receiverId)) {
			throw new Error("You can only message your friends");
		}

		const { data, error } = await supabase
			.from("messages")
			.insert({
				sender_id: user.id,
				receiver_id: receiverId,
				content,
			})
			.select(
				`
        *,
        sender:profiles!messages_sender_id_fkey(*),
        receiver:profiles!messages_receiver_id_fkey(*)
      `,
			)
			.single();

		if (error) throw error;
		return data as Message;
	},
);

export const markMessagesAsRead = createAsyncThunk(
	"messages/markAsRead",
	async (senderId: string) => {
		const {
			data: { user },
		} = await supabase.auth.getUser();
		if (!user) throw new Error("Not authenticated");

		const { error } = await supabase
			.from("messages")
			.update({ read: true })
			.eq("receiver_id", user.id)
			.eq("sender_id", senderId)
			.eq("read", false);

		if (error) throw error;
		return senderId;
	},
);

export const fetchConversations = createAsyncThunk(
	"messages/fetchConversations",
	async (_, { getState }) => {
		const {
			data: { user },
		} = await supabase.auth.getUser();
		if (!user) throw new Error("Not authenticated");

		// Get friendships to filter conversations
		const state = getState() as RootState;
		const friendships = state.friends.friendships;

		// Get all friend IDs (users with accepted friendships)
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

		// If no friends, return empty conversations
		if (friendIds.size === 0) {
			return {};
		}

		// Build query to only fetch messages with friends
		const friendIdsArray = Array.from(friendIds);
		const orConditions = friendIdsArray
			.map(
				friendId =>
					`and(sender_id.eq.${user.id},receiver_id.eq.${friendId}),and(sender_id.eq.${friendId},receiver_id.eq.${user.id})`,
			)
			.join(",");

		const { data, error } = await supabase
			.from("messages")
			.select(
				`
        *,
        sender:profiles!messages_sender_id_fkey(*),
        receiver:profiles!messages_receiver_id_fkey(*)
      `,
			)
			.or(orConditions)
			.order("created_at", { ascending: false });

		if (error) throw error;

		// Group by conversation partner (only friends)
		const conversations: { [userId: string]: Message[] } = {};
		(data as Message[]).forEach(message => {
			const otherUserId =
				message.sender_id === user.id ? message.receiver_id : message.sender_id;
			// Double-check that the other user is a friend
			if (friendIds.has(otherUserId)) {
				if (!conversations[otherUserId]) {
					conversations[otherUserId] = [];
				}
				conversations[otherUserId].push(message);
			}
		});

		return conversations;
	},
);

const messagesSlice = createSlice({
	name: "messages",
	initialState,
	reducers: {
		clearError: state => {
			state.error = null;
		},
		addMessage: (state, action) => {
			const message = action.payload;
			const otherUserId =
				message.sender_id ===
				(state.messages[0]?.sender_id || state.messages[0]?.receiver_id)
					? message.receiver_id
					: message.sender_id;

			if (!state.conversations[otherUserId]) {
				state.conversations[otherUserId] = [];
			}
			state.conversations[otherUserId].push(message);
			state.messages.push(message);
		},
	},
	extraReducers: builder => {
		// Fetch messages
		builder
			.addCase(fetchMessages.pending, state => {
				state.loading = true;
				state.error = null;
			})
			.addCase(fetchMessages.fulfilled, (state, action) => {
				state.loading = false;
				state.conversations[action.payload.userId] = action.payload.messages;
				state.messages = action.payload.messages;
			})
			.addCase(fetchMessages.rejected, (state, action) => {
				state.loading = false;
				state.error = action.error.message || "Failed to fetch messages";
			});

		// Send message
		builder
			.addCase(sendMessage.pending, state => {
				state.loading = true;
			})
			.addCase(sendMessage.fulfilled, (state, action) => {
				state.loading = false;
				const message = action.payload;
				const otherUserId =
					message.sender_id ===
					(state.messages[0]?.sender_id || state.messages[0]?.receiver_id)
						? message.receiver_id
						: message.sender_id;

				if (!state.conversations[otherUserId]) {
					state.conversations[otherUserId] = [];
				}
				state.conversations[otherUserId].push(message);
				state.messages.push(message);
			})
			.addCase(sendMessage.rejected, (state, action) => {
				state.loading = false;
				state.error = action.error.message || "Failed to send message";
			});

		// Mark as read
		builder.addCase(markMessagesAsRead.fulfilled, (state, action) => {
			const senderId = action.payload;
			if (state.conversations[senderId]) {
				state.conversations[senderId].forEach(msg => {
					if (msg.sender_id === senderId) {
						msg.read = true;
					}
				});
			}
		});

		// Fetch conversations
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
	},
});

export const { clearError, addMessage } = messagesSlice.actions;
export default messagesSlice.reducer;
