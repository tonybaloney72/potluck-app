import { AnimatedSection } from "../common/AnimatedSection";
import { SectionHeader } from "../common/SectionHeader";
import { EmptyState } from "../common/EmptyState";
import { FriendSelector, type SelectedFriend } from "../common/FriendSelector";
import type { Event, EventParticipant, EventRole } from "../../types";
import { hasManagePermission } from "../../utils/events";
import { FaUsers } from "react-icons/fa";
import { ParticipantCard } from "./ParticipantCard";

interface ParticipantsSectionProps {
	event: Event;
	currentUserParticipant: EventParticipant | undefined;
	currentUserId: string | undefined;
	onRemoveParticipant: (userId: string, userName: string) => void;
	onUpdateParticipantRole: (
		participantId: string,
		userId: string,
		role: EventRole,
	) => void;
	updatingRole?: string | null;
	selectedFriends: SelectedFriend[];
	onSelectionChange: (friends: SelectedFriend[]) => void;
	onFriendAdded?: (friendId: string, role: EventRole) => void;
}

export const ParticipantsSection = ({
	event,
	currentUserParticipant,
	currentUserId,
	onRemoveParticipant,
	onUpdateParticipantRole,
	updatingRole,
	selectedFriends,
	onSelectionChange,
	onFriendAdded,
}: ParticipantsSectionProps) => {
	const canManage = hasManagePermission(currentUserParticipant?.role);

	return (
		<AnimatedSection
			delay={0.15}
			className='bg-primary rounded-lg shadow-md p-4 md:p-6 mb-6'>
			<SectionHeader
				title='Attendees'
				count={event.participants?.length || 0}
			/>

			{/* Friend Selector (only for users with manage permissions) */}
			{canManage && (
				<div className='mb-6'>
					<FriendSelector
						selectedFriends={selectedFriends}
						onSelectionChange={onSelectionChange}
						onFriendAdded={onFriendAdded}
						excludeIds={event.participants?.map(p => p.user_id) || []}
						hideSelectedChips={true}
					/>
				</div>
			)}

			{event.participants && event.participants.length > 0 ?
				<div className='grid grid-cols-1 md:grid-cols-2 gap-3'>
					{event.participants.map(participant => {
						return (
							<ParticipantCard
								participant={participant}
								currentUserId={currentUserId}
								canManage={canManage}
								onRemoveParticipant={onRemoveParticipant}
								onUpdateParticipantRole={onUpdateParticipantRole}
								updatingRole={updatingRole}
							/>
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
