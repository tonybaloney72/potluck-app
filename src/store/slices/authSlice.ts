import {
	createSlice,
	createAsyncThunk,
	type PayloadAction,
} from "@reduxjs/toolkit";
import { supabase } from "../../services/supabase";
import type { Profile } from "../../types";
import { requireAuth, GUEST_EMAIL } from "../../utils/auth";
import {
	compressImage,
	isValidImageFile,
	isValidFileSize,
} from "../../utils/imageCompression";

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
		// Return user and session info
		// If email confirmation is required, session will be null until email is verified
		return {
			user: data.user,
			session: data.session, // Will be null if email confirmation is required
		};
	},
);

export const signIn = createAsyncThunk<
	{ user: any; isActive: boolean } | null,
	{ email: string; password: string }
>("auth/signIn", async ({ email, password }) => {
	const { data, error } = await supabase.auth.signInWithPassword({
		email,
		password,
	});

	if (error) throw error;

	// Check if user's profile is active
	if (data.user) {
		const { data: profile, error: profileError } = await supabase
			.from("profiles")
			.select("active")
			.eq("id", data.user.id)
			.single();

		if (profileError) throw profileError;

		// Return user with active status
		return {
			user: data.user,
			isActive: profile?.active ?? true,
		};
	}

	return { user: null, isActive: true };
});

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

export const deactivateAccount = createAsyncThunk(
	"auth/deactivateAccount",
	async () => {
		const user = await requireAuth();

		const { data, error } = await supabase
			.from("profiles")
			.update({
				active: false,
				deactivated_at: new Date().toISOString(),
			})
			.eq("id", user.id)
			.select()
			.single();

		if (error) throw error;
		return data as Profile;
	},
);

export const reactivateAccount = createAsyncThunk(
	"auth/reactivateAccount",
	async () => {
		const user = await requireAuth();

		const { data, error } = await supabase
			.from("profiles")
			.update({
				active: true,
				deactivated_at: null,
			})
			.eq("id", user.id)
			.select()
			.single();

		if (error) throw error;
		return data as Profile;
	},
);

export const resetGuestData = createAsyncThunk(
	"auth/resetGuestData",
	async () => {
		const {
			data: { user },
		} = await supabase.auth.getUser();

		if (!user || user.email !== GUEST_EMAIL) {
			throw new Error("Only guest users can reset demo data");
		}

		const { error } = await supabase.rpc("reset_guest_data");

		if (error) {
			console.error("Error resetting guest data:", error);
			throw error;
		}
	},
);

/**
 * Helper function to extract file path from Supabase storage URL
 * Extracts the path portion after the bucket name
 */
const extractStoragePath = (url: string, bucketName: string): string | null => {
	try {
		const urlObj = new URL(url);
		const pathParts = urlObj.pathname.split("/");
		const bucketIndex = pathParts.findIndex(part => part === bucketName);

		if (bucketIndex === -1) return null;

		// Get everything after the bucket name
		const pathAfterBucket = pathParts.slice(bucketIndex + 1).join("/");
		return pathAfterBucket || null;
	} catch {
		return null;
	}
};

