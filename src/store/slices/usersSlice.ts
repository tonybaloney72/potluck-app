import { createSlice, createAsyncThunk } from "@reduxjs/toolkit";
import { supabase } from "../../services/supabase";
import type { Profile } from "../../types";
import { requireAuth } from "../../utils/auth";

export interface ProfileMetadata {
	userId: string;
	friendCount: number;
	mutualFriends: Profile[];
}

interface UsersState {
	users: Profile[];
	loading: boolean;
	error: string | null;
	searchResults: Profile[];
	searchLoading: boolean;
	// Profile metadata keyed by userId
	profileMetadata: {
		[userId: string]: ProfileMetadata;
	};
	metadataLoading: {
		[userId: string]: boolean;
	};
	// Cached user profiles keyed by userId
	profilesById: {
		[userId: string]: Profile;
	};
	profileLoading: {
		[userId: string]: boolean;
	};
}

const initialState: UsersState = {
	users: [],
	loading: false,
	error: null,
	searchResults: [],
	searchLoading: false,
	profileMetadata: {},
	metadataLoading: {},
	profilesById: {},
	profileLoading: {},
};

export const searchUsers = createAsyncThunk(
	"users/searchUsers",
	async (searchQuery: string) => {
		const user = await requireAuth();

		if (!searchQuery.trim()) {
			return [];
		}

		const { data, error } = await supabase
			.from("profiles")
			.select("*")
			.or(`name.ilike.%${searchQuery}%,email.ilike.%${searchQuery}%`)
			.neq("id", user.id)
			.eq("active", true)
			.limit(10);

		if (error) throw error;
		return data as Profile[];
	},
);

export const fetchUserProfile = createAsyncThunk(
	"users/fetchUserProfile",
	async (userId: string) => {
		const { data, error } = await supabase
			.from("profiles")
			.select("*")
			.eq("id", userId)
			.single();

		if (error) throw error;
		if (!data) throw new Error("Profile not found");
		return { userId, profile: data as Profile };
	},
);

export const fetchUserProfileMetadata = createAsyncThunk(
	"users/fetchUserProfileMetadata",
	async (targetUserId: string) => {
		const currentUser = await requireAuth();

		// Fetch all accepted friendships for target user to get friend count
		const { data: targetFriendships, error: targetError } = await supabase
			.from("friendships")
			.select("user_id, friend_id")
			.or(`user_id.eq.${targetUserId},friend_id.eq.${targetUserId}`)
			.eq("status", "accepted");

		if (targetError) throw targetError;

		// Extract friend IDs
		const targetFriendIds = new Set<string>();
		targetFriendships.forEach(friendship => {
			if (friendship.user_id === targetUserId) {
				targetFriendIds.add(friendship.friend_id);
			} else {
				targetFriendIds.add(friendship.user_id);
			}
		});

		// Verify friends are active
		const { data: activeFriends, error: activeError } = await supabase
			.from("profiles")
			.select("id")
			.in("id", Array.from(targetFriendIds))
			.eq("active", true);

		if (activeError) throw activeError;

		const friendCount = activeFriends?.length || 0;

		// Fetch mutual friends
		// Get current user's accepted friendships
		const { data: currentUserFriendships, error: currentError } = await supabase
			.from("friendships")
			.select("user_id, friend_id")
			.or(`user_id.eq.${currentUser.id},friend_id.eq.${currentUser.id}`)
			.eq("status", "accepted");

		if (currentError) throw currentError;

		// Extract current user's friend IDs
		const currentUserFriendIds = new Set<string>();
		currentUserFriendships.forEach(friendship => {
			if (friendship.user_id === currentUser.id) {
				currentUserFriendIds.add(friendship.friend_id);
			} else {
				currentUserFriendIds.add(friendship.user_id);
			}
		});

		// Find mutual friends (intersection of both friend sets)
		const mutualFriendIds = Array.from(targetFriendIds).filter(id =>
			currentUserFriendIds.has(id),
		);

		// Fetch mutual friend profiles
		let mutualFriends: Profile[] = [];
		if (mutualFriendIds.length > 0) {
			const { data: mutualFriendsData, error: mutualError } = await supabase
				.from("profiles")
				.select("*")
				.in("id", mutualFriendIds)
				.eq("active", true);

			if (mutualError) throw mutualError;
			mutualFriends = (mutualFriendsData || []) as Profile[];
		}

		return {
			userId: targetUserId,
			friendCount,
			mutualFriends,
		} as ProfileMetadata;
	},
);

const usersSlice = createSlice({
	name: "users",
	initialState,
	reducers: {
		clearError: state => {
			state.error = null;
		},
	},
	extraReducers: builder => {
		// Search users
		builder
			.addCase(searchUsers.pending, state => {
				state.searchLoading = true;
				state.error = null;
			})
			.addCase(searchUsers.fulfilled, (state, action) => {
				state.searchLoading = false;
				state.searchResults = action.payload;
			})
			.addCase(searchUsers.rejected, (state, action) => {
				state.searchLoading = false;
				state.error = action.error.message || "Failed to search users";
			});

		// Fetch user profile metadata
		builder
			.addCase(fetchUserProfileMetadata.pending, (state, action) => {
				state.metadataLoading[action.meta.arg] = true;
			})
			.addCase(fetchUserProfileMetadata.fulfilled, (state, action) => {
				state.metadataLoading[action.payload.userId] = false;
				state.profileMetadata[action.payload.userId] = action.payload;
			})
			.addCase(fetchUserProfileMetadata.rejected, (state, action) => {
				state.metadataLoading[action.meta.arg] = false;
				state.error =
					action.error.message || "Failed to fetch profile metadata";
			});

		// Fetch user profile
		builder
			.addCase(fetchUserProfile.pending, (state, action) => {
				state.profileLoading[action.meta.arg] = true;
			})
			.addCase(fetchUserProfile.fulfilled, (state, action) => {
				state.profileLoading[action.payload.userId] = false;
				state.profilesById[action.payload.userId] = action.payload.profile;
			})
			.addCase(fetchUserProfile.rejected, (state, action) => {
				state.profileLoading[action.meta.arg] = false;
				state.error = action.error.message || "Failed to fetch profile";
			});
	},
});

export const { clearError } = usersSlice.actions;
export default usersSlice.reducer;
