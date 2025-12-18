import {
	createSlice,
	createAsyncThunk,
	type PayloadAction,
} from "@reduxjs/toolkit";
import { supabase } from "../../services/supabase";
import type {
	Event,
	EventParticipant,
	Contribution,
	EventComment,
	RSVPStatus,
	EventRole,
	PublicRoleRestriction,
} from "../../types";
import { requireAuth } from "../../utils/auth";
import { getEventHostId } from "../../utils/events";
import { getOperationErrorMessage } from "../../utils/errors";
import { calculateDistance } from "../../utils/location";

interface EventsState {
	// ✅ Normalized structure - single source of truth
	eventsById: {
		[eventId: string]: Event;
	};

	// Track which events are being fetched (prevents duplicate fetches)
	fetchingEventIds: string[];

	loading: boolean; // Initial load - shows full loading screen
	refreshingEvents: boolean; // Background refresh - doesn't block UI
	updatingRSVP: RSVPStatus | null; // Track which RSVP status is being updated
	addingComment: boolean;
	addingContribution: boolean;
	addingParticipant: boolean;
	deletingComment: string | null; // ID of comment being deleted
	deletingContribution: string | null; // ID of contribution being deleted
	updatingEvent: boolean;
	error: string | null;
	updatingRole: string | null;
	joiningPublicEvent: boolean;
	approvingContributor: string | null; // Participant ID being approved
	denyingContributor: string | null; // Participant ID being denied
}

const initialState: EventsState = {
	// ✅ Normalized structure - single source of truth
	eventsById: {},
	fetchingEventIds: [],

	loading: false,
	refreshingEvents: false,
	updatingRSVP: null,
	addingComment: false,
	addingContribution: false,
	addingParticipant: false,
	deletingComment: null,
	deletingContribution: null,
	updatingEvent: false,
	error: null,
	updatingRole: null,
	joiningPublicEvent: false,
	approvingContributor: null,
	denyingContributor: null,
};

// Fetch all events for the current user (hosted and invited)
export const fetchUserEvents = createAsyncThunk(
	"events/fetchUserEvents",
	async () => {
		const user = await requireAuth();

		// Get events where user is a participant
		const { data: participants, error: participantsError } = await supabase
			.from("event_participants")
			.select("event_id")
			.eq("user_id", user.id);

		if (participantsError) throw participantsError;

		const eventIds = participants?.map(p => p.event_id) || [];

		if (eventIds.length === 0) return [];

		// Fetch events with creator profile and participants
		const { data: events, error: eventsError } = await supabase
			.from("events")
			.select(
				`
				*,
				creator:profiles!events_created_by_fkey(id, name, avatar_url),
				participants:event_participants(
					id,
					user_id,
					role,
					rsvp_status,
					invited_at,
					joined_at,
					created_at,
					updated_at,
					approval_status,
					user:profiles!event_participants_user_id_fkey(id, name, avatar_url, location)
				)
			`,
			)
			.in("id", eventIds)
			.order("event_datetime", { ascending: true });

		if (eventsError) throw eventsError;

		return events as Event[];
	},
);

// Fetch nearby public events
export const fetchNearbyPublicEvents = createAsyncThunk(
	"events/fetchNearbyPublicEvents",
	async (params: {
		lat: number;
		lng: number;
		radiusMiles?: number; // Default 25 miles
	}) => {
		await requireAuth(); // User must be logged in

		const radiusMiles = params.radiusMiles || 25;
		const now = new Date().toISOString();

		// Fetch all active public events with locations that are in the future
		const { data: events, error: eventsError } = await supabase
			.from("events")
			.select(
				`
				*,
				creator:profiles!events_created_by_fkey(id, name, avatar_url)
			`,
			)
			.eq("is_public", true)
			.eq("status", "active")
			.not("location", "is", null)
			.gte("event_datetime", now) // Only future events
			.order("event_datetime", { ascending: true });

		if (eventsError) throw eventsError;

		// Filter events by distance on client side
		// Note: For better performance with many events, consider using PostGIS on the server
		const nearbyEvents = (events || [])
			.filter(event => {
				if (!event.location) return false;
				const distance = calculateDistance(
					params.lat,
					params.lng,
					event.location.lat,
					event.location.lng,
				);
				return distance <= radiusMiles;
			})
			.map(event => ({
				...event,
				distance: calculateDistance(
					params.lat,
					params.lng,
					event.location.lat,
					event.location.lng,
				),
			}))
			.sort((a, b) => a.distance - b.distance); // Sort by distance

		return nearbyEvents as (Event & { distance: number })[];
	},
);

