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
} from "../../types";
import { requireAuth } from "../../utils/auth";

interface EventsState {
	events: Event[];
	currentEvent: Event | null;
	loading: boolean; // Initial load - shows full loading screen
	refreshingEvents: boolean; // Background refresh - doesn't block UI
	updatingRSVP: RSVPStatus | null; // Track which RSVP status is being updated
	addingComment: boolean;
	addingContribution: boolean;
	deletingComment: string | null; // ID of comment being deleted
	deletingContribution: string | null; // ID of contribution being deleted
	error: string | null;
}

const initialState: EventsState = {
	events: [],
	currentEvent: null,
	loading: false,
	refreshingEvents: false,
	updatingRSVP: null,
	addingComment: false,
	addingContribution: false,
	deletingComment: null,
	deletingContribution: null,
	error: null,
};

// Fetch all events for the current user (hosted and invited)
export const fetchUserEvents = createAsyncThunk(
	"events/fetchUserEvents",
	async () => {
		const user = await requireAuth();
		if (!user) throw new Error("Not authenticated");

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
					user:profiles!event_participants_user_id_fkey(id, name, avatar_url)
				)
			`,
			)
			.in("id", eventIds)
			.order("event_date", { ascending: true })
			.order("event_time", { ascending: true });

		if (eventsError) throw eventsError;

		return events as Event[];
	},
);

// Fetch a single event with all related data
export const fetchEventById = createAsyncThunk(
	"events/fetchEventById",
	async (eventId: string) => {
		const user = await requireAuth();
		if (!user) throw new Error("Not authenticated");

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
					.select("id, name, avatar_url")
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

		return {
			...event,
			participants: participantsWithProfiles || [],
			contributions: contributionsWithProfiles || [],
			comments: commentsWithProfiles || [],
		} as Event;
	},
);

// Create a new event
export const createEvent = createAsyncThunk(
	"events/createEvent",
	async (eventData: {
		title: string;
		description?: string;
		theme?: string;
		event_date: string;
		event_time: string;
		location?: string;
		location_url?: string;
		is_public?: boolean;
		invitedUserIds?: string[];
	}) => {
		const user = await requireAuth();
		if (!user) throw new Error("Not authenticated");

		const { data: event, error } = await supabase
			.from("events")
			.insert({
				created_by: user.id,
				title: eventData.title,
				description: eventData.description || null,
				theme: eventData.theme || null,
				event_date: eventData.event_date,
				event_time: eventData.event_time,
				location: eventData.location || null,
				location_url: eventData.location_url || null,
				is_public: eventData.is_public || false,
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
		if (eventData.invitedUserIds && eventData.invitedUserIds.length > 0) {
			const participants = eventData.invitedUserIds.map(userId => ({
				event_id: event.id,
				user_id: userId,
				role: "guest", // Default role for invited users
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
					user:profiles!event_participants_user_id_fkey(id, name, avatar_url)
				)
			`,
			)
			.eq("id", event.id)
			.single();

		if (fetchError) {
			// If fetch fails, return the event without participants (better than nothing)
			return event as Event;
		}

		return fullEvent as Event;
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
		const user = await requireAuth();
		if (!user) throw new Error("Not authenticated");

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
		const user = await requireAuth();
		if (!user) throw new Error("Not authenticated");

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
		role?: "host" | "co_host" | "contributor" | "guest";
	}) => {
		const user = await requireAuth();
		if (!user) throw new Error("Not authenticated");

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
		if (!user) throw new Error("Not authenticated");

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
		return { eventId, participant: participant as EventParticipant };
	},
);

