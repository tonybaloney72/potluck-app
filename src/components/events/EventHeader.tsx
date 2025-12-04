import { useEffect } from "react";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { Button } from "../common/Button";
import { Input } from "../common/Input";
import { Textarea } from "../common/Textarea";
import { DateTime } from "../common/DateTime";
import { motion } from "motion/react";
import { RSVPButtonGroup } from "./RSVPButtonGroup";
import {
	generateGoogleCalendarUrl,
	downloadAppleCalendar,
} from "../../utils/calendar";
import { FaApple, FaGoogle, FaCheck, FaTimes } from "react-icons/fa";
import type { Event, EventParticipant, RSVPStatus } from "../../types";

const eventUpdateSchema = z.object({
	title: z.string().min(1, "Title is required"),
	theme: z.string().optional(),
	description: z.string().optional(),
	event_datetime: z.string().min(1, "Date and time is required"),
	location: z.string().optional(),
	location_url: z
		.string()
		.url("Must be a valid URL")
		.optional()
		.or(z.literal("")),
});

type EventUpdateFormData = z.infer<typeof eventUpdateSchema>;

interface EventHeaderProps {
	event: Event;
	currentUserParticipant: EventParticipant | undefined;
	onRSVPChange: (status: RSVPStatus) => void;
	updatingRSVP: RSVPStatus | null;
	formatDateTime: (datetimeString: string) => { date: string; time: string };
	canEdit: boolean;
	onUpdateEvent: (updates: {
		title?: string;
		theme?: string | null;
		description?: string | null;
		event_datetime?: string;
		location?: string | null;
		location_url?: string | null;
	}) => Promise<void>;
	updatingEvent: boolean;
	isEditing: boolean;
	setIsEditing: (isEditing: boolean) => void;
}

