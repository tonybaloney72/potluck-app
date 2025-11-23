import { createSlice, createAsyncThunk } from "@reduxjs/toolkit";
import { supabase } from "../../services/supabase";
import type { Profile } from "../../types";
import { requireAuth } from "../../utils/auth";

interface UsersState {
	users: Profile[];
	loading: boolean;
	error: string | null;
	searchResults: Profile[];
	searchLoading: boolean;
}

const initialState: UsersState = {
	users: [],
	loading: false,
	error: null,
	searchResults: [],
	searchLoading: false,
};

export const searchUsers = createAsyncThunk(
	"users/searchUsers",
	async (searchQuery: string) => {
		const user = await requireAuth();
		if (!user) throw new Error("Not authenticated");

		if (!searchQuery.trim()) {
			return [];
		}

		const { data, error } = await supabase
			.from("profiles")
			.select("*")
			.or(`name.ilike.%${searchQuery}%,email.ilike.%${searchQuery}%`)
			.neq("id", user.id)
			.limit(10);

		if (error) throw error;
		return data as Profile[];
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
	},
});

export const { clearError } = usersSlice.actions;
export default usersSlice.reducer;
