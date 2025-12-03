import { createSelector } from "@reduxjs/toolkit";
import type { RootState } from "../index";
import type { Notification } from "../../types";

// Basic selectors - simple functions that return a piece of state
export const selectNotificationsById = (state: RootState) =>
	state.notifications.notificationsById;
export const selectNotificationIds = (state: RootState) =>
	state.notifications.notificationIds;
export const selectUnreadCount = (state: RootState) =>
	state.notifications.unreadCount;

// Get all notifications as an array (sorted by created_at descending - newest first)
export const selectAllNotifications = createSelector(
	[selectNotificationsById, selectNotificationIds],
	(notificationsById, notificationIds) => {
		return notificationIds
			.map(id => notificationsById[id])
			.filter((notif): notif is Notification => notif !== undefined);
	},
);

// Select notification by ID - O(1) lookup
export const selectNotificationById = createSelector(
	[selectNotificationsById, (_state: RootState, notificationId: string) => notificationId],
	(notificationsById, notificationId) => {
		return notificationsById[notificationId] || null;
	},
);

