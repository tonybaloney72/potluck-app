import { useState, useEffect, useRef } from "react";
import { Controller, type Control, type FieldError } from "react-hook-form";
import { DayPicker } from "react-day-picker";
import "react-day-picker/dist/style.css";

interface DatePickerProps {
	control: Control<any>;
	name: string;
	label: string;
	error?: FieldError;
	required?: boolean;
}

export const DatePicker = ({
	control,
	name,
	label,
	error,
	required = false,
}: DatePickerProps) => {
	const [showPicker, setShowPicker] = useState(false);
	const pickerRef = useRef<HTMLDivElement>(null);

	// Close picker when clicking outside
	useEffect(() => {
		const handleClickOutside = (event: MouseEvent) => {
			if (
				pickerRef.current &&
				!pickerRef.current.contains(event.target as Node)
			) {
				setShowPicker(false);
			}
		};

		if (showPicker) {
			document.addEventListener("mousedown", handleClickOutside);
		}

		return () => {
			document.removeEventListener("mousedown", handleClickOutside);
		};
	}, [showPicker]);

	return (
		<div className='relative' ref={pickerRef}>
			<label className='block text-sm font-medium mb-1 text-primary'>
				{label} {required && "*"}
			</label>

			<Controller
				name={name}
				control={control}
				rules={{ required: required ? `${label} is required` : false }}
				render={({ field }) => {
					const selectedDate = field.value ? new Date(field.value) : undefined;

					const handleDateSelect = (date: Date | undefined) => {
						if (date) {
							// Format as YYYY-MM-DD for the form
							const formattedDate = date.toISOString().split("T")[0];
							field.onChange(formattedDate);
						} else {
							field.onChange("");
						}
						setShowPicker(false);
					};

					return (
						<>
							<input
								type='text'
								readOnly
								value={
									selectedDate && !isNaN(selectedDate.getTime())
										? selectedDate.toLocaleDateString()
										: ""
								}
								onClick={() => setShowPicker(!showPicker)}
								className='w-full px-4 py-2 bg-secondary border border-border rounded-md text-primary focus:outline-none focus:ring-2 focus:ring-accent cursor-pointer placeholder:text-tertiary'
								placeholder='Select a date'
							/>
							{showPicker && (
								<div className='absolute z-50 mt-2 bg-secondary border border-border rounded-lg shadow-lg p-4'>
									<DayPicker
										mode='single'
										selected={selectedDate}
										onSelect={handleDateSelect}
										className='rounded-md'
										classNames={{
											months:
												"flex flex-col sm:flex-row space-y-4 sm:space-x-4 sm:space-y-0",
											month: "space-y-4",
											caption:
												"flex justify-center pt-1 relative items-center text-primary",
											caption_label: "text-sm font-medium text-primary",
											nav: "space-x-1 flex items-center",
											nav_button:
												"h-7 w-7 bg-transparent p-0 opacity-50 hover:opacity-100 text-primary hover:bg-accent rounded",
											nav_button_previous: "absolute left-1",
											nav_button_next: "absolute right-1",
											table: "w-full border-collapse space-y-1",
											head_row: "flex",
											head_cell:
												"text-tertiary rounded-md w-9 font-normal text-[0.8rem]",
											row: "flex w-full mt-2",
											cell: "h-9 w-9 text-center text-sm p-0 relative [&:has([aria-selected].day-range-end)]:rounded-r-md [&:has([aria-selected].day-outside)]:bg-accent/50 [&:has([aria-selected])]:bg-accent first:[&:has([aria-selected])]:rounded-l-md last:[&:has([aria-selected])]:rounded-r-md focus-within:relative focus-within:z-20",
											day: "h-9 w-9 p-0 font-normal aria-selected:opacity-100 text-primary hover:bg-accent hover:text-primary rounded-md",
											day_selected:
												"bg-accent text-primary hover:bg-accent hover:text-primary focus:bg-accent focus:text-primary",
											day_today: "bg-secondary text-primary",
											day_outside:
												"text-tertiary opacity-50 aria-selected:bg-accent/50 aria-selected:text-tertiary aria-selected:opacity-30",
											day_disabled: "text-tertiary opacity-50",
											day_range_middle:
												"aria-selected:bg-accent aria-selected:text-primary",
											day_hidden: "invisible",
										}}
									/>
								</div>
							)}
							{error && (
								<p className='mt-1 text-sm text-red-500'>{error.message}</p>
							)}
						</>
					);
				}}
			/>
		</div>
	);
};