export const EventHeader = ({
	event,
	currentUserParticipant,
	onRSVPChange,
	updatingRSVP,
	formatDateTime,
	onUpdateEvent,
	updatingEvent,
	isEditing,
	setIsEditing,
}: EventHeaderProps) => {
	const eventDateTime = formatDateTime(event.event_datetime);

	const eventUpdateForm = useForm<EventUpdateFormData>({
		resolver: zodResolver(eventUpdateSchema),
		defaultValues: {
			title: event.title,
			theme: event.theme || "",
			description: event.description || "",
			event_datetime: event.event_datetime,
			location: event.location || "",
			location_url: event.location_url || "",
		},
	});

	useEffect(() => {
		if (!isEditing) {
			eventUpdateForm.reset({
				title: event.title,
				theme: event.theme || "",
				description: event.description || "",
				event_datetime: event.event_datetime,
				location: event.location || "",
				location_url: event.location_url || "",
			});
		}
	}, [
		isEditing,
		event.id,
		event.title,
		event.theme,
		event.description,
		event.event_datetime,
		event.location,
		event.location_url,
	]);

	const handleCancel = () => {
		setIsEditing(false);
		eventUpdateForm.reset();
	};

	const handleSubmit = async (data: EventUpdateFormData) => {
		try {
			await onUpdateEvent({
				title: data.title,
				theme: data.theme || null,
				description: data.description || null,
				event_datetime: data.event_datetime,
				location: data.location || null,
				location_url: data.location_url || null,
			});
		} catch (error) {
			console.error("Failed to update event:", error);
		}
		setIsEditing(false);
	};

	return (
		<motion.div
			initial={{ opacity: 0, y: 20 }}
			animate={{ opacity: 1, y: 0 }}
			className='bg-primary rounded-lg shadow-md p-4 md:p-6 mb-6'>
			<div className='flex flex-col justify-between items-start gap-4 mb-4'>
				{isEditing ?
					<div className='space-y-2 mb-2'>
						<Input
							label='Event Title *'
							{...eventUpdateForm.register("title")}
							error={eventUpdateForm.formState.errors.title?.message}
							helperText='Give your event a memorable name'
							maxLength={100}
							showCharacterCount={true}
							className='mb-2'
						/>
						<Input
							label='Theme (optional)'
							{...eventUpdateForm.register("theme")}
							placeholder='e.g., Summer BBQ, Holiday Party'
							helperText='Add a theme to help set the tone'
							maxLength={50}
							showCharacterCount={true}
						/>
					</div>
				:	<>
						<div className='flex justify-between items-center w-full'>
							<h1 className='text-2xl md:text-3xl font-bold text-primary mb-2'>
								{event.title}
							</h1>
							{event.creator && (
								<div className='text-left sm:text-right'>
									<p className='text-sm text-tertiary'>Hosted by</p>
									<p className='font-semibold text-primary'>
										{event.creator.name}
									</p>
								</div>
							)}
						</div>
						<div className='flex justify-between items-center w-full'>
							{event.theme && (
								<div className='mt-2'>
									<p className='text-sm text-tertiary'>Theme</p>
									<span className='text-primary'>{event.theme}</span>
								</div>
							)}
							<div className='flex flex-wrap gap-2 items-center'>
								<a
									href={generateGoogleCalendarUrl(event)}
									target='_blank'
									rel='noopener noreferrer'
									className='flex items-center gap-2 px-3 py-2 bg-accent-secondary hover:bg-accent hover:shadow-md active:scale-[0.98] text-white rounded-md text-sm transition-all duration-200 min-h-[44px]'>
									<FaGoogle className='w-4 h-4' />
									<span className='hidden md:block'>Google</span>
								</a>
								<button
									onClick={() => downloadAppleCalendar(event)}
									className='flex items-center gap-2 px-3 py-2 bg-tertiary hover:bg-secondary hover:shadow-md active:scale-[0.98] text-primary rounded-md text-sm transition-all duration-200 cursor-pointer min-h-[44px]'>
									<FaApple className='w-4 h-4' />
									<span className='hidden md:block'>Apple</span>
								</button>
							</div>
						</div>
					</>
				}
			</div>

			{/* Description */}
			{isEditing ?
				<Textarea
					label='Description'
					{...eventUpdateForm.register("description")}
					error={eventUpdateForm.formState.errors.description?.message}
					placeholder='Describe your event...'
					rows={4}
					showCharacterCount={true}
					maxLength={500}
				/>
			:	event.description && (
					<div className='mb-4'>
						<p className='text-sm text-tertiary'>Description</p>
						<p className='text-primary'>{event.description}</p>
					</div>
				)
			}

			{/* Date & Time */}
			{isEditing ?
				<div className='space-y-4'>
					<DateTime
						control={eventUpdateForm.control}
						name='event_datetime'
						label='Event Date & Time *'
						error={eventUpdateForm.formState.errors.event_datetime}
						required
					/>
					<Input
						label='Location'
						{...eventUpdateForm.register("location")}
						placeholder='e.g., Central Park, New York'
					/>
					{/* <Input
						label='Location URL (optional)'
						{...eventUpdateForm.register("location_url")}
						placeholder='https://maps.google.com/...'
						type='url'
						error={eventUpdateForm.formState.errors.location_url?.message}
					/> */}
				</div>
			:	<div className='grid grid-cols-1 md:grid-cols-2 gap-4 text-sm'>
					<div>
						<p className='text-tertiary'>Date & Time</p>
						<p className='font-semibold text-primary'>
							{eventDateTime.date} at {eventDateTime.time}
						</p>
					</div>
					{event.location && (
						<div>
							<p className='text-tertiary'>Location</p>
							{event.location_url ?
								<a
									href={event.location_url}
									target='_blank'
									rel='noopener noreferrer'
									className='font-semibold text-accent hover:text-accent-secondary hover:underline transition-all duration-200'>
									{event.location} →
								</a>
							:	<p className='font-semibold text-primary'>{event.location}</p>}
						</div>
					)}
				</div>
			}

			{/* Save/Cancel Buttons */}
			{isEditing && (
				<div className='flex flex-col sm:flex-row justify-end gap-2 mt-4 pt-4 border-t border-border'>
					<Button
						className='flex items-center justify-center gap-2 w-full sm:w-auto min-h-[44px]'
						type='button'
						variant='secondary'
						onClick={handleCancel}
						disabled={updatingEvent}>
						<FaTimes />
						Cancel
					</Button>
					<Button
						className='flex items-center justify-center gap-2 w-full sm:w-auto min-h-[44px]'
						type='button'
						onClick={eventUpdateForm.handleSubmit(handleSubmit)}
						loading={updatingEvent}
						disabled={updatingEvent}>
						<FaCheck />
						Save Changes
					</Button>
				</div>
			)}

			{/* RSVP Button Group */}
			{currentUserParticipant && !isEditing && (
				<div className='mt-3 md:mt-6 pt-3 md:pt-6 border-t border-border'>
					<p className='text-sm font-medium text-primary mb-2'>
						Your RSVP Status:{" "}
						<span className='capitalize'>
							{currentUserParticipant.rsvp_status}
						</span>
					</p>
					<RSVPButtonGroup
						currentStatus={currentUserParticipant.rsvp_status}
						onRSVPChange={onRSVPChange}
						updatingRSVP={updatingRSVP}
					/>
				</div>
			)}
		</motion.div>
	);
};
