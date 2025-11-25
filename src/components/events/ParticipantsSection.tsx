import { AnimatedSection } from "../common/AnimatedSection";
import { SectionHeader } from "../common/SectionHeader";
import { EmptyState } from "../common/EmptyState";
import { Avatar } from "../common/Avatar";
import { DeleteButton } from "../common/DeleteButton";
import { Button } from "../common/Button";
import type { Event, EventParticipant, EventRole } from "../../types";
import { hasManagePermission } from "../../utils/events";
import { RoleSelector } from "./RoleSelector";

interface ParticipantsSectionProps {
	event: Event;
	currentUserParticipant: EventParticipant | undefined;
	currentUserId: string | undefined;
	onAddParticipant: () => void;
	onRemoveParticipant: (userId: string, userName: string) => void;
	onUpdateParticipantRole: (
		participantId: string,
		userId: string,
		role: EventRole,
	) => void;
	addingParticipant: boolean;
	updatingRole?: string | null;
}

export const ParticipantsSection = ({
	event,
	currentUserParticipant,
	currentUserId,
	onAddParticipant,
	onRemoveParticipant,
	onUpdateParticipantRole,
	addingParticipant,
	updatingRole,
}: ParticipantsSectionProps) => {
	const canManage = hasManagePermission(currentUserParticipant?.role);

	const actionButton = canManage ? (
		<Button
			onClick={onAddParticipant}
			disabled={addingParticipant}
			loading={addingParticipant}
			className='text-sm'>
			Add
		</Button>
	) : undefined;

	return (
		<AnimatedSection
			delay={0.15}
			className='bg-primary rounded-lg shadow-md p-6 mb-6'>
			<SectionHeader
				title='Attendees'
				count={event.participants?.length || 0}
				actionButton={actionButton}
			/>

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
							<div
								key={participant.id}
								className='p-3 bg-secondary rounded-lg flex items-center justify-between relative'>
								<div className='flex-1 flex items-center gap-3'>
									<Avatar user={participant.user} size='md' />
									<div className='flex-1'>
										<p className='font-semibold text-primary'>
											{participant.user?.name || "Unknown"}
										</p>
										<div className='flex items-center gap-2'>
											{canModifyRole ? (
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
													className='text-xs py-1'
												/>
											) : (
												<p className='text-xs text-tertiary capitalize'>
													{participant.role}
												</p>
											)}
											<span className='text-xs text-tertiary'>•</span>
											<p className='text-xs text-tertiary capitalize'>
												{participant.rsvp_status}
											</p>
										</div>
									</div>
								</div>
								{canRemoveParticipant && (
									<DeleteButton
										variant='icon'
										onDelete={() =>
											onRemoveParticipant(
												participant.user_id,
												participant.user?.name || "Unknown",
											)
										}
										label='Remove attendee'
									/>
								)}
							</div>
						);
					})}
				</div>
			) : (
				<EmptyState message='No attendees yet.' />
			)}
		</AnimatedSection>
	);
};
