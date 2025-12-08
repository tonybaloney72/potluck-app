import { useMemo } from "react";
import { useAppSelector } from "../store/hooks";
import { selectFriendshipsByUserPair } from "../store/selectors/friendsSelectors";
import type { Friendship } from "../types";

export type FriendshipStatus = "none" | "pending" | "accepted" | "sent";

export interface UseFriendshipStatusResult {
	status: FriendshipStatus;
	friendship: Friendship | null;
	friendshipId: string | null;
}

/**
 * Hook to determine the friendship status between the current user and another user
 *
 * @param otherUserId - The ID of the other user to check friendship status with
 * @returns Object containing:
 *   - status: The relationship status ("none", "pending", "accepted", "sent")
 *   - friendship: The full friendship object (or null if no friendship exists)
 *   - friendshipId: The ID of the friendship (or null) - useful for dispatching actions
 *
 * @example
 * const { status, friendship, friendshipId } = useFriendshipStatus(userId);
 * if (status === "accepted") {
 *   // User is a friend
 * } else if (status === "none") {
 *   // No friendship exists
 * }
 */
export const useFriendshipStatus = (
	otherUserId: string | undefined,
): UseFriendshipStatusResult => {
	const { profile } = useAppSelector(state => state.auth);
	const friendshipsByUserPair = useAppSelector(selectFriendshipsByUserPair);

	return useMemo(() => {
		// If no other user ID provided, return default
		if (!otherUserId) {
			return {
				status: "none",
				friendship: null,
				friendshipId: null,
			};
		}

		// If no current user profile, return default
		if (!profile?.id) {
			return {
				status: "none",
				friendship: null,
				friendshipId: null,
			};
		}

		// If checking friendship with self, return none
		if (profile.id === otherUserId) {
			return {
				status: "none",
				friendship: null,
				friendshipId: null,
			};
		}

		// O(1) lookup using user pair map
		// Key is sorted to handle bidirectional lookups
		const key = [profile.id, otherUserId].sort().join("-");
		const friendship = friendshipsByUserPair[key];

		// No friendship exists
		if (!friendship) {
			return {
				status: "none",
				friendship: null,
				friendshipId: null,
			};
		}

		// Friendship is accepted
		if (friendship.status === "accepted") {
			return {
				status: "accepted",
				friendship,
				friendshipId: friendship.id,
			};
		}

		// Friendship is pending
		// Determine if current user sent the request (sent) or received it (pending)
		if (friendship.status === "pending") {
			const status: FriendshipStatus =
				friendship.user_id === profile.id ? "sent" : "pending";
			return {
				status,
				friendship,
				friendshipId: friendship.id,
			};
		}

		// Blocked status (or any other status) - treat as none for now
		// You might want to handle "blocked" differently in the future
		return {
			status: "none",
			friendship,
			friendshipId: friendship.id,
		};
	}, [profile?.id, otherUserId, friendshipsByUserPair]);
};
