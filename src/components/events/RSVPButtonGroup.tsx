import { useParams } from "react-router";
import { useAppDispatch, useAppSelector } from "../../store/hooks";
import { updateRSVP } from "../../store/slices/eventsSlice";
import { selectEventById } from "../../store/selectors/eventsSelectors";
import { Button } from "../common/Button";
import type { RSVPStatus } from "../../types";

interface RSVPButtonGroupProps {}

const RSVP_OPTIONS: { status: RSVPStatus; label: string }[] = [
	{ status: "going", label: "Going" },
	{ status: "maybe", label: "Maybe" },
	{ status: "not going", label: "Can't Go" },
];

export const RSVPButtonGroup = ({}: RSVPButtonGroupProps) => {
	const { eventId } = useParams<{ eventId: string }>();
	const dispatch = useAppDispatch();

	// Get event from Redux store
	const event = useAppSelector(state =>
		eventId ? selectEventById(state, eventId) : null,
	);

	// Get current user ID
	const currentUserId = useAppSelector(state => state.auth.user?.id);

	// Get loading state
	const updatingRSVP = useAppSelector(state => state.events.updatingRSVP);

	// Compute current user participant
	const currentUserParticipant = event?.participants?.find(
		p => p.user_id === currentUserId,
	);

	// Early return if no participant (shouldn't show RSVP if not a participant)
	if (!currentUserParticipant) {
		return null;
	}

	const currentStatus = currentUserParticipant.rsvp_status;

	// Handle RSVP change
	const handleRSVPChange = async (status: RSVPStatus) => {
		if (eventId) {
			await dispatch(updateRSVP({ eventId, rsvpStatus: status }));
		}
	};
	return (
		<div className='flex gap-2' role='group' aria-label='RSVP status'>
			{RSVP_OPTIONS.map(({ status, label }) => (
				<Button
					key={status}
					variant={currentStatus === status ? "primary" : "secondary"}
					onClick={() => handleRSVPChange(status)}
					disabled={updatingRSVP === status}
					loading={updatingRSVP === status}
					className='text-sm'
					aria-pressed={currentStatus === status}
					aria-label={`RSVP: ${label}${currentStatus === status ? " (current)" : ""}`}>
					{label}
				</Button>
			))}
		</div>
	);
};
