import { useEffect, useRef, useMemo } from "react";
import { useNavigate } from "react-router";
import { useAppDispatch, useAppSelector } from "../store/hooks";
import {
	fetchUserEvents,
	retryFetchEvents,
	clearError,
} from "../store/slices/eventsSlice";
import {
	selectHostedEvents,
	selectAttendingEvents,
	selectInvitedEvents,
	selectEventsById,
} from "../store/selectors/eventsSelectors";
import { EventCard } from "../components/events/EventCard";
import { ErrorDisplay } from "../components/common/ErrorDisplay";
import {
	FaCalendarPlus,
	FaCalendarCheck,
	FaCalendarTimes,
} from "react-icons/fa";
import { Skeleton, SkeletonEventCard } from "../components/common/Skeleton";

// Helper function to get a rotating message from an array
// Uses a simple hash of user ID + category to keep it consistent per user
const getRotatingMessage = (messages: string[]): string =>
	messages[Math.floor(Math.random() * messages.length)];

// Message arrays for each category and user state
const HOSTING_MESSAGES_NEW = [
	"You have no hosted events. Get hosting!",
	"No events yet? Time to throw your first potluck!",
	"Your hosting journey starts here. Create an event!",
	"Ready to host? Let's plan your first gathering!",
	"Empty calendar? Perfect time to start hosting!",
];

const HOSTING_MESSAGES_EXPERIENCED = [
	"No events currently. Time to plan the next one!",
	"Your event calendar is clear. Ready to host again?",
	"No active events. What's the next gathering?",
	"Between events? Perfect time to plan something new!",
	"Calendar's open. Ready for your next hosting adventure?",
];

const ATTENDING_MESSAGES_NEW = [
	"You're not attending any events. Check your invites!",
	"No events on your calendar? Someone's missing out!",
	"Your social calendar is empty. Time to RSVP!",
	"Not attending anything yet? Check those invitations!",
	"Zero events? Time to get social!",
];

const ATTENDING_MESSAGES_EXPERIENCED = [
	"No events on your schedule. Check for new invites!",
	"Your calendar's free. Perfect time for a new event!",
	"No upcoming events. Someone's bound to invite you soon!",
	"Between events? Keep an eye on those invites!",
	"Calendar's clear. Ready for the next adventure?",
];

const PENDING_RSVP_MESSAGES_NEW = [
	"You have no events pending RSVP. You're so responsive!",
	"All caught up! No pending invites here.",
	"Zero pending RSVPs. You're on top of things!",
	"No pending invites. You're ahead of the game!",
	"All clear! No RSVPs waiting on you.",
];

const PENDING_RSVP_MESSAGES_EXPERIENCED = [
	"All caught up! No pending invites.",
	"You're all set. No RSVPs needed right now.",
	"Zero pending invites. You're so responsive!",
	"Nothing pending. You're staying on top of it!",
	"All clear! No RSVPs waiting for you.",
];

export const MyEventsPage = () => {
	const navigate = useNavigate();
	const dispatch = useAppDispatch();
	const { loading, error } = useAppSelector(state => state.events);
	const eventsById = useAppSelector(selectEventsById);
	const { user, profile } = useAppSelector(state => state.auth);
	const lastFetchedUserId = useRef<string | null>(null);

	// ✅ Use memoized selectors instead of filtering
	const hostedEvents = useAppSelector(selectHostedEvents);
	const attendingEvents = useAppSelector(selectAttendingEvents);
	const invitedEvents = useAppSelector(selectInvitedEvents);

	// Get rotating messages based on user activity
	const hostingMessage = useMemo(() => {
		const messages =
			profile?.has_created_event ?
				HOSTING_MESSAGES_EXPERIENCED
			:	HOSTING_MESSAGES_NEW;
		return getRotatingMessage(messages);
	}, [profile?.has_created_event]);

	const attendingMessage = useMemo(() => {
		const messages =
			profile?.has_rsvped_to_event ?
				ATTENDING_MESSAGES_EXPERIENCED
			:	ATTENDING_MESSAGES_NEW;
		return getRotatingMessage(messages);
	}, [profile?.has_rsvped_to_event]);

	const pendingRsvpMessage = useMemo(() => {
		const messages =
			profile?.has_rsvped_to_event ?
				PENDING_RSVP_MESSAGES_EXPERIENCED
			:	PENDING_RSVP_MESSAGES_NEW;
		return getRotatingMessage(messages);
	}, [profile?.has_rsvped_to_event]);

	// Get dynamic titles based on user activity
	const hostingTitle = useMemo(() => {
		return profile?.has_created_event ? "No events" : "No events yet";
	}, [profile?.has_created_event]);

	const attendingTitle = useMemo(() => {
		return profile?.has_rsvped_to_event ? "No events" : "No events yet";
	}, [profile?.has_rsvped_to_event]);

	const pendingRsvpTitle = useMemo(() => {
		return profile?.has_rsvped_to_event ? "No invitations" : (
				"No invitations yet"
			);
	}, [profile?.has_rsvped_to_event]);

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
					<div className='flex items-start sm:items-center mb-6 md:mb-8'>
						<h1 className='text-2xl md:text-3xl font-bold text-primary'>
							My Events
						</h1>
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
		<main id='main-content' className='bg-secondary p-4 md:p-8' role='main'>
			<div className='max-w-7xl mx-auto'>
				<div className='flex items-start sm:items-center mb-6 md:mb-8'>
					<h1 className='text-2xl md:text-3xl font-bold text-primary'>
						My Events
					</h1>
				</div>

				{error && hasEvents && (
					<ErrorDisplay
						message={error}
						onRetry={handleRetry}
						variant='inline'
						className='mb-4'
					/>
				)}

				{
					isInitialLoading ?
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
						// Show actual content after loading
					:	<>
							{/* Hosted Events Section */}
							<EventCard
								events={hostedEvents}
								title='Hosting'
								emptyStateProps={{
									icon: <FaCalendarPlus className='w-16 h-16' />,
									title: hostingTitle,
									message: hostingMessage,
									actionLabel: "Create Event",
									onAction: () => navigate("/create-event"),
								}}
								onEventClick={handleEventClick}
								loading={loading}
							/>

							{/* Attending Events Section */}
							<EventCard
								events={attendingEvents}
								title='Attending'
								emptyStateProps={{
									icon: <FaCalendarCheck className='w-16 h-16' />,
									title: attendingTitle,
									message: attendingMessage,
								}}
								onEventClick={handleEventClick}
								loading={loading}
							/>

							{/* Invited Events Section */}
							<EventCard
								events={invitedEvents}
								title='Pending'
								emptyStateProps={{
									icon: <FaCalendarTimes className='w-16 h-16' />,
									title: pendingRsvpTitle,
									message: pendingRsvpMessage,
								}}
								onEventClick={handleEventClick}
								loading={loading}
							/>
						</>

				}
			</div>
		</main>
	);
};
