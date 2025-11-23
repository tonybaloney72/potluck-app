import { useState } from "react";
import { useForm } from "react-hook-form";
import { useNavigate } from "react-router";
import { useAppDispatch } from "../store/hooks";
import { createEvent } from "../store/slices/eventsSlice";
import { Button } from "../components/common/Button";
import { Input } from "../components/common/Input";
import { DatePicker } from "../components/common/DatePicker";
import { FriendSelector } from "../components/events/FriendSelector";

interface CreateEventFormData {
	title: string;
	description: string;
	theme: string;
	event_date: string;
	event_time: string;
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

	const {
		register,
		handleSubmit,
		control,
		formState: { errors },
	} = useForm<CreateEventFormData>({
		defaultValues: {
			is_public: false,
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
					event_date: data.event_date,
					event_time: data.event_time,
					location: data.location || undefined,
					location_url: data.location_url || undefined,
					is_public: data.is_public,
					invitedUserIds: selectedFriendIds,
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
		<div className='min-h-screen bg-secondary p-8'>
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
						/>

						<div>
							<label className='block text-sm font-medium mb-1 text-primary'>
								Description
							</label>
							<textarea
								{...register("description")}
								className='w-full px-4 py-2 bg-secondary border border-border rounded-md text-primary placeholder:text-tertiary focus:outline-none focus:ring-2 focus:ring-accent'
								rows={4}
							/>
						</div>

						<Input
							label='Theme (optional)'
							{...register("theme")}
							placeholder='e.g., Summer BBQ, Holiday Party'
						/>

						<div className='grid grid-cols-2 gap-4'>
							<DatePicker
								control={control}
								name='event_date'
								label='Event Date'
								error={errors.event_date}
								required
							/>

							<div>
								<label className='block text-sm font-medium mb-1 text-primary'>
									Event Time *
								</label>
								<input
									type='time'
									{...register("event_time", {
										required: "Time is required",
									})}
									className='w-full px-4 py-2 bg-secondary border border-border rounded-md text-primary focus:outline-none focus:ring-2 focus:ring-accent'
									style={{
										colorScheme: "dark light",
									}}
								/>
								{errors.event_time && (
									<p className='mt-1 text-sm text-red-500'>
										{errors.event_time.message}
									</p>
								)}
							</div>
						</div>

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

						{error && <p className='text-sm text-red-500'>{error}</p>}

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
