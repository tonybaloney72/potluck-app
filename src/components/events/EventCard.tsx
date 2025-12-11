import { motion } from "motion/react";
import type { Event } from "../../types";
import { EmptyState } from "../common/EmptyState";
import { SkeletonEventCard } from "../common/Skeleton";
import type { ReactNode } from "react";

interface EventCardProps {
	events: Event[];
	title: string;
	emptyStateProps?: {
		icon?: ReactNode;
		title?: string;
		message: string;
		actionLabel?: string;
		onAction?: () => void;
	};
	onEventClick: (eventId: string) => void;
	showCreator?: boolean;
	loading?: boolean;
}

export const EventCard = ({
	events,
	title,
	emptyStateProps,
	onEventClick,
	showCreator = false,
	loading = false,
}: EventCardProps) => {
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

	return (
		<div className=''>
			{title && (
				<h2 className='text-xl md:text-2xl font-semibold text-primary mb-3 md:mb-4'>
					{title}
				</h2>
			)}
			{loading ?
				<div className='grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 md:gap-6'>
					{Array.from({ length: 3 }).map((_, i) => (
						<SkeletonEventCard key={i} />
					))}
				</div>
			: events.length === 0 && emptyStateProps ?
				<EmptyState
					icon={emptyStateProps.icon}
					title={emptyStateProps.title}
					message={emptyStateProps.message}
					actionLabel={emptyStateProps.actionLabel}
					onAction={emptyStateProps.onAction}
				/>
			: events.length === 0 ?
				<p className='text-tertiary'>No events found.</p>
			:	<div className='grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 md:gap-6'>
					{events.map(event => (
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
								onClick={() => onEventClick(event.id)}
								role='button'
								tabIndex={0}
								onKeyDown={e => {
									if (e.key === "Enter" || e.key === " ") {
										e.preventDefault();
										onEventClick(event.id);
									}
								}}
								aria-label={`View event: ${event.title}`}
								className=' p-4 md:p-6 h-full w-full'>
								<h3 className='text-lg md:text-xl font-semibold text-primary mb-2'>
									{event.title}
								</h3>
								{event.theme && (
									<span className='inline-block text-xs bg-accent/20 text-primary rounded mb-2'>
										{event.theme}
									</span>
								)}
								{showCreator && event.creator && (
									<p className='text-sm text-tertiary mb-2'>
										Hosted by {event.creator.name}
									</p>
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
		</div>
	);
};
