import { useEffect, useRef, useMemo, useState } from "react";
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
	selectPastEvents,
	selectEventsById,
} from "../store/selectors/eventsSelectors";
import { EventCard } from "../components/events/EventCard";
import { ErrorDisplay } from "../components/common/ErrorDisplay";
import { Tabs, type Tab } from "../components/common/Tabs";
import {
	FaCalendarPlus,
	FaCalendarCheck,
	FaCalendarTimes,
	FaHistory,
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

type EventTab = "hosting" | "attending" | "pending" | "previous";

export const MyEventsPage = () => {
	const navigate = useNavigate();
	const dispatch = useAppDispatch();
	const { loading, error } = useAppSelector(state => state.events);
	const eventsById = useAppSelector(selectEventsById);
	const { user, profile } = useAppSelector(state => state.auth);
	const lastFetchedUserId = useRef<string | null>(null);
	const [activeTab, setActiveTab] = useState<EventTab>("hosting");

	// ✅ Use memoized selectors instead of filtering
	const hostedEvents = useAppSelector(selectHostedEvents);
	const attendingEvents = useAppSelector(selectAttendingEvents);
	const invitedEvents = useAppSelector(selectInvitedEvents);
	const pastEvents = useAppSelector(selectPastEvents);

	// Get current events based on active tab
	const currentEvents = useMemo(() => {
		switch (activeTab) {
			case "hosting":
				return hostedEvents;
			case "attending":
				return attendingEvents;
			case "pending":
				return invitedEvents;
			case "previous":
				return pastEvents;
			default:
				return [];
		}
	}, [activeTab, hostedEvents, attendingEvents, invitedEvents, pastEvents]);

	// Get tabs with counts
	const tabs: Tab[] = useMemo(
		() => [
			{
				id: "hosting",
				label: "Hosting",
				count: hostedEvents.length,
			},
			{
				id: "attending",
				label: "Attending",
				count: attendingEvents.length,
			},
			{
				id: "pending",
				label: "Pending",
				count: invitedEvents.length,
			},
			{
				id: "previous",
				label: "Previous",
				count: pastEvents.length,
			},
		],
		[
			hostedEvents.length,
			attendingEvents.length,
			invitedEvents.length,
			pastEvents.length,
		],
	);

	// Get rotating messages based on user activity and active tab
	const emptyStateMessage = useMemo(() => {
		const messages =
			activeTab === "hosting" ?
				profile?.has_created_event ?
					HOSTING_MESSAGES_EXPERIENCED
				:	HOSTING_MESSAGES_NEW
			: activeTab === "attending" ?
				profile?.has_rsvped_to_event ?
					ATTENDING_MESSAGES_EXPERIENCED
				:	ATTENDING_MESSAGES_NEW
			: activeTab === "pending" ?
				profile?.has_rsvped_to_event ?
					PENDING_RSVP_MESSAGES_EXPERIENCED
				:	PENDING_RSVP_MESSAGES_NEW
			:	[
					"No past events to show.",
					"Your event history is empty.",
					"No previous events found.",
				];
		return getRotatingMessage(messages);
	}, [activeTab, profile?.has_created_event, profile?.has_rsvped_to_event]);

	// Get dynamic titles based on user activity and active tab
	const emptyStateTitle = useMemo(() => {
		if (activeTab === "hosting") {
			return profile?.has_created_event ? "No events" : "No events yet";
		}
		if (activeTab === "attending") {
			return profile?.has_rsvped_to_event ? "No events" : "No events yet";
		}
		if (activeTab === "pending") {
			return profile?.has_rsvped_to_event ? "No invitations" : (
					"No invitations yet"
				);
		}
		return "No past events";
	}, [activeTab, profile?.has_created_event, profile?.has_rsvped_to_event]);

	// Get empty state icon based on active tab
	const emptyStateIcon = useMemo(() => {
		switch (activeTab) {
			case "hosting":
				return <FaCalendarPlus className='w-16 h-16' />;
			case "attending":
				return <FaCalendarCheck className='w-16 h-16' />;
			case "pending":
				return <FaCalendarTimes className='w-16 h-16' />;
			case "previous":
				return <FaHistory className='w-16 h-16' />;
			default:
				return <FaCalendarPlus className='w-16 h-16' />;
		}
	}, [activeTab]);

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

	const handleTabChange = (tabId: string) => {
		// Type guard to ensure tabId is a valid EventTab
		if (
			tabId === "hosting" ||
			tabId === "attending" ||
			tabId === "pending" ||
			tabId === "previous"
		) {
			setActiveTab(tabId);
		}
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
		<main id='main-content' className='bg-secondary' role='main'>
			<div className='max-w-7xl mx-auto'>
				{/* Page Header */}
				<div className='px-4 md:px-8 pt-4 md:pt-8 pb-2 md:pb-4'>
					<h1 className='text-2xl md:text-3xl font-bold text-primary'>
						My Events
					</h1>
				</div>

				{/* Tabs */}
				<Tabs tabs={tabs} activeTab={activeTab} onTabChange={handleTabChange} />

				{/* Content Area */}
				<div
					className='px-4 md:px-8 py-4 md:py-8'
					role='tabpanel'
					id={`tabpanel-${activeTab}`}
					aria-labelledby={`tab-${activeTab}`}>
					{error && hasEvents && (
						<ErrorDisplay
							message={error}
							onRetry={handleRetry}
							variant='inline'
							className='mb-4'
						/>
					)}

					{isInitialLoading ?
						// Show skeleton loader during initial load
						<div>
							<Skeleton
								variant='text'
								width='30%'
								height={28}
								className='mb-3 md:mb-4'
							/>
							<div className='grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 md:gap-6'>
								{Array.from({ length: 6 }).map((_, i) => (
									<SkeletonEventCard key={i} />
								))}
							</div>
						</div>
					:	<EventCard
							events={currentEvents}
							title=''
							emptyStateProps={{
								icon: emptyStateIcon,
								title: emptyStateTitle,
								message: emptyStateMessage,
								actionLabel:
									activeTab === "hosting" ? "Create Event" : undefined,
								onAction:
									activeTab === "hosting" ?
										() => navigate("/create-event")
									:	undefined,
							}}
							onEventClick={handleEventClick}
							loading={loading}
						/>
					}
				</div>
			</div>
		</main>
	);
};
