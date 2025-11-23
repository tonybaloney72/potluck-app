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
	messages: Message[];
	loading: boolean;
	sending: boolean;
	error: string | null;
}

const initialState: MessagesState = {
	messages: [],
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
			// Prevent duplicates
			const exists = state.messages.some(m => m.id === action.payload.id);
			if (!exists) {
				state.messages.push(action.payload);
			}
		},
		// Update message from realtime subscription
		updateMessage: (state, action: PayloadAction<Message>) => {
			const index = state.messages.findIndex(m => m.id === action.payload.id);
			if (index !== -1) {
				state.messages[index] = action.payload;
			}
		},
		// Remove message from realtime subscription (if needed)
		removeMessage: (state, action: PayloadAction<string>) => {
			state.messages = state.messages.filter(m => m.id !== action.payload);
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
				state.messages = action.payload.messages;
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
				state.messages.push(action.payload);
			})
			.addCase(sendMessage.rejected, (state, action) => {
				state.sending = false;
				state.error = action.error.message || "Failed to send message";
			});

		// Mark as read
		builder.addCase(markMessagesAsRead.fulfilled, state => {
			state.messages.forEach(msg => {
				if (!msg.read) {
					msg.read = true;
				}
			});
		});
	},
});

export const { clearError, addMessage, updateMessage, removeMessage } =
	messagesSlice.actions;
export default messagesSlice.reducer;