// Fetch a single event with all related data
export const fetchEventById = createAsyncThunk(
	"events/fetchEventById",
	async (eventId: string) => {
		await requireAuth();

		// Fetch event with creator
		const { data: event, error: eventError } = await supabase
			.from("events")
			.select(
				`
				*,
				creator:profiles!events_created_by_fkey(id, name, avatar_url)
			`,
			)
			.eq("id", eventId)
			.single();

		if (eventError) throw eventError;

		// Fetch participants with user profiles
		const { data: participants, error: participantsError } = await supabase
			.from("event_participants")
			.select("*")
			.eq("event_id", eventId)
			.order("created_at", { ascending: true });

		if (participantsError) throw participantsError;

		const participantsWithProfiles = await Promise.all(
			(participants || []).map(async participant => {
				const { data: userProfile } = await supabase
					.from("profiles")
					.select("id, name, avatar_url, location")
					.eq("id", participant.user_id)
					.single();

				return {
					...participant,
					user: userProfile || undefined,
				};
			}),
		);

		// Fetch contributions with user profiles
		const { data: contributions, error: contributionsError } = await supabase
			.from("contributions")
			.select(
				`
				*,
				user:profiles!contributions_user_id_fkey(id, name, avatar_url)
			`,
			)
			.eq("event_id", eventId)
			.order("created_at", { ascending: true });

		if (contributionsError) throw contributionsError;

		const contributionsWithProfiles = await Promise.all(
			(contributions || []).map(async contribution => {
				const { data: userProfile } = await supabase
					.from("profiles")
					.select("id, name, avatar_url")
					.eq("id", contribution.user_id)
					.single();

				return {
					...contribution,
					user: userProfile || undefined,
				};
			}),
		);

		// Fetch comments with user profiles
		const { data: comments, error: commentsError } = await supabase
			.from("event_comments")
			.select("*")
			.eq("event_id", eventId)
			.order("created_at", { ascending: true });

		if (commentsError) throw commentsError;

		const commentsWithProfiles = await Promise.all(
			(comments || []).map(async comment => {
				const { data: userProfile } = await supabase
					.from("profiles")
					.select("id, name, avatar_url")
					.eq("id", comment.user_id)
					.single();

				return {
					...comment,
					user: userProfile || undefined,
				};
			}),
		);

		const fullEvent = {
			...event,
			participants: participantsWithProfiles || [],
			contributions: contributionsWithProfiles || [],
			comments: commentsWithProfiles || [],
		} as Event;

		return fullEvent;
	},
);

// Check if event has been updated (lightweight check for timestamp)
export const checkEventUpdated = createAsyncThunk(
	"events/checkEventUpdated",
	async ({
		eventId,
		currentUpdatedAt,
	}: {
		eventId: string;
		currentUpdatedAt: string;
	}) => {
		await requireAuth();

		const { data, error } = await supabase
			.from("events")
			.select("updated_at")
			.eq("id", eventId)
			.single();

		if (error) throw error;

		// Compare timestamps
		if (data?.updated_at) {
			const dbUpdatedAt = new Date(data.updated_at);
			const storedUpdatedAt = new Date(currentUpdatedAt);

			// Return true if database has newer timestamp
			return {
				needsRefresh: dbUpdatedAt > storedUpdatedAt,
				updatedAt: data.updated_at,
			};
		}

		return { needsRefresh: false, updatedAt: currentUpdatedAt };
	},
);

// Create a new event
export const createEvent = createAsyncThunk(
	"events/createEvent",
	async (eventData: {
		title: string;
		description?: string;
		theme?: string;
		event_datetime: string;
		end_datetime?: string;
		location?: {
			lat: number;
			lng: number;
			address: string;
		};
		is_public?: boolean;
		public_role_restriction?: PublicRoleRestriction;
		invitedUserIds?: string[];
		invitedParticipants?: Array<{ userId: string; role: EventRole }>;
	}) => {
		const user = await requireAuth();

		const { data: event, error } = await supabase
			.from("events")
			.insert({
				created_by: user.id,
				title: eventData.title,
				description: eventData.description || null,
				theme: eventData.theme || null,
				event_datetime: eventData.event_datetime,
				end_datetime: eventData.end_datetime || null,
				location: eventData.location || null,
				is_public: eventData.is_public || false,
				public_role_restriction: eventData.public_role_restriction || null,
				status: "active", // Default status for new events
			})
			.select(
				`
				*,
				creator:profiles!events_created_by_fkey(id, name, avatar_url)
			`,
			)
			.single();

		if (error) throw error;

		// Add invited users as participants
		// The database trigger will automatically create notifications for invited users
		if (
			eventData.invitedParticipants &&
			eventData.invitedParticipants.length > 0
		) {
			// Use invitedParticipants if provided (includes roles)
			const participants = eventData.invitedParticipants.map(
				({ userId, role }) => ({
					event_id: event.id,
					user_id: userId,
					role: role || "guest",
					rsvp_status: "pending",
				}),
			);

			const { error: participantsError } = await supabase
				.from("event_participants")
				.insert(participants);

			if (participantsError) {
				console.error("Error adding participants:", participantsError);
				// Don't throw - event was created successfully, just log the error
			}
			// Notifications are created automatically by the database trigger
		} else if (
			eventData.invitedUserIds &&
			eventData.invitedUserIds.length > 0
		) {
			// Fallback to invitedUserIds for backward compatibility (defaults to guest)
			const participants = eventData.invitedUserIds.map(userId => ({
				event_id: event.id,
				user_id: userId,
				role: "guest" as EventRole,
				rsvp_status: "pending",
			}));

			const { error: participantsError } = await supabase
				.from("event_participants")
				.insert(participants);

			if (participantsError) {
				console.error("Error adding participants:", participantsError);
				// Don't throw - event was created successfully, just log the error
			}
			// Notifications are created automatically by the database trigger
		}

		// Fetch the full event with participants to return complete data
		const { data: fullEvent, error: fetchError } = await supabase
			.from("events")
			.select(
				`
				*,
				creator:profiles!events_created_by_fkey(id, name, avatar_url),
				participants:event_participants(
					id,
					user_id,
					role,
					rsvp_status,
					invited_at,
					joined_at,
					created_at,
					updated_at,
					approval_status,
					user:profiles!event_participants_user_id_fkey(id, name, avatar_url)
				)
			`,
			)
			.eq("id", event.id)
			.single();

		if (fetchError) {
			// If fetch fails, return the event without participants (better than nothing)
			// But ensure comments and contributions arrays are initialized
			return {
				...event,
				comments: [],
				contributions: [],
			} as Event;
		}

		// Ensure comments and contributions arrays are initialized (they won't exist for a new event)
		return {
			...fullEvent,
			comments: fullEvent.comments || [],
			contributions: fullEvent.contributions || [],
		} as Event;
	},
);

