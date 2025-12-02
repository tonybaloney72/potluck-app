import {
	createSlice,
	createAsyncThunk,
	type PayloadAction,
} from "@reduxjs/toolkit";
import { supabase } from "../../services/supabase";
import type { Profile } from "../../types";
import { requireAuth } from "../../utils/auth";

interface AuthState {
	user: { id: string; email?: string } | null;
	profile: Profile | null;
	loading: boolean;
	initializing: boolean;
	error: string | null;
}

const initialState: AuthState = {
	user: null,
	profile: null,
	loading: false,
	initializing: true,
	error: null,
};

export const fetchUserProfile = createAsyncThunk(
	"auth/fetchProfile",
	async (userId: string) => {
		const { data, error } = await supabase
			.from("profiles")
			.select("*")
			.eq("id", userId)
			.single();

		if (error) throw error;
		return data as Profile;
	},
);

export const signUp = createAsyncThunk(
	"auth/signUp",
	async ({
		email,
		password,
		name,
	}: {
		email: string;
		password: string;
		name?: string;
	}) => {
		const { data, error } = await supabase.auth.signUp({
			email,
			password,
			options: {
				data: {
					name: name || "User",
				},
			},
		});

		if (error) throw error;
		return data.user;
	},
);

export const signIn = createAsyncThunk(
	"auth/signIn",
	async ({ email, password }: { email: string; password: string }) => {
		const { data, error } = await supabase.auth.signInWithPassword({
			email,
			password,
		});

		if (error) throw error;
		return data.user;
	},
);

export const signOut = createAsyncThunk("auth/signOut", async () => {
	const { error } = await supabase.auth.signOut();
	if (error) throw error;
});

export const updateProfile = createAsyncThunk(
	"auth/updateProfile",
	async (updates: Partial<Profile>) => {
		const user = await requireAuth();

		const { data, error } = await supabase
			.from("profiles")
			.update(updates)
			.eq("id", user.id)
			.select()
			.single();

		if (error) throw error;
		return data as Profile;
	},
);

// Helper function to get base URL from environment variable or fallback to window.location.origin
const getBaseUrl = () => {
	// Use environment variable if available, otherwise fall back to window.location.origin
	return (
		import.meta.env.VITE_APP_URL ||
		(typeof window !== "undefined" ? window.location.origin : "")
	);
};

// Helper function to construct the full redirect URL
const getRedirectUrl = () => {
	const baseUrl = getBaseUrl();
	// Ensure baseUrl doesn't have trailing slash, then append the path
	const cleanBaseUrl = baseUrl.replace(/\/+$/, "");
	return `${cleanBaseUrl}/reset-password`;
};

export const resetPassword = createAsyncThunk(
	"auth/resetPassword",
	async (email: string) => {
		const redirectUrl = getRedirectUrl();
		const { error } = await supabase.auth.resetPasswordForEmail(email, {
			redirectTo: redirectUrl,
		});
		if (error) throw error;
		return email;
	},
);

export const updatePassword = createAsyncThunk(
	"auth/updatePassword",
	async (newPassword: string) => {
		const { data, error } = await supabase.auth.updateUser({
			password: newPassword,
		});

		if (error) throw error;
		return data.user;
	},
);

const authSlice = createSlice({
	name: "auth",
	initialState,
	reducers: {
		setUser: (
			state,
			action: PayloadAction<{ id: string; email: string } | null>,
		) => {
			state.user = action.payload;
		},
		setInitializing: (state, action: PayloadAction<boolean>) => {
			state.initializing = action.payload;
		},
		clearError: state => {
			state.error = null;
		},
	},
	extraReducers: builder => {
		builder
			.addCase(signUp.pending, state => {
				state.loading = true;
				state.error = null;
			})
			.addCase(signUp.fulfilled, (state, action) => {
				state.loading = false;
				state.user = action.payload
					? { id: action.payload.id, email: action.payload.email }
					: null;
			})
			.addCase(signUp.rejected, (state, action) => {
				state.loading = false;
				state.error = action.error.message || "Sign up failed";
			});

		builder
			.addCase(signIn.pending, state => {
				state.loading = true;
				state.error = null;
			})
			.addCase(signIn.fulfilled, (state, action) => {
				state.loading = false;
				state.user = action.payload
					? { id: action.payload.id, email: action.payload.email }
					: null;
				// User is authenticated, no longer initializing
				state.initializing = false;
			})
			.addCase(signIn.rejected, (state, action) => {
				state.loading = false;
				state.error = action.error.message || "Sign in failed";
			});

		builder.addCase(signOut.fulfilled, state => {
			state.user = null;
			state.profile = null;
		});

		builder
			.addCase(fetchUserProfile.pending, state => {
				state.loading = true;
			})
			.addCase(fetchUserProfile.fulfilled, (state, action) => {
				state.loading = false;
				state.profile = action.payload;
			})
			.addCase(fetchUserProfile.rejected, (state, action) => {
				state.loading = false;
				state.error = action.error.message || "Failed to fetch profile";
			});

		builder.addCase(updateProfile.fulfilled, (state, action) => {
			state.profile = action.payload;
		});

		builder
			.addCase(resetPassword.pending, state => {
				state.loading = true;
				state.error = null;
			})
			.addCase(resetPassword.fulfilled, state => {
				state.loading = false;
				//Success - email sent
			})
			.addCase(resetPassword.rejected, (state, action) => {
				state.loading = false;
				state.error =
					action.error.message || "Failed to send password reset email";
			});

		builder
			.addCase(updatePassword.pending, state => {
				state.loading = true;
				state.error = null;
			})
			.addCase(updatePassword.fulfilled, state => {
				state.loading = false;
				// Password updated successfully
			})
			.addCase(updatePassword.rejected, (state, action) => {
				state.loading = false;
				state.error = action.error.message || "Failed to update password";
			});
	},
});

export const { setUser, setInitializing, clearError } = authSlice.actions;
export default authSlice.reducer;
