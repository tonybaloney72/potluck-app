import { Controller, type Control, type FieldError } from "react-hook-form";
import DatePicker from "react-datepicker";
import dayjs from "dayjs";
import { TimePicker } from "./TimePicker";

interface DateTimeProps {
	control: Control<any>;
	name: string;
	label: string;
	error?: FieldError;
	required?: boolean;
	helperText?: string;
	minDate?: Date; // Minimum date for the date picker
	optional?: boolean; // If true, don't auto-set default time when date is selected
}

export const DateTime = ({
	control,
	name,
	label,
	error,
	required = false,
	helperText,
	minDate,
	optional = false,
}: DateTimeProps) => {
	const dateTimeId = `datetime-${name}`;
	const errorId = error ? `${dateTimeId}-error` : undefined;
	const helperTextId =
		helperText && !error ? `${dateTimeId}-helper` : undefined;
	const describedBy =
		[errorId, helperTextId].filter(Boolean).join(" ") || undefined;

	return (
		<div className='relative w-full'>
			<label
				htmlFor={dateTimeId}
				className='block text-sm font-medium text-primary'>
				{label} {required && <span aria-label='required'>*</span>}
			</label>

			{helperText && !error && (
				<p id={helperTextId} className='text-sm text-secondary mb-1'>
					{helperText}
				</p>
			)}

			<Controller
				name={name}
				control={control}
				rules={{ required: required ? `${label} is required` : false }}
				render={({ field }) => {
					// Parse the ISO string value into date and time components
					const isoValue = field.value;
					const dateValue = isoValue ? dayjs(isoValue).toDate() : null;
					const timeValue =
						isoValue ?
							(() => {
								const d = dayjs(isoValue);
								const hour12 = d.format("h");
								const minute = d.minute();
								const ampm = d.format("A") as "AM" | "PM";
								return {
									hour: parseInt(hour12, 10),
									minute: Math.round(minute / 15) * 15, // Round to nearest 15 minutes
									ampm,
								};
							})()
						:	null;

					const handleDateChange = (date: Date | null) => {
						if (!date) {
							field.onChange(optional ? null : "");
							return;
						}

						// If we have a time value, combine it with the new date
						if (timeValue) {
							const combined = dayjs(date)
								.hour(
									timeValue.ampm === "PM" && timeValue.hour !== 12 ?
										timeValue.hour + 12
									: timeValue.ampm === "AM" && timeValue.hour === 12 ? 0
									: timeValue.hour,
								)
								.minute(timeValue.minute)
								.second(0)
								.millisecond(0)
								.toISOString();
							field.onChange(combined);
						} else {
							// For optional fields, don't auto-set time - user must explicitly select it
							// For required fields, default to 12:00 PM if no time selected
							if (optional) {
								// Don't set a value yet - wait for user to select time
								return;
							}
							const combined = dayjs(date)
								.hour(12)
								.minute(0)
								.second(0)
								.millisecond(0)
								.toISOString();
							field.onChange(combined);
						}
					};

					const handleTimeChange = (time: {
						hour: number;
						minute: number;
						ampm: "AM" | "PM";
					}) => {
						// If we have a date value, combine it with the new time
						if (dateValue) {
							const combined = dayjs(dateValue)
								.hour(
									time.ampm === "PM" && time.hour !== 12 ? time.hour + 12
									: time.ampm === "AM" && time.hour === 12 ? 0
									: time.hour,
								)
								.minute(time.minute)
								.second(0)
								.millisecond(0)
								.toISOString();
							field.onChange(combined);
						} else if (optional) {
							// For optional fields without a date, don't set anything yet
							// User needs to select date first
							return;
						} else {
							// If no date and not optional, use today's date (required fields)
							const today = dayjs();
							const combined = today
								.hour(
									time.ampm === "PM" && time.hour !== 12 ? time.hour + 12
									: time.ampm === "AM" && time.hour === 12 ? 0
									: time.hour,
								)
								.minute(time.minute)
								.second(0)
								.millisecond(0)
								.toISOString();
							field.onChange(combined);
						}
					};

					return (
						<>
							<div
								id={dateTimeId}
								className={`w-full flex flex-col sm:flex-row items-center gap-4 ${error ? "has-error" : ""}`}
								role='group'
								aria-labelledby={`${dateTimeId}-label`}
								aria-describedby={describedBy}
								aria-invalid={error ? "true" : "false"}
								aria-required={required ? "true" : undefined}>
								<span id={`${dateTimeId}-label`} className='sr-only'>
									{label}
								</span>

								{/* Date Picker */}
								<div className='flex-1 w-full'>
									<DatePicker
										selected={dateValue}
										onChange={handleDateChange}
										minDate={minDate || new Date()}
										dateFormat='MMM dd, yyyy'
										placeholderText='Select date'
										className={`
											w-full px-3 py-2 border rounded-md
											bg-secondary text-primary
											border-border
											text-sm
											transition-colors
											${error ? "border-red-500" : ""}
											hover:border-accent
											focus:outline-none focus:ring-2 focus:ring-accent focus:ring-offset-2
											focus:ring-offset-secondary
										`}
										wrapperClassName='w-full'
										calendarClassName='react-datepicker-custom'
									/>
								</div>

								{/* Time Picker */}
								<div className='flex-1 w-full'>
									<TimePicker
										value={timeValue}
										onChange={handleTimeChange}
										id={`${dateTimeId}-time`}
										aria-label='Select time'
										aria-describedby={describedBy}
										aria-invalid={error ? true : false}
										optional={optional}
									/>
								</div>
							</div>
							{error && (
								<p
									id={errorId}
									className='mt-1 text-sm text-red-500'
									role='alert'>
									{error.message}
								</p>
							)}
						</>
					);
				}}
			/>
		</div>
	);
};