export const uploadAvatar = createAsyncThunk(
	"auth/uploadAvatar",
	async (file: File) => {
		const user = await requireAuth();

		// Validate file type
		if (!isValidImageFile(file)) {
			throw new Error("File must be an image");
		}

		// Validate file size (allow up to 10MB before compression)
		if (!isValidFileSize(file, 10)) {
			throw new Error("File size must be less than 10MB");
		}

		// Get current profile to check for existing avatar
		const { data: currentProfile } = await supabase
			.from("profiles")
			.select("avatar_url")
			.eq("id", user.id)
			.single();

		// Delete old avatar if it exists
		if (currentProfile?.avatar_url) {
			const oldPath = extractStoragePath(currentProfile.avatar_url, "avatars");
			if (oldPath) {
				// Attempt to delete old avatar (don't fail if it doesn't exist)
				await supabase.storage.from("avatars").remove([oldPath]);
			}
		}

		// Compress the image to fit within 200KB limit
		const compressedBlob = await compressImage(file, {
			maxSizeKB: 200,
			maxWidth: 800,
			maxHeight: 800,
			quality: 0.8,
		});

		// Generate unique filename using user ID and timestamp
		// Always use .jpg extension since we convert to JPEG for compression
		const fileName = `${user.id}-${Date.now()}.jpg`;
		const filePath = `${user.id}/${fileName}`;

		// Upload the compressed file
		const { error: uploadError, data: uploadData } = await supabase.storage
			.from("avatars")
			.upload(filePath, compressedBlob, {
				cacheControl: "3600",
				upsert: false,
				contentType: "image/jpeg", // Always JPEG after compression
			});

		if (uploadError) {
			throw new Error(uploadError.message || "Failed to upload avatar");
		}

		// Get the public URL
		const { data: urlData } = supabase.storage
			.from("avatars")
			.getPublicUrl(uploadData.path);

		// Update profile with new avatar URL
		const { data, error } = await supabase
			.from("profiles")
			.update({ avatar_url: urlData.publicUrl })
			.eq("id", user.id)
			.select()
			.single();

		if (error) throw error;
		return data as Profile;
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
				// Only set user if a session exists (email is confirmed)
				// If email confirmation is required, session will be null until verified
				if (action.payload?.session && action.payload.user) {
					state.user = {
						id: action.payload.user.id,
						email: action.payload.user.email,
					};
				} else {
					// No session = email not confirmed - don't set user, they need to verify first
					state.user = null;
				}
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
				state.user =
					action.payload?.user ?
						{
							id: action.payload.user.id,
							email: action.payload.user.email,
						}
					:	null;
				// User is authenticated, no longer initializing
				state.initializing = false;
				// Store active status in state for login page to check
				if (action.payload?.user && !action.payload.isActive) {
					state.error = "ACCOUNT_DEACTIVATED";
				}
			})
			.addCase(signIn.rejected, (state, action) => {
				state.loading = false;
				state.error = action.error.message || "Sign in failed";
			});

		builder.addCase(signOut.fulfilled, () => {
			// Reset to initial state but ensure initializing is false
			// so login form can be shown immediately after logout
			return {
				...initialState,
				initializing: false,
			};
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
			.addCase(uploadAvatar.pending, state => {
				state.loading = true;
				state.error = null;
			})
			.addCase(uploadAvatar.fulfilled, (state, action) => {
				state.loading = false;
				state.profile = action.payload;
			})
			.addCase(uploadAvatar.rejected, (state, action) => {
				state.loading = false;
				state.error = action.error.message || "Failed to upload avatar";
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

		// Deactivate account
		builder
			.addCase(deactivateAccount.pending, state => {
				state.loading = true;
				state.error = null;
			})
			.addCase(deactivateAccount.fulfilled, (state, action) => {
				state.loading = false;
				state.profile = action.payload;
			})
			.addCase(deactivateAccount.rejected, (state, action) => {
				state.loading = false;
				state.error = action.error.message || "Failed to deactivate account";
			});

		// Reactivate account
		builder
			.addCase(reactivateAccount.pending, state => {
				state.loading = true;
				state.error = null;
			})
			.addCase(reactivateAccount.fulfilled, (state, action) => {
				state.loading = false;
				state.profile = action.payload;
			})
			.addCase(reactivateAccount.rejected, (state, action) => {
				state.loading = false;
				state.error = action.error.message || "Failed to reactivate account";
			});

		// Reset guest data
		builder
			.addCase(resetGuestData.pending, state => {
				state.loading = true;
				state.error = null;
			})
			.addCase(resetGuestData.fulfilled, state => {
				state.loading = false;
			})
			.addCase(resetGuestData.rejected, (state, action) => {
				state.loading = false;
				state.error = action.error.message || "Failed to reset guest data";
			});
	},
});

export const { setUser, setInitializing, clearError } = authSlice.actions;
export default authSlice.reducer;
