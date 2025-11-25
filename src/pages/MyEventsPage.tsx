import { useEffect, useRef } from "react";
import { useNavigate } from "react-router";
import { useAppDispatch, useAppSelector } from "../store/hooks";
import {
	fetchUserEvents,
	setCurrentEvent,
	retryFetchEvents,
	clearError,
} from "../store/slices/eventsSlice";
import { Button } from "../components/common/Button";
import { EventCard } from "../components/events/EventCard";
import { ErrorDisplay } from "../components/common/ErrorDisplay";
import { FaCalendarTimes } from "react-icons/fa";
import { Skeleton, SkeletonEventCard } from "../components/common/Skeleton";

export const MyEventsPage = () => {
	const navigate = useNavigate();
	const dispatch = useAppDispatch();
	const { events, loading, refreshingEvents, error } = useAppSelector(
		state => state.events,
	);
	const { user } = useAppSelector(state => state.auth);
	const lastFetchedUserId = useRef<string | null>(null);

	const handleRetry = () => {
		dispatch(clearError());
		dispatch(retryFetchEvents());
	};

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

	// Separate events into hosted, attending, and invited
	const hostedEvents = events.filter(e => e.created_by === user?.id);

	// Events where user has RSVP'd "going"
	const attendingEvents = events.filter(e => {
		if (e.created_by === user?.id) return false; // Don't include hosted events
		const userParticipant = e.participants?.find(p => p.user_id === user?.id);
		return userParticipant?.rsvp_status === "going";
	});

	// Events where user is invited but hasn't RSVP'd "going"
	// (includes "maybe", "not_going", or "pending")
	const invitedEvents = events.filter(e => {
		if (e.created_by === user?.id) return false; // Don't include hosted events
		const userParticipant = e.participants?.find(p => p.user_id === user?.id);
		return userParticipant && userParticipant.rsvp_status !== "going";
	});

	const isInitialLoading = loading && events.length === 0;

	// Show error if we have an error and no events
	if (error && events.length === 0 && !loading) {
		return (
			<div className='bg-secondary p-8'>
				<div className='max-w-7xl mx-auto'>
					<div className='flex justify-between items-center mb-8'>
						<h1 className='text-3xl font-bold text-primary'>My Events</h1>
						<Button onClick={() => navigate("/create-event")}>
							Create New Event
						</Button>
					</div>
					<ErrorDisplay
						title='Failed to load events'
						message={error}
						onRetry={handleRetry}
						variant='block'
					/>
				</div>
			</div>
		);
	}

	return (
		<div className='bg-secondary p-8'>
			<div className='max-w-7xl mx-auto'>
				<div className='flex justify-between items-center mb-8'>
					<div className='flex items-center gap-3'>
						<h1 className='text-3xl font-bold text-primary'>My Events</h1>
						{refreshingEvents && (
							<div className='text-sm text-tertiary'>Refreshing...</div>
						)}
					</div>
					<Button onClick={() => navigate("/create-event")}>
						Create New Event
					</Button>
				</div>

				{error && events.length > 0 && (
					<ErrorDisplay
						message={error}
						onRetry={handleRetry}
						variant='inline'
						className='mb-4'
					/>
				)}

				{isInitialLoading ? (
					// Show skeleton loaders for all three sections during initial load
					<div className='space-y-12'>
						<div>
							<Skeleton
								variant='text'
								width='30%'
								height={28}
								className='mb-4'
							/>
							<div className='grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6'>
								{Array.from({ length: 3 }).map((_, i) => (
									<SkeletonEventCard key={i} />
								))}
							</div>
						</div>
						<div>
							<Skeleton
								variant='text'
								width='30%'
								height={28}
								className='mb-4'
							/>
							<div className='grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6'>
								{Array.from({ length: 2 }).map((_, i) => (
									<SkeletonEventCard key={i} />
								))}
							</div>
						</div>
						<div>
							<Skeleton
								variant='text'
								width='30%'
								height={28}
								className='mb-4'
							/>
							<div className='grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6'>
								{Array.from({ length: 2 }).map((_, i) => (
									<SkeletonEventCard key={i} />
								))}
							</div>
						</div>
					</div>
				) : (
					// Show actual content after loading
					<>
						{/* Hosted Events Section */}
						<EventCard
							events={hostedEvents}
							title="Events I'm Hosting"
							emptyStateProps={{
								icon: <FaCalendarTimes className='w-16 h-16' />,
								title: "No events yet",
								message:
									"You're not hosting any events yet. Create your first event to get started!",
								actionLabel: "Create Event",
								onAction: () => navigate("/create-event"),
							}}
							onEventClick={handleEventClick}
							loading={loading}
						/>

						{/* Attending Events Section */}
						<EventCard
							events={attendingEvents}
							title="Events I'm Attending"
							emptyStateProps={{
								icon: <FaCalendarTimes className='w-16 h-16' />,
								title: "No events yet",
								message:
									"You're not attending any events yet. Check your invitations or browse upcoming events!",
							}}
							onEventClick={handleEventClick}
							loading={loading}
						/>

						{/* Invited Events Section */}
						<EventCard
							events={invitedEvents}
							title="Events I'm Invited To"
							emptyStateProps={{
								icon: <FaCalendarTimes className='w-16 h-16' />,
								title: "No invitations yet",
								message:
									"You haven't received any event invitations yet. Share events with friends to invite them!",
							}}
							onEventClick={handleEventClick}
							loading={loading}
						/>
					</>
				)}
			</div>
		</div>
	);
};
