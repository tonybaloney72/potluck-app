import { motion } from "motion/react";
import type { Event } from "../../types";

interface EventCardProps {
	events: Event[];
	title: string;
	emptyMessage: string;
	onEventClick: (eventId: string) => void;
	showCreator?: boolean;
}

export const EventCard = ({
	events,
	title,
	emptyMessage,
	onEventClick,
	showCreator = false,
}: EventCardProps) => {
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

	return (
		<div className='mb-12'>
			<h2 className='text-2xl font-semibold text-primary mb-4'>{title}</h2>
			{events.length === 0 ? (
				<p className='text-tertiary'>{emptyMessage}</p>
			) : (
				<div className='grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6'>
					{events.map(event => (
						<motion.div
							key={event.id}
							initial={{ opacity: 0, y: 20 }}
							animate={{ opacity: 1, y: 0 }}
							className='bg-primary rounded-lg shadow-md p-6 cursor-pointer hover:shadow-lg transition-shadow'
							onClick={() => onEventClick(event.id)}>
							<h3 className='text-xl font-semibold text-primary mb-2'>
								{event.title}
							</h3>
							{event.theme && (
								<span className='inline-block px-2 py-1 text-xs bg-accent/20 text-accent rounded mb-2'>
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
							<div className='space-y-1 text-sm text-tertiary'>
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
	);
};
