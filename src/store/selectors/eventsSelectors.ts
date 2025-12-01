import { createSelector } from "@reduxjs/toolkit";
import type { RootState } from "../index";
import type { Event } from "../../types";

// Basic selectors - simple functions that return a piece of state
export const selectEventsById = (state: RootState) => state.events.eventsById;
export const selectCurrentEventId = (state: RootState) =>
	state.events.currentEventId;
export const selectCurrentUserId = (state: RootState) => state.auth.user?.id;

// Helper function to categorize an event (used in selectors)
const categorizeEvent = (
	event: Event,
	userId: string | undefined,
): "hosted" | "attending" | "invited" | null => {
	if (!userId) return null;

	const isHost = event.created_by === userId;
	if (isHost) return "hosted";

	const userParticipant = event.participants?.find(p => p.user_id === userId);

	if (!userParticipant) return null;

	if (userParticipant.rsvp_status === "going") {
		return "attending";
	}

	return "invited";
};

// Get all events as an array (sorted by date)
export const selectAllEvents = createSelector(
	[selectEventsById],
	eventsById => {
		return Object.values(eventsById).sort(
			(a, b) =>
				new Date(a.event_datetime).getTime() -
				new Date(b.event_datetime).getTime(),
		);
	},
);

// ✅ Compute hosted events from eventsById (single source of truth)
export const selectHostedEvents = createSelector(
	[selectEventsById, selectCurrentUserId],
	(eventsById, userId) => {
		if (!userId) return [];

		return Object.values(eventsById)
			.filter(event => {
				return categorizeEvent(event, userId) === "hosted";
			})
			.sort(
				(a, b) =>
					new Date(a.event_datetime).getTime() -
					new Date(b.event_datetime).getTime(),
			);
	},
);

// ✅ Compute attending events from eventsById
export const selectAttendingEvents = createSelector(
	[selectEventsById, selectCurrentUserId],
	(eventsById, userId) => {
		if (!userId) return [];

		return Object.values(eventsById)
			.filter(event => {
				return categorizeEvent(event, userId) === "attending";
			})
			.sort(
				(a, b) =>
					new Date(a.event_datetime).getTime() -
					new Date(b.event_datetime).getTime(),
			);
	},
);

// ✅ Compute invited events from eventsById
export const selectInvitedEvents = createSelector(
	[selectEventsById, selectCurrentUserId],
	(eventsById, userId) => {
		if (!userId) return [];

		return Object.values(eventsById)
			.filter(event => {
				return categorizeEvent(event, userId) === "invited";
			})
			.sort(
				(a, b) =>
					new Date(a.event_datetime).getTime() -
					new Date(b.event_datetime).getTime(),
			);
	},
);

// Select current event - O(1) lookup from eventsById
export const selectCurrentEvent = createSelector(
	[selectEventsById, selectCurrentEventId],
	(eventsById, currentEventId) =>
		currentEventId ? eventsById[currentEventId] || null : null,
);

// Select event by ID - O(1) lookup
export const selectEventById = createSelector(
	[selectEventsById, (_state: RootState, eventId: string) => eventId],
	(eventsById, eventId) => eventsById[eventId] || null,
);

// Check if event is being fetched (prevents duplicate fetches)
export const selectIsEventFetching = createSelector(
	[
		(state: RootState) => state.events.fetchingEventIds,
		(_state: RootState, eventId: string) => eventId,
	],
	(fetchingEventIds, eventId) => fetchingEventIds.includes(eventId),
);
