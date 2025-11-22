import { useEffect, useState, useRef } from "react";
import { useNavigate } from "react-router";
import { useAppDispatch, useAppSelector } from "../store/hooks";
import { fetchUserEvents, setCurrentEvent } from "../store/slices/eventsSlice";
import { motion } from "motion/react";
import { Button } from "../components/common/Button";
import { CreateEventModal } from "../components/events/CreateEventModal";

export const MyEventsPage = () => {
	const navigate = useNavigate();
	const dispatch = useAppDispatch();
	const { events, loading } = useAppSelector(state => state.events);
	const { user } = useAppSelector(state => state.auth);
	const [showCreateModal, setShowCreateModal] = useState(false);
	const lastFetchedUserId = useRef<string | null>(null);

	useEffect(() => {
		// Only fetch if:
		// 1. User exists
		// 2. We haven't fetched for this user yet OR user ID changed
		// 3. We're not already loading
		if (user?.id && lastFetchedUserId.current !== user.id && !loading) {
			lastFetchedUserId.current = user.id;
			dispatch(fetchUserEvents());
		}
	}, [dispatch, user?.id, loading]);

	const handleEventClick = (eventId: string) => {
		dispatch(setCurrentEvent(null)); // Clear current event first
		navigate(`/events/${eventId}`);
	};

	const formatDate = (dateString: string) => {
		const date = new Date(dateString);
		return date.toLocaleDateString("en-US", {
			weekday: "short",
			year: "numeric",
			month: "short",
			day: "numeric",
		});
	};

	const formatTime = (timeString: string) => {
		// timeString is in HH:mm format
		const [hours, minutes] = timeString.split(":");
		const hour = parseInt(hours);
		const ampm = hour >= 12 ? "PM" : "AM";
		const displayHour = hour % 12 || 12;
		return `${displayHour}:${minutes} ${ampm}`;
	};

	// Separate events into hosted and invited
	const hostedEvents = events.filter(e => e.created_by === user?.id);
	const invitedEvents = events.filter(e => e.created_by !== user?.id);

	if (loading) {
		return (
			<div className='min-h-screen flex items-center justify-center'>
				<div className='text-lg'>Loading events...</div>
			</div>
		);
	}

	return (
		<div className='min-h-screen bg-gray-50 dark:bg-gray-900 p-8'>
			<div className='max-w-7xl mx-auto'>
				<div className='flex justify-between items-center mb-8'>
					<h1 className='text-3xl font-bold text-gray-900 dark:text-white'>
						My Events
					</h1>
					<Button onClick={() => setShowCreateModal(true)}>
						Create New Event
					</Button>
				</div>

				{/* Hosted Events Section */}
				<div className='mb-12'>
					<h2 className='text-2xl font-semibold text-gray-800 dark:text-gray-200 mb-4'>
						Events I'm Hosting
					</h2>
					{hostedEvents.length === 0 ? (
						<p className='text-gray-600 dark:text-gray-400'>
							You're not hosting any events yet.
						</p>
					) : (
						<div className='grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6'>
							{hostedEvents.map(event => (
								<motion.div
									key={event.id}
									initial={{ opacity: 0, y: 20 }}
									animate={{ opacity: 1, y: 0 }}
									className='bg-white dark:bg-gray-800 rounded-lg shadow-md p-6 cursor-pointer hover:shadow-lg transition-shadow'
									onClick={() => handleEventClick(event.id)}>
									<h3 className='text-xl font-semibold text-gray-900 dark:text-white mb-2'>
										{event.title}
									</h3>
									{event.theme && (
										<span className='inline-block px-2 py-1 text-xs bg-blue-100 dark:bg-blue-900 text-blue-800 dark:text-blue-200 rounded mb-2'>
											{event.theme}
										</span>
									)}
									<p className='text-gray-600 dark:text-gray-400 mb-4 line-clamp-2'>
										{event.description || "No description"}
									</p>
									<div className='space-y-1 text-sm text-gray-500 dark:text-gray-400'>
										<p>
											📅 {formatDate(event.event_date)} at{" "}
											{formatTime(event.event_time)}
										</p>
										{event.location && (
											<p className='truncate'>📍 {event.location}</p>
										)}
									</div>
								</motion.div>
							))}
						</div>
					)}
				</div>

				{/* Invited Events Section */}
				<div>
					<h2 className='text-2xl font-semibold text-gray-800 dark:text-gray-200 mb-4'>
						Events I'm Invited To
					</h2>
					{invitedEvents.length === 0 ? (
						<p className='text-gray-600 dark:text-gray-400'>
							You haven't been invited to any events yet.
						</p>
					) : (
						<div className='grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6'>
							{invitedEvents.map(event => (
								<motion.div
									key={event.id}
									initial={{ opacity: 0, y: 20 }}
									animate={{ opacity: 1, y: 0 }}
									className='bg-white dark:bg-gray-800 rounded-lg shadow-md p-6 cursor-pointer hover:shadow-lg transition-shadow'
									onClick={() => handleEventClick(event.id)}>
									<h3 className='text-xl font-semibold text-gray-900 dark:text-white mb-2'>
										{event.title}
									</h3>
									{event.theme && (
										<span className='inline-block px-2 py-1 text-xs bg-blue-100 dark:bg-blue-900 text-blue-800 dark:text-blue-200 rounded mb-2'>
											{event.theme}
										</span>
									)}
									{event.creator && (
										<p className='text-sm text-gray-500 dark:text-gray-400 mb-2'>
											Hosted by {event.creator.name}
										</p>
									)}
									<p className='text-gray-600 dark:text-gray-400 mb-4 line-clamp-2'>
										{event.description || "No description"}
									</p>
									<div className='space-y-1 text-sm text-gray-500 dark:text-gray-400'>
										<p>
											📅 {formatDate(event.event_date)} at{" "}
											{formatTime(event.event_time)}
										</p>
										{event.location && (
											<p className='truncate'>📍 {event.location}</p>
										)}
									</div>
								</motion.div>
							))}
						</div>
					)}
				</div>
			</div>

			{/* Create Event Modal - We'll implement this in the next step */}
			{showCreateModal && (
				<CreateEventModal
					onClose={() => setShowCreateModal(false)}
					onSuccess={() => {
						setShowCreateModal(false);
						dispatch(fetchUserEvents());
					}}
				/>
			)}
		</div>
	);
};
