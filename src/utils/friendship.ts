import type { Friendship } from "../types";

/**
 * Checks if two users are friends (have an accepted friendship)
 * @param friendships - Array of all friendships for the current user
 * @param currentUserId - ID of the current user
 * @param otherUserId - ID of the other user to check
 * @returns true if the users are friends (status === 'accepted'), false otherwise
 */
export function areFriends(
	friendships: Friendship[],
	currentUserId: string,
	otherUserId: string,
): boolean {
	return friendships.some(
		friendship =>
			friendship.status === "accepted" &&
			((friendship.user_id === currentUserId &&
				friendship.friend_id === otherUserId) ||
				(friendship.user_id === otherUserId &&
					friendship.friend_id === currentUserId)),
	);
}
