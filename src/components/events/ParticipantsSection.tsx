import { AnimatedSection } from "../common/AnimatedSection";
import { SectionHeader } from "../common/SectionHeader";
import { EmptyState } from "../common/EmptyState";
import { Avatar } from "../common/Avatar";
import { DeleteButton } from "../common/DeleteButton";
import { FriendSelector, type SelectedFriend } from "../common/FriendSelector";
import type { Event, EventParticipant, EventRole } from "../../types";
import { hasManagePermission } from "../../utils/events";
import { RoleSelector } from "./RoleSelector";
import { FaUsers } from "react-icons/fa";
import { motion } from "motion/react";

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

			{event.participants && event.participants.length > 0 ? (
				<div className='grid grid-cols-1 md:grid-cols-2 gap-3'>
					{event.participants.map(participant => {
						const isNotCurrentUser = participant.user_id !== currentUserId;
						const isHost = participant.role === "host";
						// Can only modify roles if user has manage permission, it's not the current user, and the participant is not a host
						const canModifyRole = canManage && isNotCurrentUser && !isHost;
						// Can only remove participants if user has manage permission, it's not the current user, and the participant is not a host
						const canRemoveParticipant =
							canManage && isNotCurrentUser && !isHost;

						return (
							<article
								key={participant.id}
								className='p-3 bg-secondary rounded-lg relative'>
								<motion.div
									initial={{ opacity: 0, y: 20 }}
									animate={{ opacity: 1, y: 0 }}
									exit={{ opacity: 0, y: -20 }}
									transition={{ duration: 0.3 }}>
									{/* Delete button in top-right corner */}
									{canRemoveParticipant && (
										<div className='absolute top-2 right-2'>
											<DeleteButton
												variant='icon'
												onDelete={() =>
													onRemoveParticipant(
														participant.user_id,
														participant.user?.name || "Unknown",
													)
												}
												label={`Remove attendee ${
													participant.user?.name || "Unknown"
												}`}
											/>
										</div>
									)}

									{/* Main content */}
									<div className='flex gap-3 pr-8 sm:pr-0'>
										<Avatar user={participant.user} size='md' />
										<div className='flex-1 min-w-0'>
											<p className='font-semibold text-primary mb-1 sm:mb-0'>
												{participant.user?.name || "Unknown"}
											</p>
											{/* Mobile: Stack role and RSVP vertically */}
											<div className='flex flex-col gap-1 sm:gap-2'>
												<div className='flex items-center gap-2'>
													<p className='text-xs text-tertiary capitalize'>
														{participant.role}
													</p>
													<span className='inline text-xs text-tertiary'>
														•
													</span>
													<p className='text-xs text-tertiary capitalize'>
														{participant.rsvp_status}
													</p>
												</div>
												{canModifyRole && (
													<RoleSelector
														value={participant.role}
														onChange={role => {
															onUpdateParticipantRole(
																participant.id,
																participant.user_id,
																role,
															);
														}}
														disabled={updatingRole === participant.id}
														className='text-xs py-1 w-full sm:w-auto sm:min-w-[140px]'
													/>
												)}
											</div>
										</div>
									</div>
								</motion.div>
							</article>
						);
					})}
				</div>
			) : (
				<EmptyState
					icon={<FaUsers className='w-16 h-16' />}
					title='No attendees yet'
					message="This event doesn't have any attendees yet. Add friends to invite them to your event!"
				/>
			)}
		</AnimatedSection>
	);
};
