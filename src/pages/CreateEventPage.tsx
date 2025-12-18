import { useState } from "react";
import { useForm } from "react-hook-form";
import { useNavigate, useSearchParams } from "react-router";
import { useAppDispatch } from "../store/hooks";
import { createEvent } from "../store/slices/eventsSlice";
import { Button } from "../components/common/Button";
import { Input } from "../components/common/Input";
import { Textarea } from "../components/common/Textarea";
import { DateTime } from "../components/common/DateTime";
import {
	FriendSelector,
	type SelectedFriend,
} from "../components/common/FriendSelector";
import { ErrorDisplay } from "../components/common/ErrorDisplay";
import { Map } from "../components/common/Map";
import { FaArrowLeft } from "react-icons/fa";
import type { PublicRoleRestriction } from "../types";

interface CreateEventFormData {
	title: string;
	description: string;
	theme: string;
	event_datetime: string;
	end_datetime: string | null;
	location: {
		lat: number;
		lng: number;
		address: string;
	} | null;
}

export const CreateEventPage = () => {
	const navigate = useNavigate();
	const dispatch = useAppDispatch();
	const [searchParams] = useSearchParams();
	const isPublic = searchParams.get("public") === "true";
	const [loading, setLoading] = useState(false);
	const [error, setError] = useState<string | null>(null);
	const [selectedFriends, setSelectedFriends] = useState<SelectedFriend[]>([]);

	// Calculate default date/time (1 hour from now, rounded to nearest hour)
	const getDefaultDateTime = () => {
		const now = new Date();
		now.setHours(now.getHours() + 1); // Default to 1 hour from now
		now.setMinutes(0); // Round to nearest hour
		now.setSeconds(0);
		now.setMilliseconds(0);
		return now.toISOString();
	};

	const {
		register,
		handleSubmit,
		control,
		setValue,
		watch,
		formState: { errors },
	} = useForm<CreateEventFormData>({
		defaultValues: {
			event_datetime: getDefaultDateTime(),
			end_datetime: null,
		},
		mode: "onBlur",
	});

	// Watch location for validation (required for public events)
	const location = watch("location");

	// Watch event_datetime for validation
	const eventDateTime = watch("event_datetime");

	const [selectedLocation, setSelectedLocation] = useState<{
		lat: number;
		lng: number;
		address: string;
	} | null>(null);

	// State for public role restriction (only for public events)
	const [publicRoleRestriction, setPublicRoleRestriction] =
		useState<PublicRoleRestriction>("guests_only");

	const onSubmit = async (data: CreateEventFormData) => {
		setLoading(true);
		setError(null);

		try {
			// Validate location is required for public events
			if (isPublic && (!data.location || !selectedLocation)) {
				setError("Location is required for public events");
				setLoading(false);
				return;
			}

			// Convert selectedFriends to invitedParticipants format with roles
			const invitedParticipants =
				selectedFriends.length > 0 ?
					selectedFriends.map(friend => ({
						userId: friend.friendId,
						role: friend.role,
					}))
				:	undefined;

			// Validate end_datetime is after event_datetime
			if (data.end_datetime && data.event_datetime) {
				const startDate = new Date(data.event_datetime);
				const endDate = new Date(data.end_datetime);
				if (endDate <= startDate) {
					setError("End time must be after start time");
					setLoading(false);
					return;
				}
			}

			const result = await dispatch(
				createEvent({
					title: data.title,
					description: data.description || undefined,
					theme: data.theme || undefined,
					event_datetime: data.event_datetime,
					end_datetime: data.end_datetime || undefined,
					location: data.location || undefined,
					is_public: isPublic, // Use query parameter value
					public_role_restriction: isPublic ? publicRoleRestriction : undefined,
					invitedParticipants,
				}),
			);

			if (createEvent.fulfilled.match(result)) {
				// Redirect to the newly created event
				navigate(`/events/${result.payload.id}`);
			} else {
				setError(result.error?.message || "Failed to create event");
			}
		} catch (err) {
			setError(err instanceof Error ? err.message : "Failed to create event");
		} finally {
			setLoading(false);
		}
	};

	return (
		<main id='main-content' className='bg-secondary p-4 md:p-8' role='main'>
			<div className='max-w-2xl mx-auto'>
				{/* Back Button */}
				<div className='mb-4'>
					<button
						onClick={() => navigate(-1)}
						className='text-primary hover:text-accent transition-colors min-w-[44px] min-h-[44px] flex items-center justify-center hover:cursor-pointer hover:bg-tertiary rounded-md'
						aria-label='Go back'
						type='button'>
						<FaArrowLeft className='w-5 h-5' />
					</button>
				</div>

				{/* Page Header */}
				<div className='bg-primary rounded-lg shadow-md p-6 mb-6'>
					<h1 className='text-3xl font-bold text-primary mb-2'>
						{isPublic ? "Create Public Event" : "Create New Event"}
					</h1>
					<p className='text-secondary'>
						{isPublic ?
							"Create an event that others can discover and join. Location is required for public events."
						:	"Fill out the form below to create your event"}
					</p>
				</div>

				{/* Form */}
				<div className='bg-primary rounded-lg shadow-md p-6'>
					<form onSubmit={handleSubmit(onSubmit)} className='space-y-4'>
						<Input
							label='Event Title *'
							{...register("title", { required: "Title is required" })}
							error={errors.title?.message}
							helperText='Give your event a memorable name'
							maxLength={100}
							showCharacterCount={true}
						/>

						<Textarea
							label='Description'
							{...register("description")}
							placeholder='Describe your event...'
							rows={4}
							showCharacterCount={true}
							maxLength={500}
						/>

						<Input
							label='Theme (optional)'
							{...register("theme")}
							placeholder='e.g., Summer BBQ, Holiday Party'
							helperText='Add a theme to help set the tone'
							maxLength={50}
							showCharacterCount={true}
						/>

						<DateTime
							control={control}
							name='event_datetime'
							label='Event Start Date & Time'
							error={errors.event_datetime}
							required
							helperText='Select a future date and time for your event'
						/>

						<DateTime
							control={control}
							name='end_datetime'
							label='Event End Date & Time (optional)'
							error={errors.end_datetime}
							helperText='Optional end time. Must be after start time.'
							minDate={eventDateTime ? new Date(eventDateTime) : undefined}
							optional={true}
						/>

						<FriendSelector
							selectedFriends={selectedFriends}
							onSelectionChange={setSelectedFriends}
							helperText={
								isPublic ?
									"Optionally invite friends. Others can still discover and join your event."
								:	"Select friends to invite and assign their roles"
							}
						/>

						{/* Public Role Restriction (only for public events) */}
						{isPublic && (
							<div>
								<label className='block text-sm font-medium text-primary mb-2'>
									Who can join this event? *
								</label>
								<div className='space-y-2'>
									<label className='flex items-center gap-3 p-3 border border-border rounded-md cursor-pointer hover:bg-tertiary transition-colors'>
										<input
											type='radio'
											name='publicRoleRestriction'
											value='guests_only'
											checked={publicRoleRestriction === "guests_only"}
											onChange={e =>
												setPublicRoleRestriction(
													e.target.value as PublicRoleRestriction,
												)
											}
											className='mt-1'
										/>
										<div className='flex-1'>
											<div className='font-medium text-primary'>
												Guests only
											</div>
											<div className='text-sm text-secondary'>
												Only guests can join. Perfect for events like movie
												nights or casual gatherings.
											</div>
										</div>
									</label>
									<label className='flex items-center gap-3 p-3 border border-border rounded-md cursor-pointer hover:bg-tertiary transition-colors'>
										<input
											type='radio'
											name='publicRoleRestriction'
											value='guests_and_contributors_with_approval'
											checked={
												publicRoleRestriction ===
												"guests_and_contributors_with_approval"
											}
											onChange={e =>
												setPublicRoleRestriction(
													e.target.value as PublicRoleRestriction,
												)
											}
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
											name='publicRoleRestriction'
											value='guests_and_contributors'
											checked={
												publicRoleRestriction === "guests_and_contributors"
											}
											onChange={e =>
												setPublicRoleRestriction(
													e.target.value as PublicRoleRestriction,
												)
											}
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
								<p className='text-xs text-tertiary mt-2'>
									You can change this setting later when editing your event.
								</p>
							</div>
						)}

						<div>
							<Map
								label={isPublic ? "Location *" : "Location"}
								onLocationSelect={location => {
									setSelectedLocation(location);
									setValue("location", location, {
										shouldValidate: true,
										shouldDirty: true,
									});
								}}
								selectedLocation={selectedLocation}
							/>
							{isPublic && !location && (
								<p className='text-sm text-red-500 mt-1'>
									Location is required for public events
								</p>
							)}
							{isPublic && location && (
								<p className='text-sm text-secondary mt-1'>
									Location is set. Others will be able to discover your event
									based on this location.
								</p>
							)}
						</div>

						{error && (
							<ErrorDisplay message={error} variant='inline' className='mb-4' />
						)}

						<div className='flex justify-end gap-4 pt-4'>
							<Button
								type='button'
								variant='secondary'
								onClick={() => navigate(-1)}
								disabled={loading}>
								Cancel
							</Button>
							<Button type='submit' loading={loading}>
								{isPublic ? "Create Public Event" : "Create Event"}
							</Button>
						</div>
					</form>
				</div>
			</div>
		</main>
	);
};
