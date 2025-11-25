import { useState, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "motion/react";
import { FaChevronDown } from "react-icons/fa";
import type { EventRole } from "../../types";

interface RoleSelectorProps {
	value: EventRole;
	onChange: (role: EventRole) => void;
	disabled?: boolean;
	className?: string;
}

export const RoleSelector = ({
	value,
	onChange,
	disabled = false,
	className = "",
}: RoleSelectorProps) => {
	const [isOpen, setIsOpen] = useState(false);
	const [hoveredRole, setHoveredRole] = useState<EventRole | null>(null);
	const dropdownRef = useRef<HTMLDivElement>(null);

	const roles: { value: EventRole; label: string; description: string }[] = [
		{ value: "guest", label: "Guest", description: "Can view event and RSVP" },
		{
			value: "contributor",
			label: "Contributor",
			description: "Can view, RSVP, and add contributions",
		},
		{
			value: "co_host",
			label: "Co-Host",
			description:
				"Can view, RSVP, add contributions, and manage event details",
		},
	];

	const selectedRole = roles.find(role => role.value === value);

	// Close dropdown when clicking outside
	useEffect(() => {
		const handleClickOutside = (event: MouseEvent) => {
			if (
				dropdownRef.current &&
				!dropdownRef.current.contains(event.target as Node)
			) {
				setIsOpen(false);
			}
		};

		if (isOpen) {
			document.addEventListener("mousedown", handleClickOutside);
		} else {
			document.removeEventListener("mousedown", handleClickOutside);
		}

		return () => {
			document.removeEventListener("mousedown", handleClickOutside);
		};
	}, [isOpen]);

	// Close dropdown when disabled
	useEffect(() => {
		if (disabled && isOpen) {
			setIsOpen(false);
		}
	}, [disabled, isOpen]);

	const handleSelectRole = (role: EventRole) => {
		onChange(role);
		setIsOpen(false);
		setHoveredRole(null);
	};

	return (
		<div className={`relative ${className}`} ref={dropdownRef}>
			{/* Button */}
			<button
				type='button'
				onClick={() => !disabled && setIsOpen(!isOpen)}
				disabled={disabled}
				className={`flex items-center justify-between gap-2 px-3 py-2 bg-secondary border border-border rounded-md text-primary focus:outline-none focus:ring-2 focus:ring-accent disabled:opacity-50 disabled:cursor-not-allowed hover:bg-tertiary transition-colors min-w-[140px] ${className} hover:cursor-pointer`}
				aria-haspopup='listbox'
				aria-expanded={isOpen}
				aria-label={`Selected role: ${selectedRole?.label}`}>
				<span className='capitalize'>{selectedRole?.label || value}</span>
				<FaChevronDown
					className={`w-3 h-3 transition-transform ${
						isOpen ? "rotate-180" : ""
					}`}
				/>
			</button>

			{/* Dropdown Menu */}
			<AnimatePresence>
				{isOpen && (
					<>
						{/* Backdrop */}
						<motion.div
							className='fixed inset-0 z-40'
							initial={{ opacity: 0 }}
							animate={{ opacity: 1 }}
							exit={{ opacity: 0 }}
							onClick={() => setIsOpen(false)}
						/>

						{/* Dropdown Content */}
						<motion.div
							className='absolute top-full left-0 mt-1 bg-secondary border border-border rounded-md shadow-lg z-50 min-w-[200px] overflow-hidden'
							initial={{ opacity: 0, y: -10, scale: 0.95 }}
							animate={{ opacity: 1, y: 0, scale: 1 }}
							exit={{ opacity: 0, y: -10, scale: 0.95 }}
							transition={{ duration: 0.15 }}
							role='listbox'>
							{roles.map(role => (
								<button
									key={role.value}
									type='button'
									onClick={() => handleSelectRole(role.value)}
									onMouseEnter={() => setHoveredRole(role.value)}
									onMouseLeave={() => setHoveredRole(null)}
									className={`w-full px-3 py-2 text-left transition-colors ${
										value === role.value
											? "bg-accent/20 text-accent font-medium"
											: "text-primary hover:bg-tertiary"
									} hover:cursor-pointer`}
									role='option'
									aria-selected={value === role.value}>
									<div className='flex flex-col'>
										<span className='capitalize font-medium'>{role.label}</span>
										{hoveredRole === role.value && (
											<motion.span
												className='text-xs text-tertiary mt-1'
												initial={{ opacity: 0, y: -5 }}
												animate={{ opacity: 1, y: 0 }}
												exit={{ opacity: 0 }}
												transition={{ duration: 0.15 }}>
												{role.description}
											</motion.span>
										)}
									</div>
								</button>
							))}
						</motion.div>
					</>
				)}
			</AnimatePresence>
		</div>
	);
};
