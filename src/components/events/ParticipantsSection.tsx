import { useState } from "react";
import { AnimatedSection } from "../common/AnimatedSection";
import { SectionHeader } from "../common/SectionHeader";
import { EmptyState } from "../common/EmptyState";
import { FriendSelector, type SelectedFriend } from "../common/FriendSelector";
import type { Event, EventParticipant, EventRole } from "../../types";
import { hasManagePermission } from "../../utils/events";
import { FaUsers } from "react-icons/fa";
import { ParticipantCard } from "./ParticipantCard";
import { Button } from "../common/Button";
import { JoinEventModal } from "./JoinEventModal";

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
	onJoinEvent?: (role: "guest" | "contributor") => Promise<void>;
	joiningEvent?: boolean;
	onApproveContributor?: (participantId: string) => Promise<void>;
	onDenyContributor?: (participantId: string) => Promise<void>;
	approvingContributor?: string | null;
	denyingContributor?: string | null;
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
	onJoinEvent,
	joiningEvent = false,
	onApproveContributor,
	onDenyContributor,
	approvingContributor,
	denyingContributor,
}: ParticipantsSectionProps) => {
	const canManage = hasManagePermission(currentUserParticipant?.role);
	const [showJoinModal, setShowJoinModal] = useState(false);

	// Check if user can join this public event
	const canJoinPublicEvent =
		event.is_public && !currentUserParticipant && currentUserId && onJoinEvent;

	// Determine available roles based on event restrictions
	const getAvailableRoles = (): ("guest" | "contributor")[] => {
		if (!event.is_public) return [];
		const restriction = event.public_role_restriction || "guests_only";
		if (restriction === "guests_only") return ["guest"];
		return ["guest", "contributor"];
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
								if (onJoinEvent) {
									await onJoinEvent(role);
									setShowJoinModal(false);
								}
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
							<article key={participant.id}>
								<ParticipantCard
									participant={participant}
									currentUserId={currentUserId}
									canManage={canManage}
									onRemoveParticipant={onRemoveParticipant}
									onUpdateParticipantRole={onUpdateParticipantRole}
									updatingRole={updatingRole}
									onApproveContributor={onApproveContributor}
									onDenyContributor={onDenyContributor}
									approvingContributor={approvingContributor}
									denyingContributor={denyingContributor}
								/>
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
