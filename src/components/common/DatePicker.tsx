import { Controller, type Control, type FieldError } from "react-hook-form";
import DateTimePicker from "react-datetime-picker";
import "react-datetime-picker/dist/DateTimePicker.css";
import "react-calendar/dist/Calendar.css";
import "react-clock/dist/Clock.css";

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
	return (
		<div className='relative'>
			<label className='block text-sm font-medium mb-1 text-primary'>
				{label} {required && "*"}
			</label>

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
							<DateTimePicker
								onChange={handleDateTimeChange}
								value={selectedDateTime}
								format='y-MM-dd h:mm a'
								disableClock={false}
								className='w-full [&_input]:w-full [&_input]:px-4 [&_input]:py-2 [&_input]:bg-secondary [&_input]:border [&_input]:border-border [&_input]:rounded-md [&_input]:text-primary [&_input]:focus:outline-none [&_input]:focus:ring-2 [&_input]:focus:ring-accent'
								calendarProps={{
									className: "bg-secondary border border-border rounded-lg",
								}}
								clockProps={{
									className: "bg-secondary",
								}}
								minDate={new Date()} // Prevent selecting past dates
								clearIcon={null} // Optional: remove clear button if desired
							/>
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