// Update an event
export const updateEvent = createAsyncThunk(
	"events/updateEvent",
	async ({
		eventId,
		updates,
	}: {
		eventId: string;
		updates: Partial<Event>;
	}) => {
		await requireAuth();

		const { data: event, error } = await supabase
			.from("events")
			.update(updates)
			.eq("id", eventId)
			.select(
				`
				*,
				creator:profiles!events_created_by_fkey(id, name, avatar_url)
			`,
			)
			.single();

		if (error) throw error;
		return event as Event;
	},
);

// Delete an event
export const deleteEvent = createAsyncThunk(
	"events/deleteEvent",
	async (eventId: string) => {
		await requireAuth();

		const { error } = await supabase.from("events").delete().eq("id", eventId);

		if (error) throw error;
		return eventId;
	},
);

// Add a participant to an event
export const addParticipant = createAsyncThunk(
	"events/addParticipant",
	async ({
		eventId,
		userId,
		role = "guest",
	}: {
		eventId: string;
		userId: string;
		role?: "host" | "co-host" | "contributor" | "guest";
	}) => {
		await requireAuth();

		const { data: participant, error } = await supabase
			.from("event_participants")
			.insert({
				event_id: eventId,
				user_id: userId,
				role: role,
				rsvp_status: "pending",
			})
			.select(
				`
				*,
				user:profiles!event_participants_user_id_fkey(id, name, avatar_url)
			`,
			)
			.single();

		if (error) throw error;
		return { eventId, participant: participant as EventParticipant };
	},
);

// Update RSVP status
export const updateRSVP = createAsyncThunk(
	"events/updateRSVP",
	async ({
		eventId,
		rsvpStatus,
	}: {
		eventId: string;
		rsvpStatus: RSVPStatus;
	}) => {
		const user = await requireAuth();

		const updateData: any = {
			rsvp_status: rsvpStatus,
		};

		// If going, set joined_at
		if (rsvpStatus === "going") {
			updateData.joined_at = new Date().toISOString();
		}

		const { data: participant, error } = await supabase
			.from("event_participants")
			.update(updateData)
			.eq("event_id", eventId)
			.eq("user_id", user.id)
			.select(
				`
				*,
				user:profiles!event_participants_user_id_fkey(id, name, avatar_url)
			`,
			)
			.single();

		if (error) throw error;

		const { data: event } = await supabase
			.from("events")
			.select("title, created_by")
			.eq("id", eventId)
			.single();

		// Get user profile for notification message
		const { data: userProfile } = await supabase
			.from("profiles")
			.select("name")
			.eq("id", user.id)
			.single();

		const hostId = await getEventHostId(eventId);

		if (hostId && hostId !== user.id && event && userProfile) {
			const rsvpStatusLabel =
				rsvpStatus === "going" ? "going"
				: rsvpStatus === "maybe" ? "maybe"
				: rsvpStatus === "not going" ? "not going"
				: "pending";

			// Create notification for the host
			await supabase.from("notifications").insert({
				user_id: hostId,
				type: "rsvp",
				title: "RSVP Update",
				message: `${
					userProfile.name || "Someone"
				} is now ${rsvpStatusLabel} to "${event.title || "your event"}"`,
				related_id: eventId,
			});
		}

		return { eventId, participant: participant as EventParticipant };
	},
);

// Remove a participant from an event
export const removeParticipant = createAsyncThunk(
	"events/removeParticipant",
	async ({ eventId, userId }: { eventId: string; userId: string }) => {
		await requireAuth();

		const { error } = await supabase
			.from("event_participants")
			.delete()
			.eq("event_id", eventId)
			.eq("user_id", userId);

		if (error) throw error;
		return { eventId, userId };
	},
);

