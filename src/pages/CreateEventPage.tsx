import { useState } from "react";
import { useForm } from "react-hook-form";
import { useNavigate } from "react-router";
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
	is_public: boolean;
}

export const CreateEventPage = () => {
	const navigate = useNavigate();
	const dispatch = useAppDispatch();
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
			is_public: false,
			event_datetime: getDefaultDateTime(),
			end_datetime: null,
		},
	});

	// Watch event_datetime for validation
	const eventDateTime = watch("event_datetime");

	const [selectedLocation, setSelectedLocation] = useState<{
		lat: number;
		lng: number;
		address: string;
	} | null>(null);

	const onSubmit = async (data: CreateEventFormData) => {
		setLoading(true);
		setError(null);

		try {
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
					is_public: data.is_public,
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
						Create New Event
					</h1>
					<p className='text-secondary'>
						Fill out the form below to create your event
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
							helperText='Select friends to invite and assign their roles'
						/>

						<Map
							label='Location'
							onLocationSelect={location => {
								setSelectedLocation(location);
								setValue("location", location, {
									shouldValidate: true,
									shouldDirty: true,
								});
							}}
							selectedLocation={selectedLocation}
						/>

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
								Create Event
							</Button>
						</div>
					</form>
				</div>
			</div>
		</main>
	);
};