// Remove a participant from an event
export const removeParticipant = createAsyncThunk(
	"events/removeParticipant",
	async ({ eventId, userId }: { eventId: string; userId: string }) => {
		const user = await requireAuth();
		if (!user) throw new Error("Not authenticated");

		const { error } = await supabase
			.from("event_participants")
			.delete()
			.eq("event_id", eventId)
			.eq("user_id", userId);

		if (error) throw error;
		return { eventId, userId };
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
		if (!user) throw new Error("Not authenticated");

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
		const user = await requireAuth();
		if (!user) throw new Error("Not authenticated");

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
		const user = await requireAuth();
		if (!user) throw new Error("Not authenticated");

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
		if (!user) throw new Error("Not authenticated");

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
		const user = await requireAuth();
		if (!user) throw new Error("Not authenticated");

		const { error } = await supabase
			.from("event_comments")
			.delete()
			.eq("id", commentId);

		if (error) throw error;
		return commentId;
	},
);

const eventsSlice = createSlice({
	name: "events",
	initialState,
	reducers: {
		setCurrentEvent: (state, action: PayloadAction<Event | null>) => {
			state.currentEvent = action.payload;
		},
		removeEvent: (state, action: PayloadAction<string>) => {
			// Remove event from events array
			state.events = state.events.filter(e => e.id !== action.payload);
			// Clear currentEvent if it's the deleted event
			if (state.currentEvent?.id === action.payload) {
				state.currentEvent = null;
			}
		},
		clearError: state => {
			state.error = null;
		},
	},
	extraReducers: builder => {
		// Fetch user events
		builder
			.addCase(fetchUserEvents.pending, state => {
				// Only show full loading if we don't have events yet (initial load)
				if (state.events.length === 0) {
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
				state.events = action.payload;
			})
			.addCase(fetchUserEvents.rejected, (state, action) => {
				state.loading = false;
				state.refreshingEvents = false;
				state.error = action.error.message || "Failed to fetch events";
			});

		// Fetch event by ID
		builder
			.addCase(fetchEventById.pending, state => {
				state.loading = true;
				state.error = null;
			})
			.addCase(fetchEventById.fulfilled, (state, action) => {
				state.loading = false;
				state.currentEvent = action.payload;
				// Also update in events array if it exists
				const index = state.events.findIndex(e => e.id === action.payload.id);
				if (index !== -1) {
					state.events[index] = action.payload;
				}
			})
			.addCase(fetchEventById.rejected, (state, action) => {
				state.loading = false;
				state.error = action.error.message || "Failed to fetch event";
			});

		// Create event
		builder
			.addCase(createEvent.pending, state => {
				// Only show full loading if we don't have events yet
				if (state.events.length === 0) {
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
				// Add the new event to the list
				state.events.push(action.payload);
			})
			.addCase(createEvent.rejected, (state, action) => {
				state.loading = false;
				state.refreshingEvents = false;
				state.error = action.error.message || "Failed to create event";
			});

		// Update event
		builder.addCase(updateEvent.fulfilled, (state, action) => {
			const index = state.events.findIndex(e => e.id === action.payload.id);
			if (index !== -1) {
				state.events[index] = action.payload;
			}
			if (state.currentEvent?.id === action.payload.id) {
				state.currentEvent = action.payload;
			}
		});

		// Delete event
		builder.addCase(deleteEvent.fulfilled, (state, action) => {
			state.events = state.events.filter(e => e.id !== action.payload);
			if (state.currentEvent?.id === action.payload) {
				state.currentEvent = null;
			}
		});

		// Add participant
		builder.addCase(addParticipant.fulfilled, (state, action) => {
			const event = state.events.find(e => e.id === action.payload.eventId);
			if (event && event.participants) {
				event.participants.push(action.payload.participant);
			}
			if (
				state.currentEvent?.id === action.payload.eventId &&
				state.currentEvent.participants
			) {
				state.currentEvent.participants.push(action.payload.participant);
			}
		});

		// Update RSVP
		builder
			.addCase(updateRSVP.pending, (state, action) => {
				state.updatingRSVP = action.meta.arg.rsvpStatus;
				state.error = null;
			})
			.addCase(updateRSVP.fulfilled, (state, action) => {
				state.updatingRSVP = null;
				const event = state.events.find(e => e.id === action.payload.eventId);
				if (event && event.participants) {
					const index = event.participants.findIndex(
						p => p.user_id === action.payload.participant.user_id,
					);
					if (index !== -1) {
						event.participants[index] = action.payload.participant;
					}
				}
				if (
					state.currentEvent?.id === action.payload.eventId &&
					state.currentEvent.participants
				) {
					const index = state.currentEvent.participants.findIndex(
						p => p.user_id === action.payload.participant.user_id,
					);
					if (index !== -1) {
						state.currentEvent.participants[index] = action.payload.participant;
					}
				}
			})
			.addCase(updateRSVP.rejected, state => {
				state.updatingRSVP = null;
			});

		// Remove participant
		builder.addCase(removeParticipant.fulfilled, (state, action) => {
			const event = state.events.find(e => e.id === action.payload.eventId);
			if (event && event.participants) {
				event.participants = event.participants.filter(
					p => p.user_id !== action.payload.userId,
				);
			}
			if (
				state.currentEvent?.id === action.payload.eventId &&
				state.currentEvent.participants
			) {
				state.currentEvent.participants =
					state.currentEvent.participants.filter(
						p => p.user_id !== action.payload.userId,
					);
			}
		});

		// Add contribution
		builder
			.addCase(addContribution.pending, state => {
				state.addingContribution = true;
				state.error = null;
			})
			.addCase(addContribution.fulfilled, (state, action) => {
				state.addingContribution = false;
				const event = state.events.find(e => e.id === action.payload.eventId);
				if (event && event.contributions) {
					event.contributions.push(action.payload.contribution);
				}
				if (
					state.currentEvent?.id === action.payload.eventId &&
					state.currentEvent.contributions
				) {
					state.currentEvent.contributions.push(action.payload.contribution);
				}
			})
			.addCase(addContribution.rejected, state => {
				state.addingContribution = false;
			});

		// Update contribution
		builder.addCase(updateContribution.fulfilled, (state, action) => {
			const event = state.events.find(e => e.id === action.payload.event_id);
			if (event && event.contributions) {
				const index = event.contributions.findIndex(
					c => c.id === action.payload.id,
				);
				if (index !== -1) {
					event.contributions[index] = action.payload;
				}
			}
			if (
				state.currentEvent?.id === action.payload.event_id &&
				state.currentEvent.contributions
			) {
				const index = state.currentEvent.contributions.findIndex(
					c => c.id === action.payload.id,
				);
				if (index !== -1) {
					state.currentEvent.contributions[index] = action.payload;
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
				const event = state.events.find(e =>
					e.contributions?.some(c => c.id === action.payload),
				);
				if (event && event.contributions) {
					event.contributions = event.contributions.filter(
						c => c.id !== action.payload,
					);
				}
				if (state.currentEvent?.contributions) {
					state.currentEvent.contributions =
						state.currentEvent.contributions.filter(
							c => c.id !== action.payload,
						);
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
				const event = state.events.find(e => e.id === action.payload.eventId);
				if (event && event.comments) {
					event.comments.push(action.payload.comment);
				}
				if (
					state.currentEvent?.id === action.payload.eventId &&
					state.currentEvent.comments
				) {
					state.currentEvent.comments.push(action.payload.comment);
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
				const event = state.events.find(e =>
					e.comments?.some(c => c.id === action.payload),
				);
				if (event && event.comments) {
					event.comments = event.comments.filter(c => c.id !== action.payload);
				}
				if (state.currentEvent?.comments) {
					state.currentEvent.comments = state.currentEvent.comments.filter(
						c => c.id !== action.payload,
					);
				}
			})
			.addCase(deleteComment.rejected, state => {
				state.deletingComment = null;
			});
	},
});

export const { setCurrentEvent, removeEvent, clearError } = eventsSlice.actions;
export default eventsSlice.reducer;
