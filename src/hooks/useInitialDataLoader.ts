import { useEffect, useState, useRef } from "react";
import { useAppDispatch, useAppSelector } from "../store/hooks";
import { store } from "../store";
import { fetchFriendships } from "../store/slices/friendsSlice";
import { fetchConversations } from "../store/slices/conversationsSlice";
import { fetchMessages } from "../store/slices/messagesSlice";
import { fetchNotifications } from "../store/slices/notificationsSlice";
import { fetchUserEvents } from "../store/slices/eventsSlice";

/**
 * Hook to load all initial data when user logs in or app starts
 * Fetches: friendships, conversations, messages, notifications, and events
 */
export function useInitialDataLoader() {
	const dispatch = useAppDispatch();
	const { user, profile, initializing } = useAppSelector(state => state.auth);
	const [hasLoaded, setHasLoaded] = useState(false);
	const loadingRef = useRef(false);

	useEffect(() => {
		// Only load if:
		// - User is authenticated
		// - Profile is loaded
		// - Auth is no longer initializing
		// - We haven't loaded yet
		// - We're not currently loading
		if (!user || !profile || initializing || hasLoaded || loadingRef.current) {
			return;
		}

		const loadAllData = async () => {
			loadingRef.current = true;

			try {
				// Step 1: Fetch core data in parallel
				// Friendships must load first since conversations depend on them
				await dispatch(fetchFriendships());

				// Step 2: Fetch conversations, notifications, and events in parallel
				await Promise.all([
					dispatch(fetchConversations()),
					dispatch(fetchNotifications()),
					dispatch(fetchUserEvents()),
				]);

				// Step 3: After conversations are loaded, fetch all messages
				const state = store.getState();
				const conversationIds = state.conversations.conversationIds;

				if (conversationIds.length > 0) {
					// Fetch messages for all conversations in parallel
					await Promise.all(
						conversationIds.map(id => dispatch(fetchMessages(id))),
					);
				}

				setHasLoaded(true);
			} catch (error) {
				// Log error but don't block the app
				console.error("Error loading initial data:", error);
			} finally {
				loadingRef.current = false;
			}
		};

		loadAllData();
	}, [user, profile, initializing, hasLoaded, dispatch]);

	// Reset hasLoaded when user logs out
	useEffect(() => {
		if (!user) {
			setHasLoaded(false);
			loadingRef.current = false;
		}
	}, [user]);
}
