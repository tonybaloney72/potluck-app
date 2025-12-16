import { supabase } from "../services/supabase";
import type { Profile } from "../types";

export const GUEST_EMAIL = "guest@potluck-app.com";

export const requireAuth = async () => {
	const {
		data: { user },
	} = await supabase.auth.getUser();
	if (!user) {
		throw new Error("Unauthorized");
	}
	return user;
};

export const requireSession = async () => {
	const {
		data: { session },
	} = await supabase.auth.getSession();
	if (!session) {
		throw new Error("Unauthorized");
	}
	return session;
};

/**
 * Check if a user is a guest account based on their email
 */
export const isGuestUser = (profile: Profile | null | undefined): boolean => {
	return profile?.email === GUEST_EMAIL;
};
