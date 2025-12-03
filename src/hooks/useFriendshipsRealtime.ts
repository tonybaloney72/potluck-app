import { useRealtimeSubscription } from "./useRealtimeSubscription";
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

	useRealtimeSubscription({
		channelName: `friendships:${user?.id}:requester`,
		table: "friendships",
		filter: `user_id=eq.${user?.id}`,
		onInsert: async (payload: { eventType: "INSERT"; new: any }) => {
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
			}
		},
		onUpdate: async (payload: { eventType: "UPDATE"; new: any }) => {
			if (payload.eventType === "UPDATE" && payload.new) {
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
	});

	useRealtimeSubscription({
		channelName: `friendships:${user?.id}:receiver`,
		table: "friendships",
		filter: `friend_id=eq.${user?.id}`,
		onInsert: async (payload: { eventType: "INSERT"; new: any }) => {
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
			}
		},
		onUpdate: async (payload: { eventType: "UPDATE"; new: any }) => {
			if (payload.eventType === "UPDATE" && payload.new) {
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
	});

	useRealtimeSubscription({
		channelName: `friendships:${user?.id}:delete`,
		table: "friendships",
		// No filter - we'll check manually in the callback
		onDelete: (payload: {
			eventType: "DELETE";
			old: { id: string } | null;
		}) => {
			if (payload.eventType === "DELETE" && payload.old) {
				const deletedFriendshipId = payload.old.id;

				// Check if this friendship exists in our Redux state
				const state = store.getState();
				const friendshipExists = !!state.friends.friendshipsById[deletedFriendshipId];

				if (friendshipExists) {
					dispatch(removeFriendship(deletedFriendshipId));
				}
			}
		},
	});
}
