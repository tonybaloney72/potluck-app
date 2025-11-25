import { useEffect, useRef } from "react";
import { useNavigate } from "react-router";
import { useAppDispatch, useAppSelector } from "../store/hooks";
import { fetchUserEvents, setCurrentEvent } from "../store/slices/eventsSlice";
import { Button } from "../components/common/Button";
import { EventCard } from "../components/events/EventCard";
import { FaCalendarTimes } from "react-icons/fa";

export const MyEventsPage = () => {
	const navigate = useNavigate();
	const dispatch = useAppDispatch();
	const { events, loading, refreshingEvents } = useAppSelector(
		state => state.events,
	);
	const { user } = useAppSelector(state => state.auth);
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

	if (loading) {
		return (
			<div className='flex items-center justify-center'>
				<div className='text-lg'>Loading events...</div>
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
				/>
			</div>
		</div>
	);
};
