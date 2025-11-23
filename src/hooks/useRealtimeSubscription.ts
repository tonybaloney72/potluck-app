import { useEffect, useRef } from "react";
import { useAppSelector } from "../store/hooks";
import { supabase } from "../services/supabase";
import { requireSession } from "../utils/auth";

export interface RealtimeSubscriptionConfig {
	channelName: string;
	table: string;
	filter?: string;
	onInsert?: (payload: any) => void | Promise<void>;
	onUpdate?: (payload: any) => void | Promise<void>;
	onDelete?: (payload: any) => void | Promise<void>;
	onError?: (error: string) => void;
	reconnectDelay?: number;
}

export function useRealtimeSubscription(config: RealtimeSubscriptionConfig) {
	const { user } = useAppSelector(state => state.auth);
	const channelRef = useRef<ReturnType<typeof supabase.channel> | null>(null);
	const reconnectTimeoutRef = useRef<number | null>(null);
	const isSubscribingRef = useRef(false);
	const reconnectDelay = config.reconnectDelay || 3000;

	const subscribeToChannel = async () => {
		if (!user || isSubscribingRef.current) return;

		try {
			await requireSession();
		} catch {
			console.error(
				`❌ Cannot subscribe to ${config.channelName}: User not authenticated`,
			);
			return;
		}

		// Remove existing channel if any
		if (channelRef.current) {
			supabase.removeChannel(channelRef.current);
		}

		isSubscribingRef.current = true;

		// Build channel with event handlers
		let channel = supabase.channel(config.channelName);

		if (config.onInsert) {
			channel = channel.on(
				"postgres_changes" as any,
				{
					event: "INSERT",
					schema: "public",
					table: config.table,
					filter: config.filter,
				},
				config.onInsert,
			);
		}

		if (config.onUpdate) {
			channel = channel.on(
				"postgres_changes" as any,
				{
					event: "UPDATE",
					schema: "public",
					table: config.table,
					filter: config.filter,
				},
				config.onUpdate,
			);
		}

		if (config.onDelete) {
			channel = channel.on(
				"postgres_changes" as any,
				{
					event: "DELETE",
					schema: "public",
					table: config.table,
					filter: config.filter,
				},
				config.onDelete,
			);
		}

		channel = channel.subscribe(status => {
			isSubscribingRef.current = false;

			if (status === "SUBSCRIBED") {
				if (reconnectTimeoutRef.current) {
					clearTimeout(reconnectTimeoutRef.current);
					reconnectTimeoutRef.current = null;
				}
			} else if (status === "CHANNEL_ERROR") {
				const errorMsg = `❌ ${config.channelName} channel error - Will attempt to reconnect...`;
				console.error(errorMsg);
				config.onError?.(errorMsg);
				handleReconnect();
			} else if (status === "TIMED_OUT") {
				const errorMsg = `⚠️ ${config.channelName} channel subscription timed out - Will attempt to reconnect...`;
				console.warn(errorMsg);
				handleReconnect();
			} else if (status === "CLOSED") {
				handleReconnect();
			}
		});

		channelRef.current = channel;

		function handleReconnect() {
			if (!reconnectTimeoutRef.current) {
				reconnectTimeoutRef.current = window.setTimeout(() => {
					reconnectTimeoutRef.current = null;
					subscribeToChannel();
				}, reconnectDelay);
			}
		}
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
	}, [user?.id]);
}
