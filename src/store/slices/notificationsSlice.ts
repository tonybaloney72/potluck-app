import {
	createSlice,
	createAsyncThunk,
	type PayloadAction,
} from "@reduxjs/toolkit";
import { supabase } from "../../services/supabase";
import type { Notification, NotificationType } from "../../types";
import { requireAuth } from "../../utils/auth";

interface NotificationsState {
	// ✅ Normalized structure - single source of truth
	notificationsById: {
		[notificationId: string]: Notification;
	};
	// Maintain sorted order by created_at (descending - newest first)
	notificationIds: string[];
	unreadCount: number;
	loading: boolean;
	error: string | null;
}

const initialState: NotificationsState = {
	notificationsById: {},
	notificationIds: [],
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
		
		// Return normalized structure: { notificationsById, notificationIds }
		const notificationsById: { [id: string]: Notification } = {};
		const notificationIds: string[] = [];

		(data as Notification[]).forEach(notification => {
			notificationsById[notification.id] = notification;
			notificationIds.push(notification.id);
		});

		// Sort notificationIds by created_at descending (newest first)
		notificationIds.sort((a, b) => {
			const aTime = notificationsById[a].created_at;
			const bTime = notificationsById[b].created_at;
			return new Date(bTime).getTime() - new Date(aTime).getTime();
		});

		return { notificationsById, notificationIds } as {
			notificationsById: { [id: string]: Notification };
			notificationIds: string[];
		};
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

// Mark notifications as read for a specific conversation
export const markConversationNotificationsAsRead = createAsyncThunk(
	"notifications/markConversationNotificationsAsRead",
	async (conversationId: string) => {
		const user = await requireAuth();

		const { data, error } = await supabase
			.from("notifications")
			.update({ read: true })
			.eq("user_id", user.id)
			.eq("type", "message")
			.eq("related_id", conversationId)
		.eq("read", false)
		.select();

		if (error) throw error;
		// Return array of notification IDs that were marked as read
		return (data as Notification[]).map(n => n.id);
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

// Helper function to maintain sorted notificationIds (newest first)
const maintainSortedOrder = (
	notificationsById: { [id: string]: Notification },
	notificationIds: string[],
): string[] => {
	return [...notificationIds].sort((a, b) => {
		const aTime = notificationsById[a]?.created_at;
		const bTime = notificationsById[b]?.created_at;
		if (!aTime || !bTime) return 0;
		return new Date(bTime).getTime() - new Date(aTime).getTime();
	});
};

const notificationsSlice = createSlice({
	name: "notifications",
	initialState,
	reducers: {
		// Add notification from realtime subscription
		addNotification: (state, action: PayloadAction<Notification>) => {
			// Prevent duplicates
			if (!state.notificationsById[action.payload.id]) {
				state.notificationsById[action.payload.id] = action.payload;
				// Add to notificationIds if not already present
				if (!state.notificationIds.includes(action.payload.id)) {
					state.notificationIds.push(action.payload.id);
				}
				// Re-sort notificationIds (newest first)
				state.notificationIds = maintainSortedOrder(
					state.notificationsById,
					state.notificationIds,
				);
				
				if (!action.payload.read) {
					state.unreadCount += 1;
				}
				
				// Keep only the most recent 50 notifications in state
				if (state.notificationIds.length > 50) {
					// Remove oldest notifications
					const idsToRemove = state.notificationIds.slice(50);
					idsToRemove.forEach(id => {
						delete state.notificationsById[id];
					});
					state.notificationIds = state.notificationIds.slice(0, 50);
				}
			}
		},
		// Update notification from realtime subscription
		updateNotification: (state, action: PayloadAction<Notification>) => {
			if (state.notificationsById[action.payload.id]) {
				const wasUnread = !state.notificationsById[action.payload.id].read;
				const isUnread = !action.payload.read;
				state.notificationsById[action.payload.id] = action.payload;

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
			if (state.notificationsById[action.payload]) {
				const notification = state.notificationsById[action.payload];
				if (!notification.read) {
					state.unreadCount = Math.max(0, state.unreadCount - 1);
				}
				delete state.notificationsById[action.payload];
				state.notificationIds = state.notificationIds.filter(
					id => id !== action.payload,
				);
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
				// ✅ Store in normalized structure
				state.notificationsById = action.payload.notificationsById;
				state.notificationIds = action.payload.notificationIds;
				// Calculate unread count
				state.unreadCount = Object.values(action.payload.notificationsById).filter(
					n => !n.read,
				).length;
			})
			.addCase(fetchNotifications.rejected, (state, action) => {
				state.loading = false;
				state.error = action.error.message || "Failed to fetch notifications";
			});

		// Mark notification as read
		builder
			.addCase(markNotificationAsRead.fulfilled, (state, action) => {
				const notification = state.notificationsById[action.payload];
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
				state.notificationIds.forEach(id => {
					if (state.notificationsById[id]) {
						state.notificationsById[id].read = true;
					}
				});
				state.unreadCount = 0;
			})
			.addCase(markAllNotificationsAsRead.rejected, (state, action) => {
				state.error =
					action.error.message || "Failed to mark all notifications as read";
			});

		// Mark conversation notifications as read
		builder
			.addCase(
				markConversationNotificationsAsRead.fulfilled,
				(state, action) => {
					action.payload.forEach(notificationId => {
						const notification = state.notificationsById[notificationId];
						if (notification && !notification.read) {
							notification.read = true;
							state.unreadCount = Math.max(0, state.unreadCount - 1);
						}
					});
				},
			)
			.addCase(
				markConversationNotificationsAsRead.rejected,
				(state, action) => {
					state.error =
						action.error.message ||
						"Failed to mark conversation notifications as read";
				},
			);

		// Delete notification
		builder
			.addCase(deleteNotification.fulfilled, (state, action) => {
				const notification = state.notificationsById[action.payload];
				if (notification) {
					if (!notification.read) {
						state.unreadCount = Math.max(0, state.unreadCount - 1);
					}
					delete state.notificationsById[action.payload];
					state.notificationIds = state.notificationIds.filter(
						id => id !== action.payload,
					);
				}
			})
			.addCase(deleteNotification.rejected, (state, action) => {
				state.error = action.error.message || "Failed to delete notification";
			});

		// Create notification
		builder.addCase(createNotification.fulfilled, (state, action) => {
			// Only add if it's for the current user (handled by realtime in practice)
			if (!state.notificationsById[action.payload.id]) {
				state.notificationsById[action.payload.id] = action.payload;
				if (!state.notificationIds.includes(action.payload.id)) {
					state.notificationIds.push(action.payload.id);
				}
				// Re-sort notificationIds (newest first)
				state.notificationIds = maintainSortedOrder(
					state.notificationsById,
					state.notificationIds,
				);
				if (!action.payload.read) {
					state.unreadCount += 1;
				}
				// Keep only the most recent 50 notifications
				if (state.notificationIds.length > 50) {
					const idsToRemove = state.notificationIds.slice(50);
					idsToRemove.forEach(id => {
						delete state.notificationsById[id];
					});
					state.notificationIds = state.notificationIds.slice(0, 50);
				}
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
