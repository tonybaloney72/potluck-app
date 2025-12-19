import {
	createSlice,
	createAsyncThunk,
	type PayloadAction,
} from "@reduxjs/toolkit";
import { supabase } from "../../services/supabase";
import { requireAuth } from "../../utils/auth";
import type { PendingContributionRequest } from "../../types";
import type { RootState } from "../index";

interface PendingRequestsState {
	pendingRequestsById: {
		[requestId: string]: PendingContributionRequest;
	};
	requestIds: string[];
	hostManagedRequestIds: string[]; // Track which requests are host-managed
	loading: boolean;
	error: string | null;
}

const initialState: PendingRequestsState = {
	pendingRequestsById: {},
	requestIds: [],
	hostManagedRequestIds: [],
	loading: false,
	error: null,
};

// Fetch pending requests for events where user is host/co-host
export const fetchPendingRequests = createAsyncThunk(
	"pendingRequests/fetchPendingRequests",
	async () => {
		await requireAuth();

		// Get events where user is host or co-host
		const { data: hostedEvents, error: eventsError } = await supabase
			.from("event_participants")
			.select("event_id")
			.eq("user_id", (await requireAuth()).id)
			.in("role", ["host", "co-host"]);

		if (eventsError) throw eventsError;

		const eventIds = hostedEvents?.map(e => e.event_id) || [];
		if (eventIds.length === 0) return [];

		// Fetch pending requests for those events
		const { data: requests, error } = await supabase
			.from("pending_contribution_requests")
			.select(
				`
				*,
				user:profiles!pending_contribution_requests_user_id_fkey(id, name, avatar_url),
				event:events!pending_contribution_requests_event_id_fkey(id, title, event_datetime, created_by)
			`,
			)
			.in("event_id", eventIds)
			.order("created_at", { ascending: false });

		if (error) throw error;

		return (requests || []) as PendingContributionRequest[];
	},
);

// Fetch user's own pending requests
export const fetchUserPendingRequests = createAsyncThunk(
	"pendingRequests/fetchUserPendingRequests",
	async () => {
		const user = await requireAuth();

		// Fetch pending requests where user is the requester
		const { data: requests, error } = await supabase
			.from("pending_contribution_requests")
			.select(
				`
				*,
				user:profiles!pending_contribution_requests_user_id_fkey(id, name, avatar_url),
				event:events!pending_contribution_requests_event_id_fkey(id, title, event_datetime, created_by)
			`,
			)
			.eq("user_id", user.id)
			.order("created_at", { ascending: false });

		if (error) throw error;

		return (requests || []) as PendingContributionRequest[];
	},
);

// Approve a pending request
export const approvePendingRequest = createAsyncThunk(
	"pendingRequests/approvePendingRequest",
	async ({ requestId }: { requestId: string }) => {
		const user = await requireAuth();

		// Use RPC function to approve the request (handles all operations with SECURITY DEFINER)
		const { data, error } = await supabase.rpc(
			"approve_pending_contribution_request",
			{
				p_request_id: requestId,
				p_approver_id: user.id,
			},
		);

		if (error) throw error;

		// Check if the function returned an error
		if (data && !data.success) {
			throw new Error(data.error || "Failed to approve request");
		}

		return {
			requestId,
			eventId: data?.event_id,
		};
	},
);

// Deny a pending request
export const denyPendingRequest = createAsyncThunk(
	"pendingRequests/denyPendingRequest",
	async ({ requestId }: { requestId: string }) => {
		const user = await requireAuth();

		// Use RPC function to deny the request (handles all operations with SECURITY DEFINER)
		const { data, error } = await supabase.rpc(
			"deny_pending_contribution_request",
			{
				p_request_id: requestId,
				p_denier_id: user.id,
			},
		);

		if (error) throw error;

		// Check if the function returned an error
		if (data && !data.success) {
			throw new Error(data.error || "Failed to deny request");
		}

		return { requestId };
	},
);

// Rescind (remove) a pending request (user removing their own request)
export const rescindPendingRequest = createAsyncThunk(
	"pendingRequests/rescindPendingRequest",
	async ({ requestId }: { requestId: string }) => {
		const user = await requireAuth();

		// Verify the request belongs to the user
		const { data: request, error: requestError } = await supabase
			.from("pending_contribution_requests")
			.select("user_id")
			.eq("id", requestId)
			.single();

		if (requestError) throw requestError;
		if (!request) throw new Error("Request not found");
		if (request.user_id !== user.id) {
			throw new Error("You can only rescind your own requests");
		}

		// Delete the pending request (RLS allows users to delete their own)
		const { error: deleteError } = await supabase
			.from("pending_contribution_requests")
			.delete()
			.eq("id", requestId);

		if (deleteError) throw deleteError;

		return { requestId };
	},
);

