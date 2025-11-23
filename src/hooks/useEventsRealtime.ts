import { useEffect, useRef } from "react";
import { useAppDispatch, useAppSelector } from "../store/hooks";
import { fetchUserEvents } from "../store/slices/eventsSlice";
import { supabase } from "../services/supabase";

export function useEventsRealtime() {
	const dispatch = useAppDispatch();
	const { user } = useAppSelector(state => state.auth);
	const channelRef = useRef<ReturnType<typeof supabase.channel> | null>(null);
	const notificationsChannelRef = useRef<ReturnType<
		typeof supabase.channel
	> | null>(null);
	const reconnectTimeoutRef = useRef<number | null>(null);
	const isSubscribingRef = useRef(false);

	const subscribeToChannel = async () => {
		if (!user || isSubscribingRef.current) return;

		// Verify user is authenticated before subscribing
		const {
			data: { session },
		} = await supabase.auth.getSession();

		if (!session) {
			console.error("❌ Cannot subscribe to events: User not authenticated");
			return;
		}

		// Capture user ID at subscription time to avoid closure issues
		const currentUserId = user.id;

		// Remove existing channel if any
		if (channelRef.current) {
			supabase.removeChannel(channelRef.current);
		}

		isSubscribingRef.current = true;

		// Create a channel for event_participants changes
		const channel = supabase
			.channel(`user_events:${currentUserId}`)
			.on(
				"postgres_changes" as any,
				{
					event: "INSERT",
					schema: "public",
					table: "event_participants",
					filter: `user_id=eq.${currentUserId}`,
				},
				(_payload: {
					eventType: "INSERT";
					new: { event_id: string; user_id: string };
					old: null;
				}) => {
					// When user is added as a participant, refresh events list
					dispatch(fetchUserEvents());
				},
			)
			.subscribe(status => {
				if (status === "SUBSCRIBED") {
					isSubscribingRef.current = false;
				} else if (status === "CHANNEL_ERROR") {
					console.error("❌ Error subscribing to event invitations");
					isSubscribingRef.current = false;
				}
			});

		channelRef.current = channel;

		// Also subscribe to notifications as a fallback
		// When an event_invitation notification is received, refresh events
		const notificationsChannel = supabase
			.channel(`event_notifications:${currentUserId}`)
			.on(
				"postgres_changes" as any,
				{
					event: "INSERT",
					schema: "public",
					table: "notifications",
					filter: `user_id=eq.${currentUserId} AND type=eq.event_invitation`,
				},
				(_payload: {
					eventType: "INSERT";
					new: { type: string; related_id: string };
					old: null;
				}) => {
					// Refresh events when invitation notification is received
					dispatch(fetchUserEvents());
				},
			)
			.subscribe(status => {
				if (status === "CHANNEL_ERROR") {
					console.error(
						"❌ Error subscribing to event invitation notifications",
					);
				}
			});

		notificationsChannelRef.current = notificationsChannel;
	};

	useEffect(() => {
		subscribeToChannel();

		return () => {
			if (channelRef.current) {
				supabase.removeChannel(channelRef.current);
				channelRef.current = null;
			}
			if (notificationsChannelRef.current) {
				supabase.removeChannel(notificationsChannelRef.current);
				notificationsChannelRef.current = null;
			}
			if (reconnectTimeoutRef.current) {
				clearTimeout(reconnectTimeoutRef.current);
			}
		};
	}, [user?.id, dispatch]);
}
