import { useEffect, useRef } from "react";
import { useAppDispatch, useAppSelector } from "../store/hooks";
import {
	addPendingRequestRealtime,
	removePendingRequestRealtime,
} from "../store/slices/pendingRequestsSlice";
import { supabase } from "../services/supabase";
import type { PendingContributionRequest } from "../types";

export const usePendingRequestsRealtime = () => {
	const dispatch = useAppDispatch();
	const { profile } = useAppSelector(state => state.auth);
	const eventIdsRef = useRef<string[]>([]);
	const channelRef = useRef<ReturnType<typeof supabase.channel> | null>(null);

	useEffect(() => {
		if (!profile?.id) return;

		let isMounted = true;

		// Get events where user is host/co-host
		const setupSubscription = async () => {
			const { data } = await supabase
				.from("event_participants")
				.select("event_id")
				.eq("user_id", profile.id)
				.in("role", ["host", "co-host"]);

			const eventIds = data?.map(e => e.event_id) || [];
			eventIdsRef.current = eventIds;

			if (!isMounted || eventIds.length === 0) {
				// No hosted events, don't set up subscription
				return;
			}

			// Remove existing channel if any
			if (channelRef.current) {
				supabase.removeChannel(channelRef.current);
			}

			const channel = supabase
				.channel("pending-contribution-requests")
				.on(
					"postgres_changes",
					{
						event: "INSERT",
						schema: "public",
						table: "pending_contribution_requests",
						filter: `event_id=in.(${eventIds.join(",")})`,
					},
					async payload => {
						if (!isMounted) return;

						// Fetch full request with relations
						const { data } = await supabase
							.from("pending_contribution_requests")
							.select(
								`
								*,
								user:profiles!pending_contribution_requests_user_id_fkey(id, name, avatar_url),
								event:events!pending_contribution_requests_event_id_fkey(id, title, event_datetime, created_by)
							`,
							)
							.eq("id", payload.new.id)
							.single();

						if (data) {
							dispatch(
								addPendingRequestRealtime(data as PendingContributionRequest),
							);
						}
					},
				)
				.on(
					"postgres_changes",
					{
						event: "DELETE",
						schema: "public",
						table: "pending_contribution_requests",
						// No filter - we'll check event_id manually to avoid issues with 'in' filter on DELETE
					},
					payload => {
						if (!isMounted) return;

						const deletedEventId = (payload.old as any)?.event_id;
						const requestId = (payload.old as any)?.id;

						// Only process if this request belongs to one of our hosted events
						if (
							deletedEventId &&
							eventIdsRef.current.includes(deletedEventId)
						) {
							dispatch(
								removePendingRequestRealtime({
									requestId: requestId as string,
								}),
							);
						}
					},
				)
				.subscribe();

			channelRef.current = channel;
		};

		setupSubscription();

		return () => {
			isMounted = false;
			if (channelRef.current) {
				supabase.removeChannel(channelRef.current);
				channelRef.current = null;
			}
		};
	}, [dispatch, profile?.id]);
};
