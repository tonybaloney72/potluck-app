import { useState } from "react";
import { useForm } from "react-hook-form";
import { useNavigate } from "react-router";
import { useAppDispatch } from "../store/hooks";
import { createEvent, setCurrentEvent } from "../store/slices/eventsSlice";
import { Button } from "../components/common/Button";
import { Input } from "../components/common/Input";
import { Textarea } from "../components/common/Textarea";
import { DatePicker } from "../components/common/DatePicker";
import { FriendSelector } from "../components/events/FriendSelector";
import { ErrorDisplay } from "../components/common/ErrorDisplay";

interface CreateEventFormData {
	title: string;
	description: string;
	theme: string;
	event_datetime: string;
	location: string;
	location_url: string;
	is_public: boolean;
}

export const CreateEventPage = () => {
	const navigate = useNavigate();
	const dispatch = useAppDispatch();
	const [loading, setLoading] = useState(false);
	const [error, setError] = useState<string | null>(null);
	const [selectedFriendIds, setSelectedFriendIds] = useState<string[]>([]);

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
		formState: { errors },
	} = useForm<CreateEventFormData>({
		defaultValues: {
			is_public: false,
			event_datetime: getDefaultDateTime(),
		},
	});

	const onSubmit = async (data: CreateEventFormData) => {
		setLoading(true);
		setError(null);

		try {
			const result = await dispatch(
				createEvent({
					title: data.title,
					description: data.description || undefined,
					theme: data.theme || undefined,
					event_datetime: data.event_datetime,
					location: data.location || undefined,
					location_url: data.location_url || undefined,
					is_public: data.is_public,
					invitedUserIds: selectedFriendIds,
				}),
			);

			if (createEvent.fulfilled.match(result)) {
				// Set the created event as currentEvent before redirecting
				// This prevents the "Event not found" flash on the details page
				dispatch(setCurrentEvent(result.payload));
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
		<div className='bg-secondary p-8'>
			<div className='max-w-2xl mx-auto'>
				{/* Back Button */}
				<button
					onClick={() => navigate(-1)}
					className='mb-6 text-accent hover:underline hover:cursor-pointer'>
					← Back
				</button>

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

						<DatePicker
							control={control}
							name='event_datetime'
							label='Event Date & Time'
							error={errors.event_datetime}
							required
							helperText='Select a future date and time for your event'
						/>

						<FriendSelector
							selectedFriends={selectedFriendIds}
							onSelectionChange={setSelectedFriendIds}
						/>

						<Input
							label='Location'
							{...register("location")}
							placeholder='e.g., Central Park, New York'
						/>

						<Input
							label='Location URL (optional)'
							{...register("location_url")}
							placeholder='https://maps.google.com/...'
							type='url'
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
		</div>
	);
};
