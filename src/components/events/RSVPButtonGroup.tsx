import { Button } from "../common/Button";
import type { RSVPStatus } from "../../types";

interface RSVPButtonGroupProps {
	currentStatus: RSVPStatus;
	onRSVPChange: (status: RSVPStatus) => void;
	updatingRSVP: RSVPStatus | null;
}

const RSVP_OPTIONS: { status: RSVPStatus; label: string }[] = [
	{ status: "going", label: "Going" },
	{ status: "maybe", label: "Maybe" },
	{ status: "not_going", label: "Can't Go" },
];

export const RSVPButtonGroup = ({
	currentStatus,
	onRSVPChange,
	updatingRSVP,
}: RSVPButtonGroupProps) => {
	return (
		<div className='flex gap-2'>
			{RSVP_OPTIONS.map(({ status, label }) => (
				<Button
					key={status}
					variant={currentStatus === status ? "primary" : "secondary"}
					onClick={() => onRSVPChange(status)}
					disabled={updatingRSVP === status}
					loading={updatingRSVP === status}
					className='text-sm'>
					{label}
				</Button>
			))}
		</div>
	);
};
