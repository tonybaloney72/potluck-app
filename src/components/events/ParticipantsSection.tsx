import { useState } from "react";
import { useParams } from "react-router";
import { useAppDispatch, useAppSelector } from "../../store/hooks";
import {
	addParticipant,
	joinPublicEvent,
} from "../../store/slices/eventsSlice";
import { selectEventById } from "../../store/selectors/eventsSelectors";
import { AnimatedSection } from "../common/AnimatedSection";
import { SectionHeader } from "../common/SectionHeader";
import { EmptyState } from "../common/EmptyState";
import { FriendSelector, type SelectedFriend } from "../common/FriendSelector";
import type { EventRole } from "../../types";
import { hasManagePermission } from "../../utils/events";
import { FaUsers } from "react-icons/fa";
import { ParticipantCard } from "./ParticipantCard";
import { Button } from "../common/Button";
import { JoinEventModal } from "./JoinEventModal";

interface ParticipantsSectionProps {
	selectedFriends: SelectedFriend[];
	onSelectionChange: (friends: SelectedFriend[]) => void;
}

export const ParticipantsSection = ({
	selectedFriends,
	onSelectionChange,
}: ParticipantsSectionProps) => {
	const { eventId } = useParams<{ eventId: string }>();
	const dispatch = useAppDispatch();

	// Get event from Redux store
	const event = useAppSelector(state =>
		eventId ? selectEventById(state, eventId) : null,
	);

	// Get current user ID
	const currentUserId = useAppSelector(state => state.auth.user?.id);

	// Get loading states
	const joiningEvent = useAppSelector(state => state.events.joiningPublicEvent);
	const addingParticipant = useAppSelector(
		state => state.events.addingParticipant,
	);

	// Compute current user participant
	const currentUserParticipant = event?.participants?.find(
		p => p.user_id === currentUserId,
	);

	// Early return if no event
	if (!event) {
		return null;
	}

	const canManage = hasManagePermission(currentUserParticipant?.role);
	const [showJoinModal, setShowJoinModal] = useState(false);

	// Check if user can join this public event
	const canJoinPublicEvent =
		event.is_public && !currentUserParticipant && currentUserId;

	// Determine available roles based on event restrictions
	const getAvailableRoles = (): ("guest" | "contributor")[] => {
		if (!event.is_public) return [];
		const restriction = event.public_role_restriction || "guests_only";
		if (restriction === "guests_only") return ["guest"];
		return ["guest", "contributor"];
	};

	// Handle friend added
	const handleFriendAdded = async (friendId: string, role: EventRole) => {
		if (eventId && !addingParticipant) {
			await dispatch(
				addParticipant({
					eventId,
					userId: friendId,
					role: role || "guest",
				}),
			);
		}
	};

	// Handle join public event
	const handleJoinPublicEvent = async (role: "guest" | "contributor") => {
		if (!eventId) return;
		await dispatch(joinPublicEvent({ eventId, role }));
	};

	return (
		<AnimatedSection
			delay={0.15}
			className='bg-primary rounded-lg shadow-md p-4 md:p-6 mb-6'>
			<div className='flex flex-col md:flex-row justify-between items-start md:items-center'>
				<SectionHeader
					title='Attendees'
					count={event.participants?.length || 0}
				/>

				{/* Join Event Button (for public events, non-participants) */}
				{canJoinPublicEvent && (
					<div className='mb-6'>
						<Button onClick={() => setShowJoinModal(true)}>Join Event</Button>
						<JoinEventModal
							isOpen={showJoinModal}
							onClose={() => setShowJoinModal(false)}
							onJoin={async role => {
								await handleJoinPublicEvent(role);
								setShowJoinModal(false);
							}}
							availableRoles={getAvailableRoles()}
							eventTitle={event.title}
							loading={joiningEvent}
						/>
					</div>
				)}
			</div>

			{/* Friend Selector (only for users with manage permissions) */}
			{canManage && (
				<div className='mb-6'>
					<FriendSelector
						selectedFriends={selectedFriends}
						onSelectionChange={onSelectionChange}
						onFriendAdded={handleFriendAdded}
						excludeIds={event.participants?.map(p => p.user_id) || []}
						hideSelectedChips={true}
					/>
				</div>
			)}

			{event.participants && event.participants.length > 0 ?
				<div className='grid grid-cols-1 md:grid-cols-2 gap-3'>
					{event.participants.map(participant => {
						return (
							<article key={participant.id}>
								<ParticipantCard participant={participant} />
							</article>
						);
					})}
				</div>
			:	<EmptyState
					icon={<FaUsers className='w-16 h-16' />}
					title='No attendees yet'
					message="This event doesn't have any attendees yet. Add friends to invite them to your event!"
				/>
			}
		</AnimatedSection>
	);
};
