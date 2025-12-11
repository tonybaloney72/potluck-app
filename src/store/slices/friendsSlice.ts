import {
	createSlice,
	createAsyncThunk,
	type PayloadAction,
} from "@reduxjs/toolkit";
import { supabase } from "../../services/supabase";
import type { Friendship } from "../../types";
import { requireAuth } from "../../utils/auth";

interface FriendsState {
	// ✅ Normalized structure - single source of truth
	friendshipsById: {
		[friendshipId: string]: Friendship;
	};
	// Array of IDs for iteration (order doesn't matter for friendships)
	friendshipIds: string[];
	loading: boolean;
	sendingRequest: boolean;
	error: string | null;
}

const initialState: FriendsState = {
	friendshipsById: {},
	friendshipIds: [],
	loading: false,
	sendingRequest: false,
	error: null,
};

export const fetchFriendships = createAsyncThunk(
	"friends/fetchFriendships",
	async () => {
		const user = await requireAuth();

		// Simpler query without foreign key hints
		const { data, error } = await supabase
			.from("friendships")
			.select("*")
			.or(`user_id.eq.${user.id},friend_id.eq.${user.id}`)
			.order("created_at", { ascending: false });

		if (error) throw error;

		// Fetch profiles separately for each friendship
		const friendshipsWithProfiles = await Promise.all(
			(data || []).map(async friendship => {
				const otherUserId =
					friendship.user_id === user.id ?
						friendship.friend_id
					:	friendship.user_id;

				const { data: friendProfile } = await supabase
					.from("profiles")
					.select("*")
					.eq("id", otherUserId)
					.single();

				return {
					...friendship,
					user: friendship.user_id === user.id ? null : friendProfile, // Sender's profile
					friend: friendship.user_id === user.id ? friendProfile : null, // Receiver's profile
				};
			}),
		);

		// Filter out friendships where the other user is inactive
		const activeFriendships = friendshipsWithProfiles.filter(friendship => {
			const otherUser =
				friendship.user_id === user.id ? friendship.friend : friendship.user;
			return otherUser?.active !== false;
		});

		// Return normalized structure: { friendshipsById, friendshipIds }
		const friendshipsById: { [id: string]: Friendship } = {};
		const friendshipIds: string[] = [];

		activeFriendships.forEach(friendship => {
			friendshipsById[friendship.id] = friendship;
			friendshipIds.push(friendship.id);
		});

		return { friendshipsById, friendshipIds } as {
			friendshipsById: { [id: string]: Friendship };
			friendshipIds: string[];
		};
	},
);

export const sendFriendRequest = createAsyncThunk(
	"friends/sendFriendRequest",
	async (friendId: string) => {
		const user = await requireAuth();

		// Check if the target user is active
		const { data: friendProfile, error: profileError } = await supabase
			.from("profiles")
			.select("*")
			.eq("id", friendId)
			.single();

		if (profileError) throw profileError;
		if (!friendProfile?.active) {
			throw new Error("Cannot send friend request to inactive user");
		}

		const { data, error } = await supabase
			.from("friendships")
			.insert({
				user_id: user.id,
				friend_id: friendId,
				status: "pending",
			})
			.select()
			.single();

		if (error) throw error;

		return {
			...data,
			friend: friendProfile,
		} as Friendship;
	},
);

export const acceptFriendRequest = createAsyncThunk(
	"friends/acceptFriendRequest",
	async (friendshipId: string) => {
		await requireAuth();

		const { data, error } = await supabase
			.from("friendships")
			.update({ status: "accepted" })
			.eq("id", friendshipId)
			.select()
			.single();

		if (error) throw error;

		// Fetch the requester's profile (user_id) - needed for the Friends list display
		const { data: requesterProfile, error: profileError } = await supabase
			.from("profiles")
			.select("*")
			.eq("id", data.user_id)
			.single();

		if (profileError) throw profileError;

		return {
			...data,
			user: requesterProfile,
		} as Friendship;
	},
);

