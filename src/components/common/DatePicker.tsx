import { Controller, type Control, type FieldError } from "react-hook-form";
import DateTimePicker from "react-datetime-picker";
import "react-datetime-picker/dist/DateTimePicker.css";
import "react-calendar/dist/Calendar.css";
import "./DateTimePicker.css"; // Custom styling to match app theme

interface DatePickerProps {
	control: Control<any>;
	name: string;
	label: string;
	error?: FieldError;
	required?: boolean;
	helperText?: string;
}

export const DatePicker = ({
	control,
	name,
	label,
	error,
	required = false,
	helperText,
}: DatePickerProps) => {
	const datePickerId = `datepicker-${name}`;
	const errorId = error ? `${datePickerId}-error` : undefined;
	const helperTextId = helperText && !error ? `${datePickerId}-helper` : undefined;
	const describedBy = [errorId, helperTextId].filter(Boolean).join(" ") || undefined;

	return (
		<div className='relative w-full'>
			<label htmlFor={datePickerId} className='block text-sm font-medium text-primary'>
				{label} {required && <span aria-label='required'>*</span>}
			</label>

			{helperText && !error && (
				<p id={helperTextId} className='text-sm text-secondary mb-1'>{helperText}</p>
			)}

			<Controller
				name={name}
				control={control}
				rules={{ required: required ? `${label} is required` : false }}
				render={({ field }) => {
					const selectedDateTime = field.value ? new Date(field.value) : null;

					const handleDateTimeChange = (value: Date | null) => {
						if (value) {
							// Convert to ISO string for storage
							field.onChange(value.toISOString());
						} else {
							field.onChange("");
						}
					};

					return (
						<>
							<div
								id={datePickerId}
								className={`w-full ${error ? "has-error border-red-500" : ""}`}
								role='group'
								aria-labelledby={`${datePickerId}-label`}
								aria-describedby={describedBy}
								aria-invalid={error ? "true" : "false"}
								aria-required={required ? "true" : undefined}>
								<span id={`${datePickerId}-label`} className='sr-only'>{label}</span>
								<DateTimePicker
									onChange={handleDateTimeChange}
									value={selectedDateTime}
									format='y-MM-dd h:mm a'
									disableClock={true}
									maxDetail='minute'
									minDate={new Date()} // Prevent selecting past dates
									clearIcon={null} // Optional: remove clear button if desired
								/>
							</div>
							{error && (
								<p id={errorId} className='mt-1 text-sm text-red-500' role='alert'>
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