// Join a public event (for non-invited users)
export const joinPublicEvent = createAsyncThunk(
	"events/joinPublicEvent",
	async ({
		eventId,
		role,
	}: {
		eventId: string;
		role: "guest" | "contributor";
	}) => {
		const user = await requireAuth();

		// Get event to check restrictions
		const { data: event, error: eventError } = await supabase
			.from("events")
			.select("public_role_restriction, title, created_by")
			.eq("id", eventId)
			.single();

		if (eventError) throw eventError;
		if (!event) throw new Error("Event not found");

		// Check if user can join with this role
		if (event.public_role_restriction === "guests_only" && role !== "guest") {
			throw new Error("Only guests can join this event");
		}

		// Determine if approval is needed
		const needsApproval =
			role === "contributor" &&
			event.public_role_restriction === "guests_and_contributors_with_approval";

		const participantData: any = {
			event_id: eventId,
			user_id: user.id,
			role: role,
			rsvp_status: "going", // User is actively joining, so they're going
			invited_at: null, // Manual join, not invited
			approval_status: needsApproval ? "pending" : null,
		};

		// If no approval needed, set joined_at immediately
		if (!needsApproval) {
			participantData.joined_at = new Date().toISOString();
		}

		const { data: participant, error } = await supabase
			.from("event_participants")
			.insert(participantData)
			.select(
				`
				*,
				user:profiles!event_participants_user_id_fkey(id, name, avatar_url)
			`,
			)
			.single();

		if (error) throw error;

		// Notifications are handled by database triggers/functions
		// The notify_host_on_public_join() function creates:
		// - RSVP notification for host when someone joins
		// - Contributor approval request notification if approval is needed

		return { eventId, participant: participant as EventParticipant };
	},
);

// Approve a contributor request
export const approveContributorRequest = createAsyncThunk(
	"events/approveContributorRequest",
	async ({
		eventId,
		participantId,
	}: {
		eventId: string;
		participantId: string;
	}) => {
		await requireAuth();

		const { data: participant, error } = await supabase
			.from("event_participants")
			.update({
				approval_status: "approved",
				joined_at: new Date().toISOString(),
			})
			.eq("id", participantId)
			.eq("event_id", eventId)
			.select(
				`
				*,
				user:profiles!event_participants_user_id_fkey(id, name, avatar_url)
			`,
			)
			.single();

		if (error) throw error;

		return { eventId, participant: participant as EventParticipant };
	},
);

// Deny a contributor request
export const denyContributorRequest = createAsyncThunk(
	"events/denyContributorRequest",
	async ({
		eventId,
		participantId,
	}: {
		eventId: string;
		participantId: string;
	}) => {
		await requireAuth();

		// Delete the participant record (denied requests are removed)
		// Notification is handled by database trigger (notify_user_on_contributor_denial)
		const { error } = await supabase
			.from("event_participants")
			.delete()
			.eq("id", participantId)
			.eq("event_id", eventId);

		if (error) throw error;

		return { eventId, participantId };
	},
);

// Add a contribution
export const addContribution = createAsyncThunk(
	"events/addContribution",
	async ({
		eventId,
		itemName,
		quantity,
		description,
	}: {
		eventId: string;
		itemName: string;
		quantity?: string;
		description?: string;
	}) => {
		const user = await requireAuth();

		const { data: contribution, error } = await supabase
			.from("contributions")
			.insert({
				event_id: eventId,
				user_id: user.id,
				item_name: itemName,
				quantity: quantity || null,
				description: description || null,
			})
			.select(
				`
				*,
				user:profiles!contributions_user_id_fkey(id, name, avatar_url)
			`,
			)
			.single();

		if (error) throw error;
		return { eventId, contribution: contribution as Contribution };
	},
);

// Update a contribution
export const updateContribution = createAsyncThunk(
	"events/updateContribution",
	async ({
		contributionId,
		updates,
	}: {
		contributionId: string;
		updates: Partial<Contribution>;
	}) => {
		await requireAuth();

		const { data: contribution, error } = await supabase
			.from("contributions")
			.update(updates)
			.eq("id", contributionId)
			.select(
				`
				*,
				user:profiles!contributions_user_id_fkey(id, name, avatar_url)
			`,
			)
			.single();

		if (error) throw error;
		return contribution as Contribution;
	},
);

// Delete a contribution
export const deleteContribution = createAsyncThunk(
	"events/deleteContribution",
	async (contributionId: string) => {
		await requireAuth();

		const { error } = await supabase
			.from("contributions")
			.delete()
			.eq("id", contributionId);

		if (error) throw error;
		return contributionId;
	},
);

// Add a comment
export const addComment = createAsyncThunk(
	"events/addComment",
	async ({ eventId, content }: { eventId: string; content: string }) => {
		const user = await requireAuth();

		const { data: comment, error } = await supabase
			.from("event_comments")
			.insert({
				event_id: eventId,
				user_id: user.id,
				content: content,
			})
			.select(
				`
				*,
				user:profiles!event_comments_user_id_fkey(id, name, avatar_url)
			`,
			)
			.single();

		if (error) throw error;
		return { eventId, comment: comment as EventComment };
	},
);

// Delete a comment
export const deleteComment = createAsyncThunk(
	"events/deleteComment",
	async (commentId: string) => {
		await requireAuth();

		const { error } = await supabase
			.from("event_comments")
			.delete()
			.eq("id", commentId);

		if (error) throw error;
		return commentId;
	},
);

// Update participant role
export const updateParticipantRole = createAsyncThunk(
	"events/updateParticipantRole",
	async ({
		eventId,
		userId,
		role,
	}: {
		eventId: string;
		userId: string;
		role: "guest" | "contributor" | "co-host"; // Cannot change to/from "host"
	}) => {
		await requireAuth();

		const { data: participant, error } = await supabase
			.from("event_participants")
			.update({ role })
			.eq("event_id", eventId)
			.eq("user_id", userId)
			.select(
				`
				*,
				user:profiles!event_participants_user_id_fkey(id, name, avatar_url)
			`,
			)
			.single();

		if (error) throw error;
		return { eventId, participant: participant as EventParticipant };
	},
);

