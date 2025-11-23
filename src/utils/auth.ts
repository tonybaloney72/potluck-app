import { supabase } from "../services/supabase";

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
