import { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router";
import { useAppDispatch, useAppSelector } from "../../store/hooks";
import {
	fetchNotifications,
	markNotificationAsRead,
	markAllNotificationsAsRead,
	deleteNotification,
} from "../../store/slices/notificationsSlice";
import { fetchConversations } from "../../store/slices/conversationsSlice";
import { FaBell, FaTimes, FaCheck, FaTrash } from "react-icons/fa";
import { SkeletonNotificationItem } from "../common/Skeleton";
import { motion, AnimatePresence } from "motion/react";
import type { Notification } from "../../types";

export const NotificationDropdown = () => {
	const dispatch = useAppDispatch();
	const navigate = useNavigate();
	const { notifications, unreadCount, loading } = useAppSelector(
		state => state.notifications,
	);
	const { user } = useAppSelector(state => state.auth);

	const [isOpen, setIsOpen] = useState(false);
	const dropdownRef = useRef<HTMLDivElement>(null);

	useEffect(() => {
		if (user) {
			dispatch(fetchNotifications());
		}
	}, [user, dispatch]);

	useEffect(() => {
		const handleClickOutside = (event: MouseEvent) => {
			if (
				dropdownRef.current &&
				!dropdownRef.current.contains(event.target as Node)
			) {
				setIsOpen(false);
			}
		};

		if (isOpen) {
			document.addEventListener("mousedown", handleClickOutside);
		} else {
			document.removeEventListener("mousedown", handleClickOutside);
		}
	}, [isOpen]);

	const handleMarkAsRead = (notificationId: string) => {
		dispatch(markNotificationAsRead(notificationId));
	};

	const handleMarkAllAsRead = () => {
		dispatch(markAllNotificationsAsRead());
	};

	const handleDelete = (notificationId: string) => {
		dispatch(deleteNotification(notificationId));
	};

	const handleNotificationClick = (notification: Notification) => {
		// If notification is a friend request, navigate to FriendsPage
		if (
			notification.type === "friend_request" ||
			notification.type === "friend_request_accepted"
		) {
			// Mark as read if unread
			if (!notification.read) {
				dispatch(markNotificationAsRead(notification.id));
			}
			// Close dropdown and navigate
			navigate("/friends");
		} else if (notification.type === "message" && notification.related_id) {
			dispatch(markNotificationAsRead(notification.id));
			dispatch(fetchConversations()).then(() => {
				navigate("/messages", {
					state: { conversationId: notification.related_id },
				});
			});
		} else if (
			notification.type === "event_invitation" &&
			notification.related_id
		) {
			dispatch(markNotificationAsRead(notification.id));
			navigate(`/events/${notification.related_id}`);
		} else if (notification.type === "rsvp" && notification.related_id) {
			// Navigate to event when RSVP notification is clicked
			dispatch(markNotificationAsRead(notification.id));
			navigate(`/events/${notification.related_id}`);
		} else if (
			(notification.type === "event_updated" ||
				notification.type === "event_cancelled" ||
				notification.type === "event_reminder") &&
			notification.related_id
		) {
			// Navigate to event for other event-related notifications
			dispatch(markNotificationAsRead(notification.id));
			navigate(`/events/${notification.related_id}`);
		}
		setIsOpen(false);
	};

	const getNotificationIcon = (type: Notification["type"]) => {
		switch (type) {
			case "friend_request":
			case "friend_request_accepted":
				return "👤";
			case "message":
				return "💬";
			case "event_invitation":
			case "event_updated":
			case "event_cancelled":
			case "event_reminder":
			case "rsvp":
				return "📅";
			default:
				return "🔔";
		}
	};
	return (
		<div className='relative' ref={dropdownRef}>
			{/* Bell Icon Button */}
			<button
				onClick={() => setIsOpen(!isOpen)}
				className='relative p-2 rounded-lg hover:bg-tertiary active:scale-95 transition-all duration-200 focus:outline-none hover:cursor-pointer flex justify-center items-center'
				aria-label={`Notifications${
					unreadCount > 0 ? `, ${unreadCount} unread` : ""
				}`}
				aria-expanded={isOpen}
				aria-haspopup='menu'
				type='button'>
				<FaBell className='w-5 h-5 text-primary' aria-hidden='true' />
				{unreadCount > 0 && (
					<span
						className='absolute top-0 right-0 flex items-center justify-center w-5 h-5 text-xs font-bold text-white bg-accent rounded-full'
						aria-label={`${unreadCount} unread notifications`}>
						{unreadCount > 9 ? "9+" : unreadCount}
					</span>
				)}
			</button>

			{/* Dropdown Menu */}
			<AnimatePresence>
				{isOpen && (
					<>
						{/* Backdrop */}
						<motion.div
							className='fixed inset-0 z-40'
							initial={{ opacity: 0 }}
							animate={{ opacity: 1 }}
							exit={{ opacity: 0 }}
							onClick={() => setIsOpen(false)}
						/>

						{/* Dropdown Content */}
						<motion.div
							className='fixed sm:absolute left-0 sm:left-auto sm:right-0 mt-3 w-full md:w-96 max-h-[600px] bg-secondary border border-border rounded-lg shadow-xl z-50 flex flex-col'
							initial={{ opacity: 0, y: -10, scale: 0.95 }}
							animate={{ opacity: 1, y: 0, scale: 1 }}
							exit={{ opacity: 0, y: -10, scale: 0.95 }}
							transition={{ duration: 0.15 }}
							role='menu'
							aria-label='Notifications menu'>
							{/* Header */}
							<div className='flex items-center justify-between p-4 border-b border-border'>
								<h3
									id='notifications-heading'
									className='text-lg font-semibold text-primary'>
									Notifications
								</h3>
								<div className='flex items-center gap-2'>
									{unreadCount > 0 && (
										<button
											onClick={handleMarkAllAsRead}
											className='text-sm text-accent hover:underline hover:text-accent-secondary transition-all duration-200 hover:cursor-pointer'
											type='button'
											aria-label='Mark all notifications as read'>
											Mark all read
										</button>
									)}
									<button
										onClick={() => setIsOpen(false)}
										className='p-1 rounded hover:bg-tertiary active:scale-95 transition-all duration-200 flex justify-center items-center hover:cursor-pointer'
										aria-label='Close notifications menu'
										type='button'>
										<FaTimes
											className='w-4 h-4 text-secondary'
											aria-hidden='true'
										/>
									</button>
								</div>
							</div>

							{/* Notifications List */}
							<div className='overflow-y-auto flex-1'>
								{loading && notifications.length === 0 ?
									<div className='divide-y divide-border'>
										{Array.from({ length: 3 }).map((_, i) => (
											<SkeletonNotificationItem key={i} />
										))}
									</div>
								: notifications.length === 0 ?
									<div className='p-8 text-center text-secondary'>
										<FaBell className='w-12 h-12 mx-auto mb-3 opacity-50' />
										<p>No notifications</p>
									</div>
								:	<div
										className='divide-y divide-border'
										role='group'
										aria-labelledby='notifications-heading'>
										{notifications.map(notification => (
											<motion.div
												key={notification.id}
												className={`p-4 hover:bg-tertiary hover:shadow-sm rounded-lg transition-all duration-200 ${
													!notification.read ? "bg-primary/50" : ""
												}`}
												initial={{ opacity: 0, x: -10 }}
												animate={{ opacity: 1, x: 0 }}
												onClick={() => handleNotificationClick(notification)}
												role='menuitem'
												tabIndex={0}
												onKeyDown={e => {
													if (e.key === "Enter" || e.key === " ") {
														e.preventDefault();
														handleNotificationClick(notification);
													}
												}}
												aria-label={`${notification.title}. ${notification.message}`}>
												<div className='flex items-start gap-3'>
													<div className='text-2xl shrink-0' aria-hidden='true'>
														{getNotificationIcon(notification.type)}
													</div>
													<div className='flex-1 min-w-0'>
														<div className='flex items-start justify-between gap-2'>
															<div className='flex-1'>
																<h4 className='font-medium text-primary'>
																	{notification.title}
																</h4>
																<p className='text-sm text-secondary mt-1'>
																	{notification.message}
																</p>
																<time
																	dateTime={notification.created_at}
																	className='text-xs text-tertiary mt-2'>
																	{new Date(
																		notification.created_at,
																	).toLocaleString()}
																</time>
															</div>
															{!notification.read && (
																<div className='w-2 h-2 bg-accent rounded-full shrink-0 mt-1' />
															)}
														</div>
														<div className='flex items-center justify-between gap-2 mt-3'>
															{!notification.read && (
																<button
																	onClick={e => {
																		e.stopPropagation();
																		handleMarkAsRead(notification.id);
																	}}
																	className='text-xs text-accent hover:underline hover:text-accent-secondary transition-all duration-200 flex items-center gap-1 hover:cursor-pointer'
																	type='button'
																	aria-label={`Mark "${notification.title}" as read`}>
																	<FaCheck
																		className='w-3 h-3'
																		aria-hidden='true'
																	/>
																	Mark as read
																</button>
															)}
															<button
																onClick={e => {
																	e.stopPropagation();
																	handleDelete(notification.id);
																}}
																className='text-xs text-tertiary hover:text-red-500 hover:bg-red-500/10 rounded px-1 py-0.5 transition-all duration-200 flex items-center gap-1 hover:cursor-pointer'
																type='button'
																aria-label={`Delete notification: ${notification.title}`}>
																<FaTrash
																	className='w-3 h-3'
																	aria-hidden='true'
																/>
																Delete
															</button>
														</div>
													</div>
												</div>
											</motion.div>
										))}
									</div>
								}
							</div>
						</motion.div>
					</>
				)}
			</AnimatePresence>
		</div>
	);
};
