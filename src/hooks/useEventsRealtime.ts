// src/hooks/useEventsRealtime.ts
import { useRealtimeSubscription } from "./useRealtimeSubscription";
import { useAppDispatch, useAppSelector } from "../store/hooks";
import { store } from "../store";
import { fetchUserEvents, removeEvent } from "../store/slices/eventsSlice";

export function useEventsRealtime() {
	const dispatch = useAppDispatch();
	const { user } = useAppSelector(state => state.auth);

	// Subscription 1: Event participants INSERT (when user is invited)
	useRealtimeSubscription({
		channelName: `user_events:${user?.id}`,
		table: "event_participants",
		filter: `user_id=eq.${user?.id}`,
		onInsert: () => {
			// When user is added as a participant, refresh events list
			dispatch(fetchUserEvents());
		},
	});

	// Subscription 2: Notifications for event invitations
	useRealtimeSubscription({
		channelName: `event_notifications:${user?.id}`,
		table: "notifications",
		filter: `user_id=eq.${user?.id} AND type=eq.event_invitation`,
		onInsert: () => {
			// Refresh events when invitation notification is received
			dispatch(fetchUserEvents());
		},
	});

	// Subscription 3: Events DELETE (no filter - we check manually)
	useRealtimeSubscription({
		channelName: `events_delete:${user?.id}`,
		table: "events",
		// No filter - we'll check manually in the callback
		onDelete: (payload: {
			eventType: "DELETE";
			old: { id: string } | null;
		}) => {
			if (payload.eventType === "DELETE" && payload.old) {
				const deletedEventId = payload.old.id;

				// Check if this event exists in our Redux state
				const state = store.getState();
				const eventExists = state.events.events.some(
					e => e.id === deletedEventId,
				);

				if (eventExists) {
					dispatch(removeEvent(deletedEventId));
				}
			}
		},
	});
}
