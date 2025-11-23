import { useRealtimeSubscription } from "./useRealtimeSubscription";
import { useAppDispatch, useAppSelector } from "../store/hooks";
import {
	addNotification,
	updateNotification,
	removeNotification,
} from "../store/slices/notificationsSlice";
import type { Notification } from "../types";

export function useNotificationsRealtime() {
	const dispatch = useAppDispatch();
	const { user } = useAppSelector(state => state.auth);

	useRealtimeSubscription({
		channelName: `notifications:${user?.id}`,
		table: "notifications",
		filter: `user_id=eq.${user?.id}`,
		onInsert: (payload: { eventType: "INSERT"; new: Notification | null }) => {
			if (payload.eventType === "INSERT" && payload.new) {
				dispatch(addNotification(payload.new as Notification));
			}
		},
		onUpdate: (payload: { eventType: "UPDATE"; new: Notification | null }) => {
			if (payload.eventType === "UPDATE" && payload.new) {
				dispatch(updateNotification(payload.new as Notification));
			}
		},
		onDelete: (payload: {
			eventType: "DELETE";
			old: { id: string } | null;
		}) => {
			if (payload.eventType === "DELETE" && payload.old) {
				dispatch(removeNotification(payload.old.id));
			}
		},
	});
}
