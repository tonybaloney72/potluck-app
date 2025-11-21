import { useEffect, useRef } from "react";
import { useAppDispatch, useAppSelector } from "../store/hooks";
import { store } from "../store";
import {
	addFriendship,
	updateFriendship,
	removeFriendship,
} from "../store/slices/friendsSlice";
import { supabase } from "../services/supabase";
import type { Friendship } from "../types";

export function useFriendshipsRealtime() {
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
				"❌ Cannot subscribe to friendships: User not authenticated",
			);
			return;
		}

		// Capture user ID at subscription time to avoid closure issues
		const currentUserId = user.id;

		// Remove existing channel if any
		if (channelRef.current) {
			supabase.removeChannel(channelRef.current);
		}

		isSubscribingRef.current = true;

		// Create a channel for friendships changes
		const channel = supabase
			.channel(`friendships:${currentUserId}`)
			.on(
				"postgres_changes" as any,
				{
					event: "*", // Listen to INSERT, UPDATE, DELETE
					schema: "public",
					table: "friendships",
					filter: `user_id=eq.${currentUserId}`, // Friendships where current user is the requester
				},
				async (payload: {
					eventType: "INSERT" | "UPDATE";
					new: any;
					old: { id: string } | null;
				}) => {
					// Handle friendships where current user is user_id (requester)
					if (payload.eventType === "INSERT" && payload.new) {
						// Fetch the friend's profile
						const { data: friendProfile } = await supabase
							.from("profiles")
							.select("*")
							.eq("id", payload.new.friend_id)
							.single();

						const friendship: Friendship = {
							...payload.new,
							friend: friendProfile || null,
							user: null,
						};
						dispatch(addFriendship(friendship));
					} else if (payload.eventType === "UPDATE" && payload.new) {
						// Fetch the friend's profile
						const { data: friendProfile } = await supabase
							.from("profiles")
							.select("*")
							.eq("id", payload.new.friend_id)
							.single();

						const friendship: Friendship = {
							...payload.new,
							friend: friendProfile || null,
							user: null,
						};
						dispatch(updateFriendship(friendship));
					}
				},
			)
			.on(
				"postgres_changes" as any,
				{
					event: "*", // Listen to INSERT, UPDATE, DELETE
					schema: "public",
					table: "friendships",
					filter: `friend_id=eq.${currentUserId}`, // Friendships where current user is the receiver
				},
				async (payload: {
					eventType: "INSERT" | "UPDATE";
					new: any;
					old: { id: string } | null;
				}) => {
					// Handle friendships where current user is friend_id (receiver)
					if (payload.eventType === "INSERT" && payload.new) {
						// Fetch the requester's profile
						const { data: requesterProfile } = await supabase
							.from("profiles")
							.select("*")
							.eq("id", payload.new.user_id)
							.single();

						const friendship: Friendship = {
							...payload.new,
							user: requesterProfile || null,
							friend: null,
						};
						dispatch(addFriendship(friendship));
					} else if (payload.eventType === "UPDATE" && payload.new) {
						// Fetch the requester's profile
						const { data: requesterProfile } = await supabase
							.from("profiles")
							.select("*")
							.eq("id", payload.new.user_id)
							.single();

						const friendship: Friendship = {
							...payload.new,
							user: requesterProfile || null,
							friend: null,
						};
						dispatch(updateFriendship(friendship));
					}
				},
			)
			.on(
				"postgres_changes" as any,
				{
					event: "DELETE", // Only listen to DELETE events
					schema: "public",
					table: "friendships",
					// No filter - we'll check manually in the callback
				},
				(payload: { eventType: "DELETE"; old: { id: string } | null }) => {
					// Handle DELETE events for any friendship where current user is involved
					// This catches DELETE events that filters might miss
					if (payload.eventType === "DELETE" && payload.old) {
						const deletedFriendshipId = payload.old.id;

						// Check if this friendship exists in our Redux state
						// If it exists, it means it involves the current user (we only load our own friendships)
						const state = store.getState();
						const friendshipExists = state.friends.friendships.some(
							f => f.id === deletedFriendshipId,
						);

						if (friendshipExists) {
							dispatch(removeFriendship(deletedFriendshipId));
						}
					}
				},
			)
			.subscribe(status => {
				isSubscribingRef.current = false;

				if (status === "SUBSCRIBED") {
					console.log("✅ Friendships channel subscribed successfully");
					// Clear any pending reconnect attempts
					if (reconnectTimeoutRef.current) {
						clearTimeout(reconnectTimeoutRef.current);
						reconnectTimeoutRef.current = null;
					}
				} else if (status === "CHANNEL_ERROR") {
					console.error(
						"❌ Friendships channel error - Will attempt to reconnect...",
					);
					// Attempt to reconnect after a delay
					if (!reconnectTimeoutRef.current) {
						reconnectTimeoutRef.current = window.setTimeout(() => {
							reconnectTimeoutRef.current = null;
							console.log(
								"🔄 Attempting to reconnect to friendships channel...",
							);
							subscribeToChannel();
						}, 3000);
					}
				} else if (status === "TIMED_OUT") {
					console.warn(
						"⚠️ Friendships channel subscription timed out - Will attempt to reconnect...",
					);
					if (!reconnectTimeoutRef.current) {
						reconnectTimeoutRef.current = window.setTimeout(() => {
							reconnectTimeoutRef.current = null;
							console.log(
								"🔄 Attempting to reconnect to friendships channel...",
							);
							subscribeToChannel();
						}, 3000);
					}
				} else if (status === "CLOSED") {
					console.log(
						"📡 Friendships channel closed - Will attempt to reconnect...",
					);
					if (!reconnectTimeoutRef.current) {
						reconnectTimeoutRef.current = window.setTimeout(() => {
							reconnectTimeoutRef.current = null;
							console.log(
								"🔄 Attempting to reconnect to friendships channel...",
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
