import { useState, useRef, useEffect } from "react";
import { FaChevronUp, FaChevronDown } from "react-icons/fa";

interface TimePickerProps {
	value: { hour: number; minute: number; ampm: "AM" | "PM" } | null;
	onChange: (time: { hour: number; minute: number; ampm: "AM" | "PM" }) => void;
	disabled?: boolean;
	optional?: boolean; // If true, show placeholder when value is null instead of defaulting
	id?: string;
	"aria-label"?: string;
	"aria-describedby"?: string;
	"aria-invalid"?: boolean;
}

// Generate time options: 12-hour format with 15-minute increments
const HOURS = Array.from({ length: 12 }, (_, i) => i + 1);
const MINUTES = Array.from({ length: 4 }, (_, i) => i * 15); // 0, 15, 30, 45

export const TimePicker = ({
	value,
	onChange,
	disabled = false,
	optional = false,
	id,
	"aria-label": ariaLabel,
	"aria-describedby": ariaDescribedBy,
	"aria-invalid": ariaInvalid,
}: TimePickerProps) => {
	const [isOpen, setIsOpen] = useState(false);
	const [_focusedField, setFocusedField] = useState<
		"hour" | "minute" | "ampm" | null
	>(null);
	const containerRef = useRef<HTMLDivElement>(null);

	// For optional fields, don't default to 12:00 PM - show placeholder instead
	// For required fields, default to 12:00 PM if no value
	const currentValue =
		value || (optional ? null : { hour: 12, minute: 0, ampm: "PM" as const });

	// Close dropdown when clicking outside
	useEffect(() => {
		const handleClickOutside = (event: MouseEvent) => {
			if (
				containerRef.current &&
				!containerRef.current.contains(event.target as Node)
			) {
				setIsOpen(false);
				setFocusedField(null);
			}
		};

		if (isOpen) {
			document.addEventListener("mousedown", handleClickOutside);
			return () => {
				document.removeEventListener("mousedown", handleClickOutside);
			};
		}
	}, [isOpen]);

	const handleHourChange = (hour: number) => {
		// If no current value, start with default values
		const baseValue = currentValue || {
			hour: 12,
			minute: 0,
			ampm: "PM" as const,
		};
		onChange({ ...baseValue, hour });
		setFocusedField("minute");
	};

	const handleMinuteChange = (minute: number) => {
		// If no current value, start with default values
		const baseValue = currentValue || {
			hour: 12,
			minute: 0,
			ampm: "PM" as const,
		};
		onChange({ ...baseValue, minute });
		setFocusedField("ampm");
	};

	const handleAmpmChange = (ampm: "AM" | "PM") => {
		// If no current value, start with default values
		const baseValue = currentValue || {
			hour: 12,
			minute: 0,
			ampm: "PM" as const,
		};
		onChange({ ...baseValue, ampm });
		setIsOpen(false);
		setFocusedField(null);
	};

	const formatTime = () => {
		if (!currentValue) {
			return "Select time";
		}
		const hourStr = currentValue.hour.toString().padStart(2, "0");
		const minuteStr = currentValue.minute.toString().padStart(2, "0");
		return `${hourStr}:${minuteStr} ${currentValue.ampm}`;
	};

	const handleToggle = () => {
		if (!disabled) {
			setIsOpen(!isOpen);
			if (!isOpen) {
				setFocusedField("hour");
			}
		}
	};

	const handleKeyDown = (e: React.KeyboardEvent) => {
		if (disabled) return;

		if (e.key === "Enter" || e.key === " ") {
			e.preventDefault();
			handleToggle();
		} else if (e.key === "Escape" && isOpen) {
			e.preventDefault();
			setIsOpen(false);
			setFocusedField(null);
		} else if (e.key === "ArrowDown" && !isOpen) {
			e.preventDefault();
			setIsOpen(true);
			setFocusedField("hour");
		}
	};

	return (
		<div ref={containerRef} className='relative'>
			<button
				type='button'
				id={id}
				onClick={handleToggle}
				onKeyDown={handleKeyDown}
				disabled={disabled}
				aria-label={ariaLabel || "Select time"}
				aria-describedby={ariaDescribedBy}
				aria-invalid={ariaInvalid}
				aria-expanded={isOpen}
				aria-haspopup='listbox'
				className={`
					w-full px-3 py-2 border rounded-md
					bg-secondary text-primary
					border-border
					flex items-center justify-between
					transition-colors
					${disabled ? "opacity-50 cursor-not-allowed" : "hover:border-accent cursor-pointer"}
					${ariaInvalid ? "border-red-500" : ""}
					focus:outline-none focus:ring-2 focus:ring-accent focus:ring-offset-2
					focus:ring-offset-secondary
				`}>
				<span
					className={`text-sm font-medium ${!currentValue ? "text-tertiary" : ""}`}>
					{formatTime()}
				</span>
				{isOpen ?
					<FaChevronUp className='w-4 h-4 text-secondary' />
				:	<FaChevronDown className='w-4 h-4 text-secondary' />}
			</button>

			{isOpen && !disabled && (
				<div
					className='
						absolute z-50 mt-1 bg-secondary border border-border rounded-md shadow-lg
						p-4 min-w-[280px]
						flex gap-4
					'
					role='listbox'
					aria-label='Time picker'>
					{/* Hour Selector */}
					<div className='flex-1'>
						<label className='block text-xs font-medium text-secondary mb-2 text-center'>
							Hour
						</label>
						<div className='max-h-48 overflow-y-auto scrollbar-thin scrollbar-thumb-accent scrollbar-track-tertiary'>
							{HOURS.map(hour => (
								<button
									key={hour}
									type='button'
									onClick={() => handleHourChange(hour)}
									onFocus={() => setFocusedField("hour")}
									role='option'
									aria-selected={currentValue?.hour === hour}
									className={`
										w-full px-3 py-2 text-sm rounded
										transition-colors
										${
											currentValue?.hour === hour ?
												"bg-accent text-white font-medium"
											:	"text-primary hover:bg-tertiary"
										}
										focus:outline-none focus:ring-2 focus:ring-accent
									`}>
									{hour.toString().padStart(2, "0")}
								</button>
							))}
						</div>
					</div>

					{/* Minute Selector */}
					<div className='flex-1'>
						<label className='block text-xs font-medium text-secondary mb-2 text-center'>
							Minute
						</label>
						<div className='max-h-48 overflow-y-auto scrollbar-thin scrollbar-thumb-accent scrollbar-track-tertiary'>
							{MINUTES.map(minute => (
								<button
									key={minute}
									type='button'
									onClick={() => handleMinuteChange(minute)}
									onFocus={() => setFocusedField("minute")}
									role='option'
									aria-selected={currentValue?.minute === minute}
									className={`
										w-full px-3 py-2 text-sm rounded
										transition-colors
										${
											currentValue?.minute === minute ?
												"bg-accent text-white font-medium"
											:	"text-primary hover:bg-tertiary"
										}
										focus:outline-none focus:ring-2 focus:ring-accent
									`}>
									{minute.toString().padStart(2, "0")}
								</button>
							))}
						</div>
					</div>

					{/* AM/PM Selector */}
					<div className='flex-1'>
						<label className='block text-xs font-medium text-secondary mb-2 text-center'>
							AM/PM
						</label>
						<div className='space-y-2'>
							{(["AM", "PM"] as const).map(ampm => (
								<button
									key={ampm}
									type='button'
									onClick={() => handleAmpmChange(ampm)}
									onFocus={() => setFocusedField("ampm")}
									role='option'
									aria-selected={currentValue?.ampm === ampm}
									className={`
										w-full px-3 py-2 text-sm rounded font-medium
										transition-colors
										${
											currentValue?.ampm === ampm ?
												"bg-accent text-white"
											:	"text-primary hover:bg-tertiary border border-border"
										}
										focus:outline-none focus:ring-2 focus:ring-accent
									`}>
									{ampm}
								</button>
							))}
						</div>
					</div>
				</div>
			)}
		</div>
	);
};