const eventsSlice = createSlice({
	name: "events",
	initialState,
	reducers: {
		resetState: () => initialState,
		removeEvent: (state, action: PayloadAction<string>) => {
			const eventId = action.payload;

			// ✅ Remove from normalized store only
			delete state.eventsById[eventId];
		},
		clearError: state => {
			state.error = null;
		},
		updateParticipantRSVP: (
			state,
			action: PayloadAction<{
				eventId: string;
				participant: EventParticipant;
			}>,
		) => {
			const { eventId, participant } = action.payload;

			// ✅ Update in eventsById only
			if (state.eventsById[eventId]?.participants) {
				const index = state.eventsById[eventId].participants!.findIndex(
					p => p.user_id === participant.user_id,
				);
				if (index !== -1) {
					// Preserve existing fields that might not be in the update (like approval_status)
					const existingParticipant =
						state.eventsById[eventId].participants![index];
					state.eventsById[eventId].participants![index] = {
						...existingParticipant,
						...participant,
						// Explicitly preserve approval_status if it's not in the update
						approval_status:
							participant.approval_status ??
							existingParticipant.approval_status,
					};
				}
			}
		},

		updateEventRealtime: (
			state,
			action: PayloadAction<{
				eventId: string;
				updatedFields: {
					title?: string;
					theme?: string | null;
					description?: string | null;
					event_datetime?: string;
					location?: {
						lat: number;
						lng: number;
						address: string;
					} | null;
					updated_at?: string;
				};
			}>,
		) => {
			const { eventId, updatedFields } = action.payload;

			// ✅ Update in eventsById (single source of truth)
			if (state.eventsById[eventId]) {
				state.eventsById[eventId] = {
					...state.eventsById[eventId],
					...updatedFields,
					// Preserve nested data
					participants: state.eventsById[eventId].participants || [],
					contributions: state.eventsById[eventId].contributions || [],
					comments: state.eventsById[eventId].comments || [],
				};
			}
		},

		// Real-time: Add comment (from other users)
		addCommentRealtime: (
			state,
			action: PayloadAction<{
				eventId: string;
				comment: EventComment;
			}>,
		) => {
			const { eventId, comment } = action.payload;

			// ✅ Add to eventsById (single source of truth)
			if (state.eventsById[eventId]) {
				if (!state.eventsById[eventId].comments) {
					state.eventsById[eventId].comments = [];
				}
				const exists = state.eventsById[eventId].comments?.some(
					c => c.id === comment.id,
				);
				if (!exists) {
					state.eventsById[eventId].comments!.push(comment);
				}
			}
		},

		// Real-time: Delete comment (from other users)
		deleteCommentRealtime: (state, action: PayloadAction<string>) => {
			// Just commentId, like optimistic
			const commentId = action.payload;

			// ✅ Search eventsById and remove comment (single source of truth)
			for (const eventId in state.eventsById) {
				const event = state.eventsById[eventId];
				if (event.comments?.some(c => c.id === commentId)) {
					event.comments = event.comments.filter(c => c.id !== commentId);
					break; // Found it, no need to continue
				}
			}
		},

		// Real-time: Add contribution (from other users)
		addContributionRealtime: (
			state,
			action: PayloadAction<{
				eventId: string;
				contribution: Contribution;
			}>,
		) => {
			const { eventId, contribution } = action.payload;

			// ✅ Add to eventsById (single source of truth)
			if (state.eventsById[eventId]) {
				if (!state.eventsById[eventId].contributions) {
					state.eventsById[eventId].contributions = [];
				}
				const exists = state.eventsById[eventId].contributions?.some(
					c => c.id === contribution.id,
				);
				if (!exists) {
					state.eventsById[eventId].contributions!.push(contribution);
				}
			}
		},

		// Real-time: Delete contribution (from other users)
		deleteContributionRealtime: (
			state,
			action: PayloadAction<string>, // Just the contributionId string
		) => {
			const contributionId = action.payload;

			// ✅ Search eventsById and remove contribution (single source of truth)
			for (const eventId in state.eventsById) {
				const event = state.eventsById[eventId];
				if (event.contributions?.some(c => c.id === contributionId)) {
					event.contributions = event.contributions.filter(
						c => c.id !== contributionId,
					);
					break; // Found it, no need to continue
				}
			}
		},

		updateParticipantRoleRealtime: (
			state,
			action: PayloadAction<{
				eventId: string;
				participantId: string;
				role: EventRole;
			}>,
		) => {
			const { eventId, participantId, role } = action.payload;

			// ✅ Update in eventsById (single source of truth)
			if (state.eventsById[eventId]?.participants) {
				const participant = state.eventsById[eventId].participants?.find(
					p => p.id === participantId,
				);
				if (participant) {
					participant.role = role;
				}
			}
		},

		// Real-time: Add participant (from other users)
		addParticipantRealtime: (
			state,
			action: PayloadAction<{
				eventId: string;
				participant: EventParticipant;
			}>,
		) => {
			const { eventId, participant } = action.payload;

			// ✅ Add to eventsById (single source of truth)
			if (state.eventsById[eventId]?.participants) {
				const index = state.eventsById[eventId].participants!.findIndex(
					p => p.id === participant.id || p.user_id === participant.user_id,
				);
				if (index !== -1) {
					// Update existing participant - preserve all fields from the real-time update
					state.eventsById[eventId].participants![index] = participant;
				} else {
					// Add new participant
					state.eventsById[eventId].participants!.push(participant);
				}
			}
		},

		// Real-time: Remove participant (from other users)
		removeParticipantRealtime: (state, action: PayloadAction<string>) => {
			// Just participantId (participant record ID), like optimistic and comments
			const participantId = action.payload;

			// ✅ Search eventsById and remove participant (single source of truth)
			for (const eventId in state.eventsById) {
				const event = state.eventsById[eventId];
				if (event.participants?.some(p => p.id === participantId)) {
					event.participants = event.participants.filter(
						p => p.id !== participantId,
					);
					break; // Found it, no need to continue
				}
			}
		},
	},
	extraReducers: builder => {
		// Fetch user events
		builder
			.addCase(fetchUserEvents.pending, state => {
				// Only show full loading if we don't have events yet (initial load)
				const hasEvents = Object.keys(state.eventsById).length > 0;
				if (!hasEvents) {
					state.loading = true;
				} else {
					// Otherwise, just mark as refreshing (background update)
					state.refreshingEvents = true;
				}
				state.error = null;
			})
			.addCase(fetchUserEvents.fulfilled, (state, action) => {
				state.loading = false;
				state.refreshingEvents = false;

				// ✅ Normalize events into eventsById, preserving existing nested data
				action.payload.forEach(event => {
					const existingEvent = state.eventsById[event.id];
					if (existingEvent) {
						// Preserve contributions and comments if they already exist
						// Only use empty array if we explicitly know there are none (array exists)
						// If undefined, it means we haven't fetched that data yet

						// Merge participants intelligently - preserve all fields from both sources
						const mergedParticipants = (() => {
							const newParticipants = event.participants || [];
							const existingParticipants = existingEvent.participants || [];

							// If we have new participants, use them (they're from the latest fetch)
							// But merge with existing ones to preserve any fields that might be missing
							if (newParticipants.length > 0) {
								// Create a map of existing participants by id for quick lookup
								const existingMap = new Map(
									existingParticipants.map(p => [p.id, p]),
								);

								// Merge: use new participant data, but preserve any missing fields from existing
								return newParticipants.map(newParticipant => {
									const existing = existingMap.get(newParticipant.id);
									if (existing) {
										// Merge, with new data taking precedence but preserving all fields
										return {
											...existing,
											...newParticipant,
											// Explicitly preserve approval_status if it exists in either
											approval_status:
												newParticipant.approval_status ??
												existing.approval_status,
										};
									}
									return newParticipant;
								});
							}

							// If no new participants, keep existing ones
							return existingParticipants;
						})();

						state.eventsById[event.id] = {
							...event,
							contributions:
								existingEvent.contributions !== undefined ?
									existingEvent.contributions
								:	event.contributions,
							comments:
								existingEvent.comments !== undefined ?
									existingEvent.comments
								:	event.comments,
							participants: mergedParticipants,
						};
					} else {
						// New event, store as-is
						// Don't set contributions/comments to empty arrays if they weren't fetched
						// Leave them undefined so EventDetailsPage knows to fetch full data
						state.eventsById[event.id] = {
							...event,
							contributions: event.contributions,
							comments: event.comments,
							participants: event.participants || [],
						};
					}
				});
			})
			.addCase(fetchUserEvents.rejected, (state, action) => {
				state.loading = false;
				state.refreshingEvents = false;
				state.error = getOperationErrorMessage("fetchEvents", action.error);
			});

		// Fetch event by ID
		builder
			.addCase(fetchEventById.pending, (state, action) => {
				const eventId = action.meta.arg;
				if (!state.fetchingEventIds.includes(eventId)) {
					state.fetchingEventIds.push(eventId);
				}

				// Only show full loading if we don't have the event yet
				if (!state.eventsById[eventId]) {
					state.loading = true;
				}
				state.error = null;
			})
			.addCase(fetchEventById.fulfilled, (state, action) => {
				const event = action.payload;
				const eventId = action.meta.arg;

				// Remove from fetching set
				state.fetchingEventIds = state.fetchingEventIds.filter(
					id => id !== eventId,
				);

				// ✅ Store/update event in normalized store
				// Ensure contributions and comments are always arrays (never undefined)
				state.eventsById[event.id] = {
					...event,
					contributions: event.contributions ?? [],
					comments: event.comments ?? [],
					participants: event.participants ?? [],
				};
				state.loading = false;
			})
			.addCase(fetchEventById.rejected, (state, action) => {
				const eventId = action.meta.arg;
				state.fetchingEventIds = state.fetchingEventIds.filter(
					id => id !== eventId,
				);
				state.loading = false;
				state.error = getOperationErrorMessage("fetchEvent", action.error);
			});

		// Create event
		builder
			.addCase(createEvent.pending, state => {
				// Only show full loading if we don't have events yet
				const hasEvents = Object.keys(state.eventsById).length > 0;
				if (!hasEvents) {
					state.loading = true;
				} else {
					// Otherwise, just mark as refreshing (background update)
					state.refreshingEvents = true;
				}
				state.error = null;
			})
			.addCase(createEvent.fulfilled, (state, action) => {
				state.loading = false;
				state.refreshingEvents = false;
				// ✅ Add the new event to normalized store
				// Ensure contributions and comments are always arrays (never undefined)
				state.eventsById[action.payload.id] = {
					...action.payload,
					contributions: action.payload.contributions ?? [],
					comments: action.payload.comments ?? [],
					participants: action.payload.participants ?? [],
				};
			})
			.addCase(createEvent.rejected, (state, action) => {
				state.loading = false;
				state.refreshingEvents = false;
				state.error = getOperationErrorMessage("createEvent", action.error);
			});

		// Update event
		builder
			.addCase(updateEvent.pending, state => {
				state.updatingEvent = true;
				state.error = null;
			})
			.addCase(updateEvent.fulfilled, (state, action) => {
				state.updatingEvent = false;
				const updatedEvent = action.payload;

				// ✅ Update in eventsById only (single source of truth)
				if (state.eventsById[updatedEvent.id]) {
					state.eventsById[updatedEvent.id] = {
						...state.eventsById[updatedEvent.id],
						...updatedEvent,
						// Preserve nested data
						participants: state.eventsById[updatedEvent.id].participants || [],
						contributions:
							state.eventsById[updatedEvent.id].contributions || [],
						comments: state.eventsById[updatedEvent.id].comments || [],
					};
				}
			})
			.addCase(updateEvent.rejected, (state, action) => {
				state.updatingEvent = false;
				state.error = getOperationErrorMessage("updateEvent", action.error);
			});

		// Delete event
		builder.addCase(deleteEvent.fulfilled, (state, action) => {
			const eventId = action.payload;
			// ✅ Remove from normalized store only
			delete state.eventsById[eventId];
		});

		// Add participant
		builder
			.addCase(addParticipant.pending, state => {
				state.addingParticipant = true;
				state.error = null;
			})
			.addCase(addParticipant.fulfilled, (state, action) => {
				state.addingParticipant = false;
				const { eventId, participant } = action.payload;

				// ✅ Update in eventsById only
				if (state.eventsById[eventId]?.participants) {
					const index = state.eventsById[eventId].participants!.findIndex(
						p => p.id === participant.id || p.user_id === participant.user_id,
					);
					if (index !== -1) {
						// Update existing participant
						state.eventsById[eventId].participants![index] = participant;
					} else {
						// Add new participant
						state.eventsById[eventId].participants!.push(participant);
					}
				}
			})
			.addCase(addParticipant.rejected, state => {
				state.addingParticipant = false;
			});

		// Join public event
		builder
			.addCase(joinPublicEvent.pending, state => {
				state.joiningPublicEvent = true;
				state.error = null;
			})
			.addCase(joinPublicEvent.fulfilled, (state, action) => {
				state.joiningPublicEvent = false;
				const { eventId, participant } = action.payload;

				// ✅ Update in eventsById only
				if (state.eventsById[eventId]?.participants) {
					const index = state.eventsById[eventId].participants!.findIndex(
						p => p.id === participant.id || p.user_id === participant.user_id,
					);
					if (index !== -1) {
						// Update existing participant - preserve all fields including approval_status
						state.eventsById[eventId].participants![index] = participant;
					} else {
						// Add new participant
						state.eventsById[eventId].participants!.push(participant);
					}
				}
			})
			.addCase(joinPublicEvent.rejected, (state, action) => {
				state.joiningPublicEvent = false;
				state.error = action.error.message || "Failed to join event";
			});

		// Approve contributor request
		builder
			.addCase(approveContributorRequest.pending, (state, action) => {
				state.approvingContributor = action.meta.arg.participantId;
				state.error = null;
			})
			.addCase(approveContributorRequest.fulfilled, (state, action) => {
				state.approvingContributor = null;
				const { eventId, participant } = action.payload;

				// ✅ Update in eventsById only
				if (state.eventsById[eventId]?.participants) {
					const index = state.eventsById[eventId].participants!.findIndex(
						p => p.id === participant.id,
					);
					if (index !== -1) {
						state.eventsById[eventId].participants![index] = participant;
					}
				}
			})
			.addCase(approveContributorRequest.rejected, (state, action) => {
				state.approvingContributor = null;
				state.error = action.error.message || "Failed to approve request";
			});

		// Deny contributor request
		builder
			.addCase(denyContributorRequest.pending, (state, action) => {
				state.denyingContributor = action.meta.arg.participantId;
				state.error = null;
			})
			.addCase(denyContributorRequest.fulfilled, (state, action) => {
				state.denyingContributor = null;
				const { eventId, participantId } = action.payload;

				// ✅ Remove from eventsById
				if (state.eventsById[eventId]?.participants) {
					state.eventsById[eventId].participants = state.eventsById[
						eventId
					].participants!.filter(p => p.id !== participantId);
				}
			})
			.addCase(denyContributorRequest.rejected, (state, action) => {
				state.denyingContributor = null;
				state.error = action.error.message || "Failed to deny request";
			});

		// Update RSVP
		builder
			.addCase(updateRSVP.pending, (state, action) => {
				state.updatingRSVP = action.meta.arg.rsvpStatus;
				state.error = null;
			})
			.addCase(updateRSVP.fulfilled, (state, action) => {
				state.updatingRSVP = null;
				const { eventId, participant } = action.payload;

				// ✅ Update in eventsById only
				if (state.eventsById[eventId]?.participants) {
					const index = state.eventsById[eventId].participants!.findIndex(
						p => p.user_id === participant.user_id,
					);
					if (index !== -1) {
						state.eventsById[eventId].participants![index] = participant;
					}
				}
			})
			.addCase(updateRSVP.rejected, state => {
				state.updatingRSVP = null;
			});

		// Remove participant
		builder.addCase(removeParticipant.fulfilled, (state, action) => {
			const { eventId, userId } = action.payload;

			// ✅ Update in eventsById only
			if (state.eventsById[eventId]?.participants) {
				state.eventsById[eventId].participants = state.eventsById[
					eventId
				].participants!.filter(p => p.user_id !== userId);
			}
		});

		builder
			.addCase(updateParticipantRole.pending, (state, action) => {
				state.updatingRole = action.meta.arg.userId;
			})
			.addCase(updateParticipantRole.fulfilled, (state, action) => {
				state.updatingRole = null;
				const { eventId, participant } = action.payload;

				// ✅ Update in eventsById only
				if (state.eventsById[eventId]?.participants) {
					const index = state.eventsById[eventId].participants!.findIndex(
						p => p.id === participant.id,
					);
					if (index !== -1) {
						state.eventsById[eventId].participants![index] = participant;
					}
				}
			})
			.addCase(updateParticipantRole.rejected, (state, action) => {
				state.updatingRole = null;
				state.error = getOperationErrorMessage(
					"updateParticipantRole",
					action.error,
				);
			});

		// Add contribution
		builder
			.addCase(addContribution.pending, state => {
				state.addingContribution = true;
				state.error = null;
			})
			.addCase(addContribution.fulfilled, (state, action) => {
				state.addingContribution = false;
				const { eventId, contribution } = action.payload;

				// ✅ Update in eventsById only
				if (state.eventsById[eventId]) {
					if (!state.eventsById[eventId].contributions) {
						state.eventsById[eventId].contributions = [];
					}
					state.eventsById[eventId].contributions!.push(contribution);
				}
			})
			.addCase(addContribution.rejected, state => {
				state.addingContribution = false;
			});

		// Update contribution
		builder.addCase(updateContribution.fulfilled, (state, action) => {
			const contribution = action.payload;
			const eventId = contribution.event_id;

			// ✅ Update in eventsById only
			if (state.eventsById[eventId]?.contributions) {
				const index = state.eventsById[eventId].contributions!.findIndex(
					c => c.id === contribution.id,
				);
				if (index !== -1) {
					state.eventsById[eventId].contributions![index] = contribution;
				}
			}
		});

		// Delete contribution
		builder
			.addCase(deleteContribution.pending, (state, action) => {
				state.deletingContribution = action.meta.arg;
				state.error = null;
			})
			.addCase(deleteContribution.fulfilled, (state, action) => {
				state.deletingContribution = null;
				const contributionId = action.payload;

				// ✅ Search eventsById and remove contribution
				for (const eventId in state.eventsById) {
					const event = state.eventsById[eventId];
					if (event.contributions?.some(c => c.id === contributionId)) {
						event.contributions = event.contributions.filter(
							c => c.id !== contributionId,
						);
						break; // Found it, no need to continue
					}
				}
			})
			.addCase(deleteContribution.rejected, state => {
				state.deletingContribution = null;
			});

		// Add comment
		builder
			.addCase(addComment.pending, state => {
				state.addingComment = true;
				state.error = null;
			})
			.addCase(addComment.fulfilled, (state, action) => {
				state.addingComment = false;
				const { eventId, comment } = action.payload;

				// ✅ Update in eventsById only
				if (state.eventsById[eventId]) {
					if (!state.eventsById[eventId].comments) {
						state.eventsById[eventId].comments = [];
					}
					state.eventsById[eventId].comments!.push(comment);
				}
			})
			.addCase(addComment.rejected, state => {
				state.addingComment = false;
			});

		// Delete comment
		builder
			.addCase(deleteComment.pending, (state, action) => {
				state.deletingComment = action.meta.arg;
				state.error = null;
			})
			.addCase(deleteComment.fulfilled, (state, action) => {
				state.deletingComment = null;
				const commentId = action.payload;

				// ✅ Search eventsById and remove comment
				for (const eventId in state.eventsById) {
					const event = state.eventsById[eventId];
					if (event.comments?.some(c => c.id === commentId)) {
						event.comments = event.comments.filter(c => c.id !== commentId);
						break; // Found it, no need to continue
					}
				}
			})
			.addCase(deleteComment.rejected, state => {
				state.deletingComment = null;
			});
	},
});

// Retry actions for error recovery
export const retryFetchEvents = createAsyncThunk(
	"events/retryFetchEvents",
	async (_, { dispatch }) => {
		return dispatch(fetchUserEvents()).unwrap();
	},
);

export const retryFetchEvent = createAsyncThunk(
	"events/retryFetchEvent",
	async (eventId: string, { dispatch }) => {
		return dispatch(fetchEventById(eventId)).unwrap();
	},
);

export const {
	resetState,
	removeEvent,
	clearError,
	updateParticipantRSVP,
	addCommentRealtime,
	deleteCommentRealtime,
	addContributionRealtime,
	deleteContributionRealtime,
	addParticipantRealtime,
	removeParticipantRealtime,
	updateEventRealtime,
	updateParticipantRoleRealtime,
} = eventsSlice.actions;
export default eventsSlice.reducer;
