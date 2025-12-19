import { useEffect } from "react";
import { useParams } from "react-router";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { useAppDispatch, useAppSelector } from "../../store/hooks";
import { updateEvent } from "../../store/slices/eventsSlice";
import { selectEventById } from "../../store/selectors/eventsSelectors";
import { Button } from "../common/Button";
import { Input } from "../common/Input";
import { Textarea } from "../common/Textarea";
import { DateTime } from "../common/DateTime";
import { motion } from "motion/react";
import { RSVPButtonGroup } from "./RSVPButtonGroup";
import { Map } from "../common/Map";
import {
	generateGoogleCalendarUrl,
	downloadAppleCalendar,
} from "../../utils/calendar";
import {
	FaApple,
	FaGoogle,
	FaCheck,
	FaTimes,
	FaExternalLinkAlt,
} from "react-icons/fa";
import type { PublicRoleRestriction } from "../../types";

const locationSchema = z
	.object({
		lat: z.number(),
		lng: z.number(),
		address: z.string(),
	})
	.nullable();

const eventUpdateSchema = z
	.object({
		title: z.string().min(1, "Title is required"),
		theme: z.string().optional(),
		description: z.string().optional(),
		event_datetime: z.string().min(1, "Date and time is required"),
		end_datetime: z.string().nullable().optional(),
		location: locationSchema,
		public_role_restriction: z
			.enum([
				"guests_only",
				"guests_and_contributors_with_approval",
				"guests_and_contributors",
			])
			.optional(),
	})
	.refine(
		data => {
			// If end_datetime is provided, it must be after event_datetime
			if (data.end_datetime && data.event_datetime) {
				return new Date(data.end_datetime) > new Date(data.event_datetime);
			}
			return true;
		},
		{
			message: "End time must be after start time",
			path: ["end_datetime"],
		},
	);

type EventUpdateFormData = z.infer<typeof eventUpdateSchema>;

interface EventHeaderProps {
	isEditing: boolean;
	setIsEditing: (isEditing: boolean) => void;
}

// Utility function to format datetime
const formatDateTime = (datetimeString: string) => {
	const date = new Date(datetimeString);
	const dateStr = date.toLocaleDateString("en-US", {
		weekday: "long",
		year: "numeric",
		month: "long",
		day: "numeric",
	});
	const timeStr = date.toLocaleTimeString("en-US", {
		hour: "numeric",
		minute: "2-digit",
		hour12: true,
	});
	return { date: dateStr, time: timeStr };
};

