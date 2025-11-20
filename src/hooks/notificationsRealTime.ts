import { useEffect, useRef } from "react";
import { useAppDispatch, useAppSelector } from "../store/hooks";
import {
	addNotification,
	updateNotification,
	removeNotification,
} from "../store/slices/notificationsSlice";
import { supabase } from "../services/supabase";
import type { Notification } from "../types";

export function useNotificationsRealtime() {
	const dispatch = useAppDispatch();
	const { user } = useAppSelector(state => state.auth);
	const channelRef = useRef<ReturnType<typeof supabase.channel> | null>(null);
	const reconnectTimeoutRef = useRef<number | null>(null);
	const isSubscribingRef = useRef(false);

	const subscribeToChannel = async () => {
		if (!user || isSubscribingRef.current) return;

		// Verify user is authenticated before subscribing
		const {
			data: { session },
		} = await supabase.auth.getSession();

		if (!session) {
			console.error(
				"❌ Cannot subscribe to notifications: User not authenticated",
			);
			return;
		}

		// Remove existing channel if any
		if (channelRef.current) {
			supabase.removeChannel(channelRef.current);
		}

		isSubscribingRef.current = true;

		// Create a channel for this user's notifications
		// Using public channel first to test - can switch to private later
		// Following Supabase naming convention: scope:id:entity
		const channel = supabase.channel(`user:${user.id}:notifications`);

		channel
			.on(
				"broadcast",
				{ event: "notification_change" },
				(payload: {
					payload: {
						type: "INSERT" | "UPDATE" | "DELETE";
						notification: Notification | { id: string };
					};
				}) => {
					// Handle notification changes broadcast from database triggers
					// payload.payload contains the data we sent from the trigger
					const { type, notification } = payload.payload;
					if (type === "INSERT" || type === "UPDATE") {
						// notification is a full Notification object
						const notif = notification as Notification;
						if (type === "INSERT") {
							dispatch(addNotification(notif));
						} else {
							dispatch(updateNotification(notif));
						}
					} else if (type === "DELETE") {
						// notification only has id
						dispatch(removeNotification(notification.id));
					}
				},
			)
			.subscribe(status => {
				isSubscribingRef.current = false;

				if (status === "SUBSCRIBED") {
					console.log("✅ Notifications channel subscribed successfully");
					// Clear any pending reconnect attempts
					if (reconnectTimeoutRef.current) {
						clearTimeout(reconnectTimeoutRef.current);
						reconnectTimeoutRef.current = null;
					}
				} else if (status === "CHANNEL_ERROR") {
					console.error(
						"❌ Notifications channel error - Will attempt to reconnect...",
					);
					// Attempt to reconnect after a delay
					if (!reconnectTimeoutRef.current) {
						reconnectTimeoutRef.current = window.setTimeout(() => {
							reconnectTimeoutRef.current = null;
							console.log(
								"🔄 Attempting to reconnect to notifications channel...",
							);
							subscribeToChannel();
						}, 3000); // Wait 3 seconds before reconnecting
					}
				} else if (status === "TIMED_OUT") {
					console.warn(
						"⚠️ Notifications channel subscription timed out - Will attempt to reconnect...",
					);
					// Attempt to reconnect after a delay
					if (!reconnectTimeoutRef.current) {
						reconnectTimeoutRef.current = window.setTimeout(() => {
							reconnectTimeoutRef.current = null;
							console.log(
								"🔄 Attempting to reconnect to notifications channel...",
							);
							subscribeToChannel();
						}, 3000);
					}
				} else if (status === "CLOSED") {
					console.log(
						"📡 Notifications channel closed - Will attempt to reconnect...",
					);
					// Attempt to reconnect after a delay
					if (!reconnectTimeoutRef.current) {
						reconnectTimeoutRef.current = window.setTimeout(() => {
							reconnectTimeoutRef.current = null;
							console.log(
								"🔄 Attempting to reconnect to notifications channel...",
							);
							subscribeToChannel();
						}, 3000);
					}
				} else {
					console.log("📡 Channel status:", status);
				}
			});

		channelRef.current = channel;
	};

	useEffect(() => {
		if (!user) {
			// Clean up if user logs out
			if (channelRef.current) {
				supabase.removeChannel(channelRef.current);
				channelRef.current = null;
			}
			if (reconnectTimeoutRef.current) {
				clearTimeout(reconnectTimeoutRef.current);
				reconnectTimeoutRef.current = null;
			}
			return;
		}

		subscribeToChannel();

		// Cleanup function
		return () => {
			if (channelRef.current) {
				supabase.removeChannel(channelRef.current);
				channelRef.current = null;
			}
			if (reconnectTimeoutRef.current) {
				clearTimeout(reconnectTimeoutRef.current);
				reconnectTimeoutRef.current = null;
			}
			isSubscribingRef.current = false;
		};
	}, [user, dispatch]);
}
