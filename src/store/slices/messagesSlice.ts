import {
	createSlice,
	createAsyncThunk,
	type PayloadAction,
} from "@reduxjs/toolkit";
import { supabase } from "../../services/supabase";
import type { Message } from "../../types";
import { getOrCreateConversation } from "./conversationsSlice";
import { requireAuth } from "../../utils/auth";

interface MessagesState {
	messages: { [conversationId: string]: Message[] };
	loading: boolean;
	sending: boolean;
	error: string | null;
}

const initialState: MessagesState = {
	messages: {},
	loading: false,
	sending: false,
	error: null,
};

export const fetchMessages = createAsyncThunk(
	"messages/fetchMessages",
	async (conversationId: string) => {
		await requireAuth();

		const { data, error } = await supabase
			.from("messages")
			.select(
				`
        *,
        sender:profiles!messages_sender_id_fkey(*)
      `,
			)
			.eq("conversation_id", conversationId)
			.order("created_at", { ascending: true });

		if (error) throw error;
		return { conversationId, messages: data as Message[] };
	},
);

export const sendMessage = createAsyncThunk(
	"messages/sendMessage",
	async (
		{ receiverId, content }: { receiverId: string; content: string },
		{ dispatch },
	) => {
		const user = await requireAuth();

		// Check if the receiver is active
		const { data: receiverProfile, error: profileError } = await supabase
			.from("profiles")
			.select("active")
			.eq("id", receiverId)
			.single();

		if (profileError) throw profileError;
		if (!receiverProfile?.active) {
			throw new Error("Cannot send message to inactive user");
		}

		// Get or create conversation
		const conversationResult = await dispatch(
			getOrCreateConversation(receiverId),
		);
		if (getOrCreateConversation.rejected.match(conversationResult)) {
			throw new Error("Failed to get or create conversation");
		}

		const conversationId = conversationResult.payload.id;

		// Insert message
		const { data, error } = await supabase
			.from("messages")
			.insert({
				conversation_id: conversationId,
				sender_id: user.id,
				content,
			})
			.select(
				`
        *,
        sender:profiles!messages_sender_id_fkey(*)
      `,
			)
			.single();

		if (error) throw error;
		return data as Message;
	},
);

export const markMessagesAsRead = createAsyncThunk(
	"messages/markMessagesAsRead",
	async (conversationId: string) => {
		const user = await requireAuth();

		const { error } = await supabase
			.from("messages")
			.update({ read: true })
			.eq("conversation_id", conversationId)
			.eq("read", false)
			.neq("sender_id", user.id);

		if (error) throw error;
		return conversationId;
	},
);

const messagesSlice = createSlice({
	name: "messages",
	initialState,
	reducers: {
		clearError: state => {
			state.error = null;
		},
		// Add message from realtime subscription
		addMessage: (state, action: PayloadAction<Message>) => {
			const conversationId = action.payload.conversation_id;
			if (!state.messages[conversationId]) {
				state.messages[conversationId] = [];
			}
			// Prevent duplicates
			const exists = state.messages[conversationId].some(
				m => m.id === action.payload.id,
			);
			if (!exists) {
				state.messages[conversationId].push(action.payload);
			}
		},
		// Update message from realtime subscription
		updateMessage: (state, action: PayloadAction<Message>) => {
			const conversationId = action.payload.conversation_id;
			if (!state.messages[conversationId]) return;
			const index = state.messages[conversationId].findIndex(
				m => m.id === action.payload.id,
			);
			if (index !== -1) {
				state.messages[conversationId][index] = action.payload;
			}
		},
		// Remove message from realtime subscription (if needed)
		removeMessage: (
			state,
			action: PayloadAction<{ messageId: string; conversationId: string }>,
		) => {
			const { conversationId, messageId } = action.payload;
			if (!state.messages[conversationId]) return;
			state.messages[conversationId] = state.messages[conversationId].filter(
				m => m.id !== messageId,
			);
		},
		// Clear messages for a conversation (useful when switching)
		clearMessages: (state, action: PayloadAction<string>) => {
			delete state.messages[action.payload];
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
				state.messages[action.payload.conversationId] = action.payload.messages;
			})
			.addCase(fetchMessages.rejected, (state, action) => {
				state.loading = false;
				state.error = action.error.message || "Failed to fetch messages";
			});

		// Send message
		builder
			.addCase(sendMessage.pending, state => {
				state.sending = true;
			})
			.addCase(sendMessage.fulfilled, (state, action) => {
				state.sending = false;
				const conversationId = action.payload.conversation_id;
				if (!state.messages[conversationId]) {
					state.messages[conversationId] = [];
				}
				// Prevent duplicates
				const exists = state.messages[conversationId].some(
					m => m.id === action.payload.id,
				);
				if (!exists) {
					state.messages[conversationId].push(action.payload);
				}
			})
			.addCase(sendMessage.rejected, (state, action) => {
				state.sending = false;
				state.error = action.error.message || "Failed to send message";
			});

		// Mark as read
		builder.addCase(markMessagesAsRead.fulfilled, (state, action) => {
			const conversationId = action.payload;
			if (state.messages[conversationId]) {
				state.messages[conversationId].forEach(msg => {
					if (!msg.read) {
						msg.read = true;
					}
				});
			}
		});
	},
});

export const {
	clearError,
	addMessage,
	updateMessage,
	removeMessage,
	clearMessages,
} = messagesSlice.actions;
export default messagesSlice.reducer;
