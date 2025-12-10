import { useEffect } from "react";
import { useNavigate } from "react-router";
import { useAppDispatch, useAppSelector } from "../store/hooks";
import { fetchUserEvents } from "../store/slices/eventsSlice";
import {
	selectEventsById,
	selectUpcomingEventsLimited,
} from "../store/selectors/eventsSelectors";
import { Button } from "../components/common/Button";
import { SkeletonEventCard } from "../components/common/Skeleton";
import { motion } from "motion/react";

export const HomePage = () => {
	const navigate = useNavigate();
	const dispatch = useAppDispatch();
	const { loading } = useAppSelector(state => state.events);
	const { user } = useAppSelector(state => state.auth);
	const eventsById = useAppSelector(selectEventsById);

	// Get upcoming events (limited to 3) - business logic is in the selector
	const upcomingEvents = useAppSelector(state =>
		selectUpcomingEventsLimited(state, 3),
	);

	// Fetch events on mount if needed
	useEffect(() => {
		if (user?.id && Object.keys(eventsById).length === 0 && !loading) {
			dispatch(fetchUserEvents());
		}
	}, [dispatch, user?.id, eventsById, loading]);

	const formatDateTime = (datetimeString: string) => {
		const date = new Date(datetimeString);
		const dateStr = date.toLocaleDateString("en-US", {
			weekday: "short",
			year: "numeric",
			month: "short",
			day: "numeric",
		});
		const timeStr = date.toLocaleTimeString("en-US", {
			hour: "numeric",
			minute: "2-digit",
			hour12: true,
		});
		return { date: dateStr, time: timeStr };
	};

	const handleEventClick = (eventId: string) => {
		navigate(`/events/${eventId}`);
	};

	const isInitialLoading = loading && Object.keys(eventsById).length === 0;

	return (
		<main id='main-content' className='bg-secondary p-4 md:p-8' role='main'>
			<div className='max-w-7xl mx-auto'>
				{/* Upcoming Events Section */}
				<section
					className='mb-8 md:mb-12'
					aria-labelledby='upcoming-events-heading'>
					<div className='flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-4 md:mb-6'>
						<h2
							id='upcoming-events-heading'
							className='text-xl md:text-2xl font-semibold text-primary'>
							Upcoming Events
						</h2>
						{upcomingEvents.length > 0 && (
							<Button
								variant='secondary'
								onClick={() => navigate("/events")}
								className='w-full sm:w-auto min-h-[44px]'>
								View More...
							</Button>
						)}
					</div>

					{isInitialLoading ?
						<div className='grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 md:gap-6'>
							{Array.from({ length: 3 }).map((_, i) => (
								<SkeletonEventCard key={i} />
							))}
						</div>
					: upcomingEvents.length === 0 ?
						<div className='bg-primary rounded-lg p-6 md:p-8 text-center'>
							<p className='text-tertiary mb-4'>
								No upcoming events. Check your invitations or create a new
								event!
							</p>
							<Button onClick={() => navigate("/create-event")}>
								Create Event
							</Button>
						</div>
					:	<div className='grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 md:gap-6'>
							{upcomingEvents.map(event => (
								<article
									key={event.id}
									className='bg-primary rounded-lg shadow-md cursor-pointer hover:shadow-xl hover:bg-tertiary transition-all duration-200 flex flex-col min-h-[44px]'>
									<motion.div
										initial={{ opacity: 0, y: 20 }}
										animate={{ opacity: 1, y: 0 }}
										whileHover={{
											y: -4,
											transition: { duration: 0.2 },
										}}
										whileTap={{
											scale: 0.98,
											transition: { duration: 0.1 },
										}}
										onClick={() => handleEventClick(event.id)}
										role='button'
										tabIndex={0}
										onKeyDown={e => {
											if (e.key === "Enter" || e.key === " ") {
												e.preventDefault();
												handleEventClick(event.id);
											}
										}}
										aria-label={`View event: ${event.title}`}
										className='p-4 md:p-6 h-full w-full'>
										<h3 className='text-lg md:text-xl font-semibold text-primary mb-2'>
											{event.title}
										</h3>
										{event.theme && (
											<span className='inline-block text-xs bg-accent/20 text-primary rounded mb-2'>
												{event.theme}
											</span>
										)}
										<p className='text-secondary mb-4 line-clamp-2'>
											{event.description || "No description"}
										</p>
										<div className='space-y-1 text-sm text-tertiary mt-auto'>
											<p>
												<span aria-hidden='true'>📅</span>{" "}
												<time dateTime={event.event_datetime}>
													{(() => {
														const { date, time } = formatDateTime(
															event.event_datetime,
														);
														return `${date} at ${time}`;
													})()}
												</time>
											</p>
											{event.location && (
												<p className='truncate'>
													<span aria-hidden='true'>📍</span>{" "}
													<span>{event.location.address}</span>
												</p>
											)}
										</div>
									</motion.div>
								</article>
							))}
						</div>
					}
				</section>

				{/* Local Public Events Section - Placeholder */}
				<section
					className='mb-8 md:mb-12'
					aria-labelledby='local-events-heading'>
					<div className='flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-4 md:mb-6'>
						<h2
							id='local-events-heading'
							className='text-xl md:text-2xl font-semibold text-primary'>
							Nearby Events
						</h2>
						<Button
							variant='secondary'
							onClick={() => navigate("/browse")}
							className='w-full sm:w-auto min-h-[44px]'
							disabled>
							View More...
						</Button>
					</div>
					<div className='bg-primary rounded-lg p-6 md:p-8 text-center'>
						<p className='text-tertiary'>
							Local event discovery coming soon! Browse public events in your
							area.
						</p>
					</div>
				</section>
			</div>
		</main>
	);
};
