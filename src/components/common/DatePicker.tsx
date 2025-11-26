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
	return (
		<div className='relative w-full'>
			<label className='block text-sm font-medium text-primary'>
				{label} {required && "*"}
			</label>

			{helperText && !error && (
				<p className='text-sm text-secondary mb-1'>{helperText}</p>
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
								className={`w-full ${error ? "has-error border-red-500" : ""}`}>
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
								<p className='mt-1 text-sm text-red-500'>{error.message}</p>
							)}
						</>
					);
				}}
			/>
		</div>
	);
};
