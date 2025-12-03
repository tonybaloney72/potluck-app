import { createSelector } from "@reduxjs/toolkit";
import type { RootState } from "../index";
import type { Friendship } from "../../types";

// Basic selectors - simple functions that return a piece of state
export const selectFriendshipsById = (state: RootState) =>
	state.friends.friendshipsById;
export const selectFriendshipIds = (state: RootState) =>
	state.friends.friendshipIds;

// Get all friendships as an array
export const selectAllFriendships = createSelector(
	[selectFriendshipsById, selectFriendshipIds],
	(friendshipsById, friendshipIds) => {
		return friendshipIds
			.map(id => friendshipsById[id])
			.filter(
				(friendship): friendship is Friendship => friendship !== undefined,
			);
	},
);

// Select friendship by ID - O(1) lookup
export const selectFriendshipById = createSelector(
	[
		selectFriendshipsById,
		(_state: RootState, friendshipId: string) => friendshipId,
	],
	(friendshipsById, friendshipId) => {
		return friendshipsById[friendshipId] || null;
	},
);

// Select accepted friendships
export const selectAcceptedFriendships = createSelector(
	[selectAllFriendships],
	friendships => friendships.filter(f => f.status === "accepted"),
);

// Select pending friendships where current user is the receiver
export const selectPendingReceivedRequests = createSelector(
	[
		selectAllFriendships,
		(_state: RootState, userId: string | undefined) => userId,
	],
	(friendships, userId) => {
		if (!userId) return [];
		return friendships.filter(
			f => f.status === "pending" && f.friend_id === userId,
		);
	},
);

// Select pending friendships where current user is the sender
export const selectPendingSentRequests = createSelector(
	[
		selectAllFriendships,
		(_state: RootState, userId: string | undefined) => userId,
	],
	(friendships, userId) => {
		if (!userId) return [];
		return friendships.filter(
			f => f.status === "pending" && f.user_id === userId,
		);
	},
);

// Create a map for O(1) friendship lookups by user pair
// Key format: "userId1-userId2" (sorted to handle bidirectional lookups)
export const selectFriendshipsByUserPair = createSelector(
	[selectAllFriendships],
	friendships => {
		const map: { [key: string]: Friendship } = {};
		friendships.forEach(f => {
			// Create sorted key to handle bidirectional lookups
			const key = [f.user_id, f.friend_id].sort().join("-");
			// If multiple friendships exist (shouldn't happen), keep the most recent
			if (!map[key] || new Date(f.created_at) > new Date(map[key].created_at)) {
				map[key] = f;
			}
		});
		return map;
	},
);

// Helper function to get friendship between two users (O(1) lookup)
export const selectFriendshipByUserPair = createSelector(
	[
		selectFriendshipsByUserPair,
		(_state: RootState, userId1: string, userId2: string) =>
			[userId1, userId2] as const,
	],
	(friendshipsByUserPair, [userId1, userId2]) => {
		const key = [userId1, userId2].sort().join("-");
		return friendshipsByUserPair[key] || null;
	},
);
