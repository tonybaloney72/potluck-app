import { AnimatedSection } from "../common/AnimatedSection";
import { SectionHeader } from "../common/SectionHeader";
import { EmptyState } from "../common/EmptyState";
import { Avatar } from "../common/Avatar";
import { DeleteButton } from "../common/DeleteButton";
import { Button } from "../common/Button";
import type { Event, EventParticipant } from "../../types";
import { hasManagePermission } from "../../utils/events";

interface ParticipantsSectionProps {
	event: Event;
	currentUserParticipant: EventParticipant | undefined;
	currentUserId: string | undefined;
	onAddParticipant: () => void;
	onRemoveParticipant: (userId: string, userName: string) => void;
	addingParticipant: boolean;
}

export const ParticipantsSection = ({
	event,
	currentUserParticipant,
	currentUserId,
	onAddParticipant,
	onRemoveParticipant,
	addingParticipant,
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

						return (
							<div
								key={participant.id}
								className='p-3 bg-secondary rounded-lg flex items-center justify-between relative'>
								<div className='flex items-center gap-3'>
									<Avatar user={participant.user} size='md' />
									<div>
										<p className='font-semibold text-primary'>
											{participant.user?.name || "Unknown"}
										</p>
										<p className='text-xs text-tertiary capitalize'>
											{participant.role} • {participant.rsvp_status}
										</p>
									</div>
								</div>
								{canManage && isNotCurrentUser && (
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