export const removeFriend = createAsyncThunk(
	"friends/removeFriend",
	async (friendshipId: string) => {
		const { error } = await supabase
			.from("friendships")
			.delete()
			.eq("id", friendshipId);

		if (error) throw error;
		return friendshipId;
	},
);

export const cancelFriendRequest = createAsyncThunk(
	"friends/cancelFriendRequest",
	async (friendshipId: string) => {
		const { error } = await supabase
			.from("friendships")
			.delete()
			.eq("id", friendshipId);

		if (error) throw error;
		return friendshipId;
	},
);

const friendsSlice = createSlice({
	name: "friends",
	initialState,
	reducers: {
		clearError: state => {
			state.error = null;
		},
		// Add friendship from realtime subscription
		addFriendship: (state, action: PayloadAction<Friendship>) => {
			// Prevent duplicates
			if (!state.friendshipsById[action.payload.id]) {
				state.friendshipsById[action.payload.id] = action.payload;
				if (!state.friendshipIds.includes(action.payload.id)) {
					state.friendshipIds.push(action.payload.id);
				}
			}
		},
		// Update friendship from realtime subscription
		updateFriendship: (state, action: PayloadAction<Friendship>) => {
			if (state.friendshipsById[action.payload.id]) {
				state.friendshipsById[action.payload.id] = action.payload;
			}
		},
		// Remove friendship from realtime subscription
		removeFriendship: (state, action: PayloadAction<string>) => {
			if (state.friendshipsById[action.payload]) {
				delete state.friendshipsById[action.payload];
				state.friendshipIds = state.friendshipIds.filter(
					id => id !== action.payload,
				);
			}
		},
	},
	extraReducers: builder => {
		// Fetch friendships
		builder
			.addCase(fetchFriendships.pending, state => {
				state.loading = true;
				state.error = null;
			})
			.addCase(fetchFriendships.fulfilled, (state, action) => {
				state.loading = false;
				// ✅ Store in normalized structure
				state.friendshipsById = action.payload.friendshipsById;
				state.friendshipIds = action.payload.friendshipIds;
			})
			.addCase(fetchFriendships.rejected, (state, action) => {
				state.loading = false;
				state.error = action.error.message || "Failed to fetch friendships";
			});

		// Send friend request
		builder
			.addCase(sendFriendRequest.pending, state => {
				state.sendingRequest = true;
				state.error = null;
			})
			.addCase(sendFriendRequest.fulfilled, (state, action) => {
				state.sendingRequest = false;
				// ✅ Add to normalized structure
				if (!state.friendshipsById[action.payload.id]) {
					state.friendshipsById[action.payload.id] = action.payload;
					if (!state.friendshipIds.includes(action.payload.id)) {
						state.friendshipIds.push(action.payload.id);
					}
				}
			})
			.addCase(sendFriendRequest.rejected, (state, action) => {
				state.sendingRequest = false;
				state.error = action.error.message || "Failed to send friend request";
			});

		// Accept friend request
		builder.addCase(acceptFriendRequest.fulfilled, (state, action) => {
			// ✅ Update in normalized structure
			if (state.friendshipsById[action.payload.id]) {
				state.friendshipsById[action.payload.id] = action.payload;
			}
		});

		// Remove friend
		builder.addCase(removeFriend.fulfilled, (state, action) => {
			// ✅ Remove from normalized structure
			if (state.friendshipsById[action.payload]) {
				delete state.friendshipsById[action.payload];
				state.friendshipIds = state.friendshipIds.filter(
					id => id !== action.payload,
				);
			}
		});

		// Cancel friend request
		builder.addCase(cancelFriendRequest.fulfilled, (state, action) => {
			// ✅ Remove from normalized structure
			if (state.friendshipsById[action.payload]) {
				delete state.friendshipsById[action.payload];
				state.friendshipIds = state.friendshipIds.filter(
					id => id !== action.payload,
				);
			}
		});
	},
});

export const { clearError, addFriendship, updateFriendship, removeFriendship } =
	friendsSlice.actions;
export default friendsSlice.reducer;
