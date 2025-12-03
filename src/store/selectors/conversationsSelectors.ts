import { createSelector } from "@reduxjs/toolkit";
import type { RootState } from "../index";
import type { Conversation } from "../../types";

// Basic selectors - simple functions that return a piece of state
export const selectConversationsById = (state: RootState) =>
	state.conversations.conversationsById;
export const selectConversationIds = (state: RootState) =>
	state.conversations.conversationIds;
export const selectCurrentConversationId = (state: RootState) =>
	state.conversations.currentConversationId;

// Get all conversations as an array (sorted by last_message_at descending)
export const selectAllConversations = createSelector(
	[selectConversationsById, selectConversationIds],
	(conversationsById, conversationIds) => {
		return conversationIds
			.map(id => conversationsById[id])
			.filter((conv): conv is Conversation => conv !== undefined);
	},
);

// Select conversation by ID - O(1) lookup
export const selectConversationById = createSelector(
	[selectConversationsById, (_state: RootState, conversationId: string) => conversationId],
	(conversationsById, conversationId) => {
		return conversationsById[conversationId] || null;
	},
);

// Select current conversation
export const selectCurrentConversation = createSelector(
	[selectConversationsById, selectCurrentConversationId],
	(conversationsById, currentConversationId) => {
		if (!currentConversationId) return null;
		return conversationsById[currentConversationId] || null;
	},
);

