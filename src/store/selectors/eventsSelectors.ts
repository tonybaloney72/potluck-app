import { createSelector } from "@reduxjs/toolkit";
import type { RootState } from "../index";
import type { Event } from "../../types";

// Basic selectors - simple functions that return a piece of state
export const selectEventsById = (state: RootState) => state.events.eventsById;
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

// Helper function to check if event is in the past
// An event is considered "past" if:
// 1. Status is 'completed' or 'cancelled', OR
// 2. Has end_datetime and it's in the past, OR
// 3. No end_datetime but event_datetime is in the past
const isPastEvent = (event: Event): boolean => {
	// If status is completed or cancelled, it's always past
	if (event.status === "completed" || event.status === "cancelled") {
		return true;
	}

	const now = new Date();

	// If end_datetime exists, use it; otherwise use event_datetime
	const endDate =
		event.end_datetime ?
			new Date(event.end_datetime)
		:	new Date(event.event_datetime);

	return endDate < now;
};

// ✅ Compute hosted events from eventsById (upcoming only)
export const selectHostedEvents = createSelector(
	[selectEventsById, selectCurrentUserId],
	(eventsById, userId) => {
		if (!userId) return [];

		return Object.values(eventsById)
			.filter(event => {
				return (
					categorizeEvent(event, userId) === "hosted" && !isPastEvent(event)
				);
			})
			.sort(
				(a, b) =>
					new Date(a.event_datetime).getTime() -
					new Date(b.event_datetime).getTime(),
			);
	},
);

// ✅ Compute attending events from eventsById (upcoming only)
export const selectAttendingEvents = createSelector(
	[selectEventsById, selectCurrentUserId],
	(eventsById, userId) => {
		if (!userId) return [];

		return Object.values(eventsById)
			.filter(event => {
				return (
					categorizeEvent(event, userId) === "attending" && !isPastEvent(event)
				);
			})
			.sort(
				(a, b) =>
					new Date(a.event_datetime).getTime() -
					new Date(b.event_datetime).getTime(),
			);
	},
);

// ✅ Compute invited events from eventsById (upcoming only)
export const selectInvitedEvents = createSelector(
	[selectEventsById, selectCurrentUserId],
	(eventsById, userId) => {
		if (!userId) return [];

		return Object.values(eventsById)
			.filter(event => {
				return (
					categorizeEvent(event, userId) === "invited" && !isPastEvent(event)
				);
			})
			.sort(
				(a, b) =>
					new Date(a.event_datetime).getTime() -
					new Date(b.event_datetime).getTime(),
			);
	},
);

// ✅ Compute past hosted events
export const selectPastHostedEvents = createSelector(
	[selectEventsById, selectCurrentUserId],
	(eventsById, userId) => {
		if (!userId) return [];

		return Object.values(eventsById)
			.filter(event => {
				return (
					categorizeEvent(event, userId) === "hosted" && isPastEvent(event)
				);
			})
			.sort(
				(a, b) =>
					new Date(b.event_datetime).getTime() -
					new Date(a.event_datetime).getTime(), // Most recent first
			);
	},
);

// ✅ Compute past attending events
export const selectPastAttendingEvents = createSelector(
	[selectEventsById, selectCurrentUserId],
	(eventsById, userId) => {
		if (!userId) return [];

		return Object.values(eventsById)
			.filter(event => {
				return (
					categorizeEvent(event, userId) === "attending" && isPastEvent(event)
				);
			})
			.sort(
				(a, b) =>
					new Date(b.event_datetime).getTime() -
					new Date(a.event_datetime).getTime(), // Most recent first
			);
	},
);

// ✅ Compute past invited events (events user was invited to but didn't RSVP)
export const selectPastInvitedEvents = createSelector(
	[selectEventsById, selectCurrentUserId],
	(eventsById, userId) => {
		if (!userId) return [];

		return Object.values(eventsById)
			.filter(event => {
				return (
					categorizeEvent(event, userId) === "invited" && isPastEvent(event)
				);
			})
			.sort(
				(a, b) =>
					new Date(b.event_datetime).getTime() -
					new Date(a.event_datetime).getTime(), // Most recent first
			);
	},
);

// ✅ Compute all past events (hosted, attending, or invited)
export const selectPastEvents = createSelector(
	[selectEventsById, selectCurrentUserId],
	(eventsById, userId) => {
		if (!userId) return [];

		return Object.values(eventsById)
			.filter(event => {
				const category = categorizeEvent(event, userId);
				return (
					(category === "hosted" ||
						category === "attending" ||
						category === "invited") &&
					isPastEvent(event)
				);
			})
			.sort(
				(a, b) =>
					new Date(b.event_datetime).getTime() -
					new Date(a.event_datetime).getTime(), // Most recent first
			);
	},
);

// Select event by ID - O(1) lookup
export const selectEventById = createSelector(
	[selectEventsById, (_state: RootState, eventId: string) => eventId],
	(eventsById, eventId) => {
		return eventsById[eventId] || null;
	},
);

// Get all upcoming events (future events only, sorted by date)
export const selectUpcomingEvents = createSelector(
	[selectAllEvents],
	allEvents => {
		const now = new Date();
		return allEvents.filter(event => {
			const eventDate = new Date(event.event_datetime);
			return eventDate > now;
		});
	},
);

// Get upcoming events limited to a specific count (for homepage, etc.)
export const selectUpcomingEventsLimited = createSelector(
	[selectUpcomingEvents, (_state: RootState, limit: number = 3) => limit],
	(upcomingEvents, limit) => {
		return upcomingEvents.slice(0, limit);
	},
);

// Check if event is being fetched (prevents duplicate fetches)
export const selectIsEventFetching = createSelector(
	[
		(state: RootState) => state.events.fetchingEventIds,
		(_state: RootState, eventId: string) => eventId,
	],
	(fetchingEventIds, eventId) => fetchingEventIds.includes(eventId),
);
