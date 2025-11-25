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
	disabled,
	className,
}: RoleSelectorProps) => {
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

	return (
		<select
			value={value}
			onChange={e => onChange(e.target.value as EventRole)}
			disabled={disabled}
			className={`px-3 py-2 bg-secondary border border-border rounded-md text-primary focus:outline-none focus:ring-2 focus:ring-accent disabled:opacity-50 disabled:cursor-not-allowed ${className}`}>
			{roles.map(role => (
				<option key={role.value} value={role.value}>
					{role.label} - {role.description}
				</option>
			))}
		</select>
	);
};
