import { createSlice, createAsyncThunk } from "@reduxjs/toolkit";
import { supabase } from "../../services/supabase";
import type { Friendship } from "../../types";

interface FriendsState {
	friendships: Friendship[];
	loading: boolean;
	sendingRequest: boolean;
	error: string | null;
}

const initialState: FriendsState = {
	friendships: [],
	loading: false,
	sendingRequest: false,
	error: null,
};

export const fetchFriendships = createAsyncThunk(
	"friends/fetchFriendships",
	async () => {
		const {
			data: { user },
		} = await supabase.auth.getUser();
		if (!user) throw new Error("Not authenticated");

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
				const [userProfile, friendProfile] = await Promise.all([
					supabase
						.from("profiles")
						.select("*")
						.eq("id", friendship.user_id)
						.single(),
					supabase
						.from("profiles")
						.select("*")
						.eq("id", friendship.friend_id)
						.single(),
				]);

				return {
					...friendship,
					user: userProfile.data,
					friend: friendProfile.data,
				};
			}),
		);

		return friendshipsWithProfiles as Friendship[];
	},
);

export const sendFriendRequest = createAsyncThunk(
	"friends/sendFriendRequest",
	async (friendId: string) => {
		const {
			data: { user },
		} = await supabase.auth.getUser();
		if (!user) throw new Error("Not authenticated");

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

		// Fetch the friend's profile (receiver) - we only need this for the Sent Requests UI
		const { data: friendProfile, error: profileError } = await supabase
			.from("profiles")
			.select("*")
			.eq("id", data.friend_id)
			.single();

		if (profileError) throw profileError;

		return {
			...data,
			friend: friendProfile,
		} as Friendship;
	},
);

export const acceptFriendRequest = createAsyncThunk(
	"friends/acceptFriendRequest",
	async (friendshipId: string) => {
		const {
			data: { user },
		} = await supabase.auth.getUser();
		if (!user) throw new Error("Not authenticated");

		const { data, error } = await supabase
			.from("friendships")
			.update({ status: "accepted" })
			.eq("id", friendshipId)
			.select()
			.single();

		if (error) throw error;
		return data as Friendship;
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
				state.friendships = action.payload;
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
				state.friendships.push(action.payload);
			})
			.addCase(sendFriendRequest.rejected, (state, action) => {
				state.sendingRequest = false;
				state.error = action.error.message || "Failed to send friend request";
			});

		// Accept friend request
		builder.addCase(acceptFriendRequest.fulfilled, (state, action) => {
			const index = state.friendships.findIndex(
				f => f.id === action.payload.id,
			);
			if (index !== -1) {
				state.friendships[index] = action.payload;
			}
		});

		// Remove friend
		builder.addCase(removeFriend.fulfilled, (state, action) => {
			state.friendships = state.friendships.filter(
				f => f.id !== action.payload,
			);
		});

		// Cancel friend request
		builder.addCase(cancelFriendRequest.fulfilled, (state, action) => {
			state.friendships = state.friendships.filter(
				f => f.id !== action.payload,
			);
		});
	},
});

export const { clearError } = friendsSlice.actions;
export default friendsSlice.reducer;