export const EventHeader = ({ isEditing, setIsEditing }: EventHeaderProps) => {
	const { eventId } = useParams<{ eventId: string }>();
	const dispatch = useAppDispatch();

	// Get event from Redux store
	const event = useAppSelector(state =>
		eventId ? selectEventById(state, eventId) : null,
	);

	// Get current user ID
	const currentUserId = useAppSelector(state => state.auth.user?.id);

	// Get loading states
	const updatingEvent = useAppSelector(state => state.events.updatingEvent);

	// Compute current user participant
	const currentUserParticipant = event?.participants?.find(
		p => p.user_id === currentUserId,
	);

	// Early return if no event
	if (!event) {
		return null;
	}

	const eventDateTime = formatDateTime(event.event_datetime);

	// Handle event update
	const handleUpdateEvent = async (updates: {
		title?: string;
		theme?: string | null;
		description?: string | null;
		event_datetime?: string;
		end_datetime?: string | null;
		status?: "active" | "completed" | "cancelled";
		location?: {
			lat: number;
			lng: number;
			address: string;
		} | null;
		public_role_restriction?: PublicRoleRestriction;
	}) => {
		if (!eventId) return;
		await dispatch(updateEvent({ eventId, updates }));
	};

	const eventUpdateForm = useForm<EventUpdateFormData>({
		resolver: zodResolver(eventUpdateSchema),
		defaultValues: {
			title: event.title,
			theme: event.theme || "",
			description: event.description || "",
			event_datetime: event.event_datetime,
			end_datetime: event.end_datetime || null,
			location: event.location || null,
			public_role_restriction: event.public_role_restriction || "guests_only",
		},
	});

	const eventStartDateTime = eventUpdateForm.watch("event_datetime");

	useEffect(() => {
		if (!isEditing) {
			eventUpdateForm.reset({
				title: event.title,
				theme: event.theme || "",
				description: event.description || "",
				event_datetime: event.event_datetime,
				end_datetime: event.end_datetime || null,
				location: event.location || null,
				public_role_restriction: event.public_role_restriction || "guests_only",
			});
		}
	}, [
		isEditing,
		event.id,
		event.title,
		event.theme,
		event.description,
		event.event_datetime,
		event.end_datetime,
		event.location,
		event.public_role_restriction,
	]);

	const handleCancel = () => {
		setIsEditing(false);
		eventUpdateForm.reset();
	};

	const handleSubmit = async (data: EventUpdateFormData) => {
		try {
			await handleUpdateEvent({
				title: data.title,
				theme: data.theme || null,
				description: data.description || null,
				event_datetime: data.event_datetime,
				end_datetime: data.end_datetime || null,
				location: data.location || null,
				public_role_restriction:
					event.is_public ? data.public_role_restriction : undefined,
			});
		} catch (error) {
			console.error("Failed to update event:", error);
		}
		setIsEditing(false);
	};

	const openMapInNewTab = () => {
		window.open(
			`https://maps.google.com/?q=${encodeURIComponent(event?.location?.address || "")}`,
			"_blank",
		);
	};

	return (
		<motion.div
			initial={{ opacity: 0, y: 20 }}
			animate={{ opacity: 1, y: 0 }}
			className='bg-primary rounded-lg shadow-md p-4 md:p-6 mb-6'>
			<div className='flex flex-col justify-between items-start gap-4 mb-4'>
				{isEditing ?
					<div className='space-y-2 mb-2 w-full'>
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
						<DateTime
							control={eventUpdateForm.control}
							name='event_datetime'
							label='Event Start Date & Time'
							error={eventUpdateForm.formState.errors.event_datetime}
							required
						/>
						<DateTime
							control={eventUpdateForm.control}
							name='end_datetime'
							label='Event End Date & Time (optional)'
							error={eventUpdateForm.formState.errors.end_datetime}
							minDate={
								eventStartDateTime ? new Date(eventStartDateTime) : undefined
							}
							optional={true}
						/>
					</div>
				:	<>
						<div className='flex flex-col md:flex-row justify-between items-start md:items-center w-full'>
							<h1 className='text-2xl md:text-3xl font-bold text-primary'>
								{event.title}
							</h1>
							{event.creator && (
								<div className='md:text-right text-left'>
									<p className='text-sm text-tertiary'>Hosted by</p>
									<p className='font-semibold text-primary'>
										{event.creator.name}
									</p>
								</div>
							)}
						</div>
						<div className='flex flex-col md:flex-row justify-between w-full'>
							{event.theme && (
								<div className='mt-2'>
									<p className='text-sm text-tertiary'>Theme</p>
									<span className='text-primary'>{event.theme}</span>
								</div>
							)}
							<div className='mt-2'>
								<p className='text-sm text-tertiary'>Date & Time</p>
								<p className='text-primary'>
									{eventDateTime.date} at {eventDateTime.time}
									{event.end_datetime && (
										<>
											{" - "}
											{formatDateTime(event.end_datetime).date} at{" "}
											{formatDateTime(event.end_datetime).time}
										</>
									)}
								</p>
							</div>
							{event.status && event.status !== "active" && (
								<div className='mt-2'>
									<p className='text-sm text-tertiary'>Status</p>
									<p className='text-primary capitalize'>{event.status}</p>
								</div>
							)}
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

			{isEditing ?
				<div className='space-y-4'>
					<Map
						label='Location'
						onLocationSelect={location => {
							eventUpdateForm.setValue("location", location, {
								shouldValidate: true,
								shouldDirty: true,
							});
						}}
						selectedLocation={eventUpdateForm.watch("location")}
					/>

					{/* Public Role Restriction (only for public events) */}
					{event.is_public && (
						<div>
							<label className='block text-sm font-medium text-primary mb-2'>
								Who can join this event? *
							</label>
							<div className='space-y-2'>
								<label className='flex items-center gap-3 p-3 border border-border rounded-md cursor-pointer hover:bg-tertiary transition-colors'>
									<input
										type='radio'
										{...eventUpdateForm.register("public_role_restriction")}
										value='guests_only'
										className='mt-1'
									/>
									<div className='flex-1'>
										<div className='font-medium text-primary'>Guests only</div>
										<div className='text-sm text-secondary'>
											Only guests can join. Perfect for events like movie nights
											or casual gatherings.
										</div>
									</div>
								</label>
								<label className='flex items-center gap-3 p-3 border border-border rounded-md cursor-pointer hover:bg-tertiary transition-colors'>
									<input
										type='radio'
										{...eventUpdateForm.register("public_role_restriction")}
										value='guests_and_contributors_with_approval'
										className='mt-1'
									/>
									<div className='flex-1'>
										<div className='font-medium text-primary'>
											Guests and Contributors (with approval)
										</div>
										<div className='text-sm text-secondary'>
											Anyone can join as a guest. Contributors need your
											approval before they can add items.
										</div>
									</div>
								</label>
								<label className='flex items-center gap-3 p-3 border border-border rounded-md cursor-pointer hover:bg-tertiary transition-colors'>
									<input
										type='radio'
										{...eventUpdateForm.register("public_role_restriction")}
										value='guests_and_contributors'
										className='mt-1'
									/>
									<div className='flex-1'>
										<div className='font-medium text-primary'>
											Guests and Contributors
										</div>
										<div className='text-sm text-secondary'>
											Anyone can join as a guest or contributor. Perfect for
											block party potlucks and community events.
										</div>
									</div>
								</label>
							</div>
							{eventUpdateForm.formState.errors.public_role_restriction && (
								<p className='text-sm text-red-500 mt-1'>
									{
										eventUpdateForm.formState.errors.public_role_restriction
											.message
									}
								</p>
							)}
						</div>
					)}
				</div>
			:	event.location && (
					<div className='space-y-4'>
						<div>
							<p className='text-tertiary'>Location</p>
							<p
								className='font-semibold text-primary underline cursor-pointer flex items-center gap-2 hover:text-accent transition-all duration-200'
								onClick={openMapInNewTab}>
								{event.location.address}
								<FaExternalLinkAlt />
							</p>
						</div>
						<Map
							initialLocation={event.location}
							height='300px'
							canSearch={false}
						/>
					</div>
				)
			}

			{/* Mark as Complete Button (for hosts, when event is active) */}
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
						Discard Changes
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
				<div className='flex flex-col md:flex-row gap-4 justify-between w-full mt-3 md:mt-6 pt-3 md:pt-6 border-t border-border'>
					<div>
						<p className='text-sm font-medium text-primary mb-2'>
							Your RSVP Status:{" "}
							<span className='capitalize'>
								{currentUserParticipant.rsvp_status}
							</span>
						</p>
						<RSVPButtonGroup />
					</div>
					<div className='flex flex-col'>
						<p className='text-sm font-medium text-primary mb-2'>
							Add to Calendar
						</p>
						<div className='flex gap-2 items-center'>
							<a
								href={generateGoogleCalendarUrl(event)}
								target='_blank'
								rel='noopener noreferrer'
								className='flex items-center gap-2 px-3 py-2 bg-accent hover:bg-accent-secondary hover:shadow-md active:scale-[0.98] text-white rounded-md text-sm transition-all duration-200 min-h-[44px]'>
								<FaGoogle className='w-4 h-4' />
								<span className='block'>Google</span>
							</a>
							<button
								onClick={() => downloadAppleCalendar(event)}
								className='flex items-center gap-2 px-3 py-2 bg-tertiary hover:bg-secondary hover:shadow-md active:scale-[0.98] text-primary rounded-md text-sm transition-all duration-200 cursor-pointer min-h-[44px]'>
								<FaApple className='w-4 h-4' />
								<span className='block'>Apple</span>
							</button>
						</div>
					</div>
				</div>
			)}
		</motion.div>
	);
};
