import { useEffect, useRef } from "react";
import { useAppDispatch } from "../store/hooks";
import {
	setUser,
	fetchUserProfile,
	setInitializing,
} from "../store/slices/authSlice";
import { supabase } from "../services/supabase";

export function useAuth() {
	const dispatch = useAppDispatch();
	const hasInitialized = useRef(false);

	useEffect(() => {
		// Only set initializing on first mount
		if (!hasInitialized.current) {
			dispatch(setInitializing(true));
		}

		// Get initial session
		supabase.auth.getSession().then(({ data: { session } }) => {
			if (session?.user) {
				dispatch(
					setUser({ id: session.user.id, email: session.user.email || "" }),
				);
				dispatch(fetchUserProfile(session.user.id));
			} else {
				dispatch(setUser(null));
			}
			// Only set initializing to false after initial session check
			if (!hasInitialized.current) {
				dispatch(setInitializing(false));
				hasInitialized.current = true;
			}
		});

		// Listen for auth changes (but don't set initializing here)
		const {
			data: { subscription },
		} = supabase.auth.onAuthStateChange((_event, session) => {
			if (session?.user) {
				dispatch(
					setUser({ id: session.user.id, email: session.user.email || "" }),
				);
				dispatch(fetchUserProfile(session.user.id));
			} else {
				dispatch(setUser(null));
			}
			// Only set initializing to false if we've already done initial check
			if (hasInitialized.current) {
				// Don't set initializing here - it's already false
			}
		});
		return () => {
			subscription?.unsubscribe();
		};
	}, [dispatch]);
}
