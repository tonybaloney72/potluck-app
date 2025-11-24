import { useEffect, useRef } from "react";
import { useRealtimeSubscription } from "./useRealtimeSubscription";
import { useAppDispatch, useAppSelector } from "../store/hooks";
import { store } from "../store";
import {
	updateParticipantRSVP,
	addCommentRealtime,
	deleteCommentRealtime,
	addContributionRealtime,
	deleteContributionRealtime,
	addParticipantRealtime,
	removeParticipantRealtime,
} from "../store/slices/eventsSlice";
import { supabase } from "../services/supabase";
import type { EventParticipant, EventComment, Contribution } from "../types";

export function useEventDetailsRealtime(eventId: string | null) {
	const dispatch = useAppDispatch();
	const { user } = useAppSelector(state => state.auth);
	const eventIdRef = useRef<string | null>(null);

	// Keep ref in sync with prop
	useEffect(() => {
		eventIdRef.current = eventId;
	}, [eventId]);

	// Subscription 1: Listen for RSVP status updates on event_participants
	// Note: Filters may not work reliably for UPDATE events in Supabase,
	// so we filter manually in the callback as well
	useRealtimeSubscription({
		channelName: `event_participants:${eventId}:update`,
		table: "event_participants",
		// Filter can be added here, but we also check in callback for reliability
		onUpdate: async (payload: { eventType: "UPDATE"; new: any; old: any }) => {
			if (
				payload.eventType === "UPDATE" &&
				payload.new &&
				eventIdRef.current === payload.new.event_id
			) {
				const updatedParticipant = payload.new;

				// Ignore updates from current user (they're handled optimistically)
				if (updatedParticipant.user_id === user?.id) {
					return;
				}

				// Fetch user profile for the participant
				const { data: userProfile } = await supabase
					.from("profiles")
					.select("id, name, avatar_url")
					.eq("id", updatedParticipant.user_id)
					.single();

				const participant: EventParticipant = {
					...updatedParticipant,
					user: userProfile || undefined,
				};

				dispatch(
					updateParticipantRSVP({
						eventId: updatedParticipant.event_id,
						participant,
					}),
				);
			}
		},
	});

	// Subscription 2: Listen for new comments
	useRealtimeSubscription({
		channelName: `event_comments:${eventId}:insert`,
		table: "event_comments",
		filter: `event_id=eq.${eventId}`, // Filters work well for INSERT events
		onInsert: async (payload: { eventType: "INSERT"; new: any }) => {
			if (
				payload.eventType === "INSERT" &&
				payload.new &&
				eventIdRef.current === payload.new.event_id
			) {
				const newComment = payload.new;

				// Ignore comments from current user (they're handled optimistically)
				if (newComment.user_id === user?.id) {
					return;
				}

				// Fetch user profile for the comment author
				const { data: userProfile } = await supabase
					.from("profiles")
					.select("id, name, avatar_url")
					.eq("id", newComment.user_id)
					.single();

				const comment: EventComment = {
					...newComment,
					user: userProfile || undefined,
				};

				dispatch(
					addCommentRealtime({
						eventId: newComment.event_id,
						comment,
					}),
				);
			}
		},
	});

	// Subscription 3: Listen for deleted comments
	// Note: No filter - filters don't work reliably for DELETE events, we check manually
	useRealtimeSubscription({
		channelName: `event_comments:${user?.id}:delete`,
		table: "event_comments",
		// No filter - we'll check manually in the callback
		onDelete: (payload: {
			eventType: "DELETE";
			old: { id: string } | null; // Only need id, not event_id
		}) => {
			if (payload.eventType === "DELETE" && payload.old) {
				const deletedCommentId = payload.old.id;

				// Check if this comment exists in currentEvent (only process if viewing that event)
				const state = store.getState();
				const commentExists = state.events.currentEvent?.comments?.some(
					c => c.id === deletedCommentId,
				);

				if (commentExists) {
					dispatch(deleteCommentRealtime(deletedCommentId)); // Just pass the ID
				}
			}
		},
	});

	// Subscription 4: Listen for new contributions
	useRealtimeSubscription({
		channelName: `contributions:${eventId}:insert`,
		table: "contributions",
		filter: `event_id=eq.${eventId}`,
		onInsert: async (payload: { eventType: "INSERT"; new: any }) => {
			if (
				payload.eventType === "INSERT" &&
				payload.new &&
				eventIdRef.current === payload.new.event_id
			) {
				const newContribution = payload.new;

				// Ignore contributions from current user (they're handled optimistically)
				if (newContribution.user_id === user?.id) {
					return;
				}

				// Fetch user profile for the contribution author
				const { data: userProfile } = await supabase
					.from("profiles")
					.select("id, name, avatar_url")
					.eq("id", newContribution.user_id)
					.single();

				const contribution: Contribution = {
					...newContribution,
					user: userProfile || undefined,
				};

				dispatch(
					addContributionRealtime({
						eventId: newContribution.event_id,
						contribution,
					}),
				);
			}
		},
	});

	// Subscription 5: Listen for deleted contributions
	// Note: No filter - filters don't work reliably for DELETE events, we check manually
	useRealtimeSubscription({
		channelName: `contributions:${user?.id}:delete`,
		table: "contributions",
		// No filter - we'll check manually in the callback
		onDelete: (payload: {
			eventType: "DELETE";
			old: { id: string } | null;
		}) => {
			if (payload.eventType === "DELETE" && payload.old) {
				const deletedContributionId = payload.old.id;

				// Check if this contribution exists in the current event being viewed
				const state = store.getState();
				const event = state.events.currentEvent;
				const contributionExists = event?.contributions?.some(
					c => c.id === deletedContributionId,
				);

				if (contributionExists) {
					// Just pass the ID - reducer will find which event contains it
					dispatch(deleteContributionRealtime(deletedContributionId));
				}
			}
		},
	});

	// Subscription 6: Listen for new participants (when someone is invited)
	useRealtimeSubscription({
		channelName: `event_participants:${eventId}:insert`,
		table: "event_participants",
		filter: `event_id=eq.${eventId}`, // Filters work well for INSERT events
		onInsert: async (payload: { eventType: "INSERT"; new: any }) => {
			if (
				payload.eventType === "INSERT" &&
				payload.new &&
				eventIdRef.current === payload.new.event_id
			) {
				const newParticipant = payload.new;

				// Ignore participants added by current user (they're handled optimistically)
				if (newParticipant.user_id === user?.id) {
					return;
				}

				// Fetch user profile for the participant
				const { data: userProfile } = await supabase
					.from("profiles")
					.select("id, name, avatar_url")
					.eq("id", newParticipant.user_id)
					.single();

				const participant: EventParticipant = {
					...newParticipant,
					user: userProfile || undefined,
				};

				dispatch(
					addParticipantRealtime({
						eventId: newParticipant.event_id,
						participant,
					}),
				);
			}
		},
	});

	// Subscription 7: Listen for removed participants
	// Note: No filter - filters don't work reliably for DELETE events, we check manually
	useRealtimeSubscription({
		channelName: `event_participants:${user?.id}:delete`,
		table: "event_participants",
		// No filter - we'll check manually in the callback
		onDelete: (payload: {
			eventType: "DELETE";
			old: { event_id: string; user_id: string } | null;
		}) => {
			if (payload.eventType === "DELETE" && payload.old) {
				const deletedParticipant = payload.old;

				// Check if this participant exists in the current event being viewed
				const state = store.getState();
				const event = state.events.currentEvent;
				const participantExists = event?.participants?.some(
					p =>
						p.user_id === deletedParticipant.user_id &&
						event.id === deletedParticipant.event_id,
				);

				if (participantExists) {
					dispatch(
						removeParticipantRealtime({
							eventId: deletedParticipant.event_id,
							userId: deletedParticipant.user_id,
						}),
					);
				}
			}
		},
	});
}
