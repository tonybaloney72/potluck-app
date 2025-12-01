import { useEffect, useRef } from "react";
import { useNavigate } from "react-router";
import { useAppDispatch, useAppSelector } from "../store/hooks";
import {
	fetchUserEvents,
	setCurrentEventId,
	retryFetchEvents,
	clearError,
} from "../store/slices/eventsSlice";
import {
	selectHostedEvents,
	selectAttendingEvents,
	selectInvitedEvents,
	selectEventsById,
} from "../store/selectors/eventsSelectors";
import { Button } from "../components/common/Button";
import { EventCard } from "../components/events/EventCard";
import { ErrorDisplay } from "../components/common/ErrorDisplay";
import { FaCalendarTimes } from "react-icons/fa";
import { Skeleton, SkeletonEventCard } from "../components/common/Skeleton";

export const MyEventsPage = () => {
	const navigate = useNavigate();
	const dispatch = useAppDispatch();
	const { loading, error } = useAppSelector(state => state.events);
	const eventsById = useAppSelector(selectEventsById);
	const { user } = useAppSelector(state => state.auth);
	const lastFetchedUserId = useRef<string | null>(null);

	// ✅ Use memoized selectors instead of filtering
	const hostedEvents = useAppSelector(selectHostedEvents);
	const attendingEvents = useAppSelector(selectAttendingEvents);
	const invitedEvents = useAppSelector(selectInvitedEvents);

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
		// Use setCurrentEventId instead of setCurrentEvent
		dispatch(setCurrentEventId(eventId));
		navigate(`/events/${eventId}`);
	};

	// Check if we have any events (check both old and new structures for backward compatibility)
	const hasEvents = Object.keys(eventsById).length > 0;
	const isInitialLoading = loading && !hasEvents;

	// Show error if we have an error and no events
	if (error && !hasEvents && !loading) {
		return (
			<div className='bg-secondary p-4 md:p-8'>
				<div className='max-w-7xl mx-auto'>
					<div className='flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6 md:mb-8'>
						<h1 className='text-2xl md:text-3xl font-bold text-primary'>
							My Events
						</h1>
						<Button
							onClick={() => navigate("/create-event")}
							className='w-full sm:w-auto min-h-[44px]'>
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
		<div className='bg-secondary p-4 md:p-8'>
			<div className='max-w-7xl mx-auto'>
				<div className='flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6 md:mb-8'>
					<div className='flex items-center gap-3'>
						<h1 className='text-2xl md:text-3xl font-bold text-primary'>
							My Events
						</h1>
					</div>
					<Button
						onClick={() => navigate("/create-event")}
						className='w-full sm:w-auto min-h-[44px]'>
						Create New Event
					</Button>
				</div>

				{error && hasEvents && (
					<ErrorDisplay
						message={error}
						onRetry={handleRetry}
						variant='inline'
						className='mb-4'
					/>
				)}

				{isInitialLoading ? (
					// Show skeleton loaders for all three sections during initial load
					<div className='space-y-8 md:space-y-12'>
						<div>
							<Skeleton
								variant='text'
								width='30%'
								height={28}
								className='mb-3 md:mb-4'
							/>
							<div className='grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 md:gap-6'>
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
								className='mb-3 md:mb-4'
							/>
							<div className='grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 md:gap-6'>
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
								className='mb-3 md:mb-4'
							/>
							<div className='grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 md:gap-6'>
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
