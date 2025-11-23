import { useState, useEffect } from "react";
import { useForm } from "react-hook-form";
import { useAppDispatch } from "../../store/hooks";
import { updateEvent } from "../../store/slices/eventsSlice";
import { motion, AnimatePresence } from "motion/react";
import { Button } from "../common/Button";
import { Input } from "../common/Input";
import { DatePicker } from "../common/DatePicker";
import type { Event } from "../../types";

interface EditEventFormData {
	title: string;
	description: string;
	theme: string;
	event_date: string;
	event_time: string;
	location: string;
	location_url: string;
}

interface EditEventModalProps {
	event: Event;
	onClose: () => void;
	onSuccess: () => void;
}

export const EditEventModal = ({
	event,
	onClose,
	onSuccess,
}: EditEventModalProps) => {
	const dispatch = useAppDispatch();
	const [loading, setLoading] = useState(false);
	const [error, setError] = useState<string | null>(null);

	const {
		register,
		handleSubmit,
		control,
		reset,
		formState: { errors },
	} = useForm<EditEventFormData>({
		defaultValues: {
			title: event.title,
			description: event.description || "",
			theme: event.theme || "",
			event_date: event.event_date,
			event_time: event.event_time,
			location: event.location || "",
			location_url: event.location_url || "",
		},
	});

	// Reset form when event changes
	useEffect(() => {
		reset({
			title: event.title,
			description: event.description || "",
			theme: event.theme || "",
			event_date: event.event_date,
			event_time: event.event_time,
			location: event.location || "",
			location_url: event.location_url || "",
		});
	}, [event, reset]);

	// Handle Esc key press
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

	// Handle click outside modal
	const handleBackdropClick = (e: React.MouseEvent<HTMLDivElement>) => {
		if (e.target === e.currentTarget && !loading) {
			onClose();
		}
	};

	const onSubmit = async (data: EditEventFormData) => {
		setLoading(true);
		setError(null);

		try {
			const result = await dispatch(
				updateEvent({
					eventId: event.id,
					updates: {
						title: data.title,
						description: data.description || undefined,
						theme: data.theme || undefined,
						event_date: data.event_date,
						event_time: data.event_time,
						location: data.location || undefined,
						location_url: data.location_url || undefined,
					},
				}),
			);

			if (updateEvent.fulfilled.match(result)) {
				onSuccess();
			} else {
				setError(result.error?.message || "Failed to update event");
			}
		} catch (err) {
			setError(err instanceof Error ? err.message : "Failed to update event");
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
					className='bg-primary rounded-lg shadow-xl p-6 w-full max-w-2xl max-h-[90vh] overflow-y-auto'>
					<div className='flex justify-between items-center mb-6'>
						<h2 className='text-2xl font-bold text-primary'>Edit Event</h2>
						<button
							onClick={onClose}
							className='text-tertiary hover:text-secondary hover:cursor-pointer'>
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
								onClick={onClose}
								disabled={loading}>
								Cancel
							</Button>
							<Button type='submit' loading={loading}>
								Save Changes
							</Button>
						</div>
					</form>
				</motion.div>
			</div>
		</AnimatePresence>
	);
};
