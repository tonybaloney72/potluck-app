import { createSlice, createAsyncThunk } from "@reduxjs/toolkit";
import { supabase } from "../../services/supabase";
import type { Message } from "../../types";
import { getOrCreateConversation } from "./conversationsSlice";

interface MessagesState {
	messages: Message[];
	loading: boolean;
	error: string | null;
}

const initialState: MessagesState = {
	messages: [],
	loading: false,
	error: null,
};

export const fetchMessages = createAsyncThunk(
	"messages/fetchMessages",
	async (conversationId: string) => {
		const {
			data: { user },
		} = await supabase.auth.getUser();
		if (!user) throw new Error("Not authenticated");

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
		const {
			data: { user },
		} = await supabase.auth.getUser();
		if (!user) throw new Error("Not authenticated");

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
		const {
			data: { user },
		} = await supabase.auth.getUser();
		if (!user) throw new Error("Not authenticated");

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
		addMessage: (state, action) => {
			state.messages.push(action.payload);
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
				state.loading = true;
			})
			.addCase(sendMessage.fulfilled, (state, action) => {
				state.loading = false;
				state.messages.push(action.payload);
			})
			.addCase(sendMessage.rejected, (state, action) => {
				state.loading = false;
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

export const { clearError, addMessage } = messagesSlice.actions;
export default messagesSlice.reducer;
