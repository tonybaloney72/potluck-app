import {
	createSlice,
	createAsyncThunk,
	type PayloadAction,
} from "@reduxjs/toolkit";
import { supabase } from "../../services/supabase";
import type { Notification, NotificationType } from "../../types";
import { requireAuth } from "../../utils/auth";

interface NotificationsState {
	notifications: Notification[];
	unreadCount: number;
	loading: boolean;
	error: string | null;
}

const initialState: NotificationsState = {
	notifications: [],
	unreadCount: 0,
	loading: false,
	error: null,
};

// Fetch all notifications for the current user
export const fetchNotifications = createAsyncThunk(
	"notifications/fetchNotifications",
	async () => {
		const user = await requireAuth();

		const { data, error } = await supabase
			.from("notifications")
			.select("*")
			.eq("user_id", user.id)
			.order("created_at", { ascending: false })
			.limit(50); // Limit to 50 most recent notifications

		if (error) throw error;
		return data as Notification[];
	},
);

// Mark a single notification as read
export const markNotificationAsRead = createAsyncThunk(
	"notifications/markNotificationAsRead",
	async (notificationId: string) => {
		const user = await requireAuth();

		const { error } = await supabase
			.from("notifications")
			.update({ read: true })
			.eq("id", notificationId)
			.eq("user_id", user.id);

		if (error) throw error;
		return notificationId;
	},
);

// Mark all notifications as read
export const markAllNotificationsAsRead = createAsyncThunk(
	"notifications/markAllNotificationsAsRead",
	async () => {
		const user = await requireAuth();

		const { error } = await supabase.rpc("mark_notifications_as_read", {
			p_user_id: user.id,
		});

		if (error) throw error;
		return true;
	},
);

// Delete a notification
export const deleteNotification = createAsyncThunk(
	"notifications/deleteNotification",
	async (notificationId: string) => {
		const user = await requireAuth();

		const { error } = await supabase
			.from("notifications")
			.delete()
			.eq("id", notificationId)
			.eq("user_id", user.id);

		if (error) throw error;
		return notificationId;
	},
);

// Create a notification (for testing or manual creation)
export const createNotification = createAsyncThunk(
	"notifications/createNotification",
	async ({
		userId,
		type,
		title,
		message,
		relatedId,
	}: {
		userId: string;
		type: NotificationType;
		title: string;
		message: string;
		relatedId?: string | null;
	}) => {
		const { data, error } = await supabase
			.from("notifications")
			.insert({
				user_id: userId,
				type,
				title,
				message,
				related_id: relatedId || null,
			})
			.select()
			.single();

		if (error) throw error;
		return data as Notification;
	},
);

const notificationsSlice = createSlice({
	name: "notifications",
	initialState,
	reducers: {
		// Add notification from realtime subscription
		addNotification: (state, action: PayloadAction<Notification>) => {
			// Prevent duplicates
			const exists = state.notifications.some(n => n.id === action.payload.id);
			if (!exists) {
				state.notifications.unshift(action.payload);
				if (!action.payload.read) {
					state.unreadCount += 1;
				}
				// Keep only the most recent 50 notifications in state
				if (state.notifications.length > 50) {
					state.notifications = state.notifications.slice(0, 50);
				}
			}
		},
		// Update notification from realtime subscription
		updateNotification: (state, action: PayloadAction<Notification>) => {
			const index = state.notifications.findIndex(
				n => n.id === action.payload.id,
			);
			if (index !== -1) {
				const wasUnread = !state.notifications[index].read;
				const isUnread = !action.payload.read;
				state.notifications[index] = action.payload;

				// Update unread count
				if (wasUnread && !isUnread) {
					state.unreadCount = Math.max(0, state.unreadCount - 1);
				} else if (!wasUnread && isUnread) {
					state.unreadCount += 1;
				}
			}
		},
		// Remove notification from realtime subscription
		removeNotification: (state, action: PayloadAction<string>) => {
			const index = state.notifications.findIndex(n => n.id === action.payload);
			if (index !== -1) {
				const notification = state.notifications[index];
				if (!notification.read) {
					state.unreadCount = Math.max(0, state.unreadCount - 1);
				}
				state.notifications.splice(index, 1);
			}
		},
		clearError: state => {
			state.error = null;
		},
	},
	extraReducers: builder => {
		// Fetch notifications
		builder
			.addCase(fetchNotifications.pending, state => {
				state.loading = true;
				state.error = null;
			})
			.addCase(fetchNotifications.fulfilled, (state, action) => {
				state.loading = false;
				state.notifications = action.payload;
				state.unreadCount = action.payload.filter(n => !n.read).length;
			})
			.addCase(fetchNotifications.rejected, (state, action) => {
				state.loading = false;
				state.error = action.error.message || "Failed to fetch notifications";
			});

		// Mark notification as read
		builder
			.addCase(markNotificationAsRead.fulfilled, (state, action) => {
				const notification = state.notifications.find(
					n => n.id === action.payload,
				);
				if (notification && !notification.read) {
					notification.read = true;
					state.unreadCount = Math.max(0, state.unreadCount - 1);
				}
			})
			.addCase(markNotificationAsRead.rejected, (state, action) => {
				state.error =
					action.error.message || "Failed to mark notification as read";
			});

		// Mark all as read
		builder
			.addCase(markAllNotificationsAsRead.fulfilled, state => {
				state.notifications.forEach(n => {
					n.read = true;
				});
				state.unreadCount = 0;
			})
			.addCase(markAllNotificationsAsRead.rejected, (state, action) => {
				state.error =
					action.error.message || "Failed to mark all notifications as read";
			});

		// Delete notification
		builder
			.addCase(deleteNotification.fulfilled, (state, action) => {
				const index = state.notifications.findIndex(
					n => n.id === action.payload,
				);
				if (index !== -1) {
					const notification = state.notifications[index];
					if (!notification.read) {
						state.unreadCount = Math.max(0, state.unreadCount - 1);
					}
					state.notifications.splice(index, 1);
				}
			})
			.addCase(deleteNotification.rejected, (state, action) => {
				state.error = action.error.message || "Failed to delete notification";
			});

		// Create notification
		builder.addCase(createNotification.fulfilled, (state, action) => {
			// Only add if it's for the current user (handled by realtime in practice)
			state.notifications.unshift(action.payload);
			if (!action.payload.read) {
				state.unreadCount += 1;
			}
		});
	},
});

export const {
	addNotification,
	updateNotification,
	removeNotification,
	clearError,
} = notificationsSlice.actions;

export default notificationsSlice.reducer;