const pendingRequestsSlice = createSlice({
	name: "pendingRequests",
	initialState,
	reducers: {
		clearError: state => {
			state.error = null;
		},
		resetState: () => initialState,
		// Real-time updates
		addPendingRequestRealtime: (
			state,
			action: PayloadAction<PendingContributionRequest>,
		) => {
			const request = action.payload;
			if (!state.pendingRequestsById[request.id]) {
				state.pendingRequestsById[request.id] = request;
				state.requestIds.push(request.id);
				if (!state.hostManagedRequestIds.includes(request.id)) {
					state.hostManagedRequestIds.push(request.id);
				}
			}
		},
		removePendingRequestRealtime: (
			state,
			action: PayloadAction<{ requestId: string }>,
		) => {
			const { requestId } = action.payload;
			if (state.pendingRequestsById[requestId]) {
				delete state.pendingRequestsById[requestId];
				state.requestIds = state.requestIds.filter(id => id !== requestId);
				state.hostManagedRequestIds = state.hostManagedRequestIds.filter(
					id => id !== requestId,
				);
			}
		},
	},
	extraReducers: builder => {
		// Fetch pending requests
		builder
			.addCase(fetchPendingRequests.pending, state => {
				state.loading = true;
				state.error = null;
			})
			.addCase(fetchPendingRequests.fulfilled, (state, action) => {
				state.loading = false;
				const requests = action.payload;
				const newHostManagedIds: string[] = [];

				// Remove old host-managed requests that are no longer in the fetch
				state.hostManagedRequestIds.forEach(requestId => {
					if (!requests.find(r => r.id === requestId)) {
						// This request was removed - delete it from state
						delete state.pendingRequestsById[requestId];
						state.requestIds = state.requestIds.filter(id => id !== requestId);
					}
				});

				// Add/update requests from the fetch
				requests.forEach(request => {
					state.pendingRequestsById[request.id] = request;
					newHostManagedIds.push(request.id);
					if (!state.requestIds.includes(request.id)) {
						state.requestIds.push(request.id);
					}
				});

				// Update the array of host-managed request IDs
				state.hostManagedRequestIds = newHostManagedIds;
			})
			.addCase(fetchPendingRequests.rejected, (state, action) => {
				state.loading = false;
				state.error =
					action.error.message || "Failed to fetch pending requests";
			});

		// Approve pending request
		builder.addCase(approvePendingRequest.fulfilled, (state, action) => {
			const { requestId } = action.payload;
			if (state.pendingRequestsById[requestId]) {
				delete state.pendingRequestsById[requestId];
				state.requestIds = state.requestIds.filter(id => id !== requestId);
				state.hostManagedRequestIds = state.hostManagedRequestIds.filter(
					id => id !== requestId,
				);
			}
		});

		// Deny pending request
		builder.addCase(denyPendingRequest.fulfilled, (state, action) => {
			const { requestId } = action.payload;
			if (state.pendingRequestsById[requestId]) {
				delete state.pendingRequestsById[requestId];
				state.requestIds = state.requestIds.filter(id => id !== requestId);
				state.hostManagedRequestIds = state.hostManagedRequestIds.filter(
					id => id !== requestId,
				);
			}
		});

		// Rescind pending request
		builder.addCase(rescindPendingRequest.fulfilled, (state, action) => {
			const { requestId } = action.payload;
			if (state.pendingRequestsById[requestId]) {
				delete state.pendingRequestsById[requestId];
				state.requestIds = state.requestIds.filter(id => id !== requestId);
				state.hostManagedRequestIds = state.hostManagedRequestIds.filter(
					id => id !== requestId,
				);
			}
		});

		// Fetch user's own pending requests
		builder.addCase(fetchUserPendingRequests.fulfilled, (state, action) => {
			const requests = action.payload;
			// Add user's own requests to state (merge with existing requests)
			requests.forEach(request => {
				if (!state.pendingRequestsById[request.id]) {
					state.pendingRequestsById[request.id] = request;
					if (!state.requestIds.includes(request.id)) {
						state.requestIds.push(request.id);
					}
				}
			});
		});
	},
});

// Selector to check if user has a pending request for a specific event
export const selectHasPendingRequestForEvent = (
	state: RootState,
	eventId: string,
	userId: string,
): boolean => {
	return Object.values(state.pendingRequests.pendingRequestsById).some(
		request => request.event_id === eventId && request.user_id === userId,
	);
};

export const {
	clearError,
	resetState,
	addPendingRequestRealtime,
	removePendingRequestRealtime,
} = pendingRequestsSlice.actions;

export default pendingRequestsSlice.reducer;
