import { useState, useEffect } from "react";
import { useForm } from "react-hook-form";
import { useAppDispatch } from "../../store/hooks";
import { createEvent } from "../../store/slices/eventsSlice";
import { motion, AnimatePresence } from "motion/react";
import { Button } from "../common/Button";
import { Input } from "../common/Input";
import { DatePicker } from "../common/DatePicker";

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

interface CreateEventModalProps {
	onClose: () => void;
	onSuccess: () => void;
}

export const CreateEventModal = ({
	onClose,
	onSuccess,
}: CreateEventModalProps) => {
	const dispatch = useAppDispatch();
	const [loading, setLoading] = useState(false);
	const [error, setError] = useState<string | null>(null);

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

	// Handle Esc key press to close modal
	useEffect(() => {
		const handleEscKey = (event: KeyboardEvent) => {
			if (event.key === "Escape" && !loading) {
				onClose();
			}
		};

		document.addEventListener("keydown", handleEscKey);
		return () => {
			document.removeEventListener("keydown", handleEscKey);
		};
	}, [onClose, loading]);

	// Handle click outside modal to close
	const handleBackdropClick = (e: React.MouseEvent<HTMLDivElement>) => {
		if (e.target === e.currentTarget && !loading) {
			onClose();
		}
	};

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
				}),
			);

			if (createEvent.fulfilled.match(result)) {
				onSuccess();
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
		<AnimatePresence>
			<div
				className='fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50'
				onClick={handleBackdropClick}>
				<motion.div
					initial={{ opacity: 0, scale: 0.95 }}
					animate={{ opacity: 1, scale: 1 }}
					exit={{ opacity: 0, scale: 0.95 }}
					onClick={e => e.stopPropagation()}
					className='bg-white dark:bg-gray-800 rounded-lg shadow-xl p-6 w-full max-w-2xl max-h-[90vh] overflow-y-auto'>
					<div className='flex justify-between items-center mb-6'>
						<h2 className='text-2xl font-bold text-gray-900 dark:text-white'>
							Create New Event
						</h2>
						<button
							onClick={onClose}
							className='text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200 hover:cursor-pointer'>
							✕
						</button>
					</div>

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
										colorScheme: "dark light", // Helps with dark mode styling
									}}
								/>
								{errors.event_time && (
									<p className='mt-1 text-sm text-red-500'>
										{errors.event_time.message}
									</p>
								)}
							</div>
						</div>

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

						{/* <div className='flex items-center'>
							<input
								type='checkbox'
								id='is_public'
								{...register("is_public")}
								className='mr-2'
							/>
							<label
								htmlFor='is_public'
								className='text-sm text-gray-700 dark:text-gray-300'>
								Make this event public (visible to everyone)
							</label>
						</div> */}

						{error && <p className='text-sm text-red-500'>{error}</p>}

						<div className='flex justify-end gap-4 pt-4'>
							<Button
								type='button'
								variant='secondary'
								onClick={onClose}
								disabled={loading}>
								Cancel
							</Button>
							<Button type='submit' loading={loading}>
								Create Event
							</Button>
						</div>
					</form>
				</motion.div>
			</div>
		</AnimatePresence>
	);
};
