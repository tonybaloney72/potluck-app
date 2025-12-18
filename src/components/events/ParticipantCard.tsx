import { useState, useEffect, useRef, memo } from "react";
import { useNavigate } from "react-router";
import type { EventParticipant, EventRole } from "../../types";
import { motion, AnimatePresence } from "motion/react";
import { DeleteButton } from "../common/DeleteButton";
import { Avatar } from "../common/Avatar";
import { RoleSelector } from "./RoleSelector";
import { FriendCard } from "../friends/FriendCard";
import { Button } from "../common/Button";
import { FaCheck, FaTimes } from "react-icons/fa";

interface ParticipantCardProps {
	participant: EventParticipant;
	currentUserId: string | undefined;
	canManage: boolean;
	onRemoveParticipant: (userId: string, userName: string) => void;
	onUpdateParticipantRole: (
		participantId: string,
		userId: string,
		role: EventRole,
	) => void;
	updatingRole?: string | null;
	onApproveContributor?: (participantId: string) => Promise<void>;
	onDenyContributor?: (participantId: string) => Promise<void>;
	approvingContributor?: string | null;
	denyingContributor?: string | null;
}

const ParticipantCardComponent = ({
	participant,
	currentUserId,
	canManage,
	onRemoveParticipant,
	onUpdateParticipantRole,
	updatingRole,
	onApproveContributor,
	onDenyContributor,
	approvingContributor,
	denyingContributor,
}: ParticipantCardProps) => {
	const navigate = useNavigate();
	const [isFriendOpen, setIsFriendOpen] = useState(false);
	const [openAbove, setOpenAbove] = useState(false);
	const friendCardRef = useRef<HTMLDivElement>(null);
	const friendCardContentRef = useRef<HTMLDivElement>(null);
	const isNotCurrentUser = participant.user_id !== currentUserId;
	const isHost = participant.role === "host";
	const isPendingContributor =
		participant.role === "contributor" &&
		participant.approval_status === "pending";

	// Can only modify roles if user has manage permission, it's not the current user, and the participant is not a host
	const canModifyRole =
		canManage && isNotCurrentUser && !isHost && !isPendingContributor;
	// Can only remove participants if user has manage permission, it's not the current user, and the participant is not a host
	const canRemoveParticipant = canManage && isNotCurrentUser && !isHost;
	// Can approve/deny if user has manage permission and participant is pending contributor
	const canApproveDeny =
		canManage &&
		isPendingContributor &&
		onApproveContributor &&
		onDenyContributor;

	useEffect(() => {
		if (!isFriendOpen) return;

		const handleClickOutside = (event: MouseEvent) => {
			if (
				friendCardRef.current &&
				!friendCardRef.current.contains(event.target as Node)
			) {
				setIsFriendOpen(false);
			}
		};

		document.addEventListener("mousedown", handleClickOutside);
		return () => {
			document.removeEventListener("mousedown", handleClickOutside);
		};
	}, [isFriendOpen]);

	// Calculate position when FriendCard opens
	useEffect(() => {
		if (!isFriendOpen || !friendCardRef.current) return;

		// Use a small delay to ensure the DOM has updated
		const timeoutId = setTimeout(() => {
			if (!friendCardRef.current) return;

			const cardRect = friendCardRef.current.getBoundingClientRect();
			const viewportHeight = window.innerHeight;
			const spaceBelow = viewportHeight - cardRect.bottom;
			const spaceAbove = cardRect.top;

			// Estimate FriendCard height (approximately 200px based on typical content)
			// We'll check actual height if available, otherwise use estimate
			const estimatedFriendCardHeight = 200;
			const friendCardHeight =
				friendCardContentRef.current?.offsetHeight || estimatedFriendCardHeight;

			// If there's not enough space below but there is above, open above
			// Add a small buffer (20px) for spacing
			if (
				spaceBelow < friendCardHeight + 20 &&
				spaceAbove > friendCardHeight + 20
			) {
				setOpenAbove(true);
			} else {
				setOpenAbove(false);
			}
		}, 0);

		return () => clearTimeout(timeoutId);
	}, [isFriendOpen]);

	return (
		<article
			className='p-3 bg-secondary rounded-lg relative'
			ref={friendCardRef}>
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
							label={`Remove attendee ${participant.user?.name || "Unknown"}`}
						/>
					</div>
				)}

				{/* Main content */}
				<div className='flex gap-3 pr-8 sm:pr-0'>
					<button
						onClick={e => {
							if (isNotCurrentUser && participant.user?.id) {
								e.stopPropagation();
								navigate(`/profile/${participant.user.id}`);
							}
						}}
						className={
							isNotCurrentUser ?
								"cursor-pointer hover:opacity-80 transition-opacity"
							:	"cursor-default"
						}>
						<Avatar user={participant.user} size='md' />
					</button>
					<div className='flex-1 min-w-0'>
						<div
							onClick={e => {
								if (isNotCurrentUser && participant.user?.id) {
									e.stopPropagation();
									navigate(`/profile/${participant.user.id}`);
								}
							}}
							className={
								isNotCurrentUser ?
									"font-semibold text-primary mb-1 sm:mb-0 cursor-pointer hover:opacity-80 transition-opacity text-left"
								:	"font-semibold text-primary mb-1 sm:mb-0 text-left"
							}>
							{participant.user?.name || "Unknown"}

							<span className='inline text-xs text-tertiary mx-1'>•</span>
							<span className='text-xs text-tertiary capitalize'>
								{participant.rsvp_status}
							</span>
						</div>
						{/* Mobile: Stack role and RSVP vertically */}
						<div className='flex flex-col gap-1 sm:gap-2'>
							<div className='flex items-center gap-2'>
								{isPendingContributor ?
									<div className='flex items-center gap-2'>
										<span className='text-xs text-orange-500 font-medium'>
											Pending Approval
										</span>
										<span className='text-xs text-tertiary capitalize'>
											{participant.role}
										</span>
									</div>
								: canModifyRole ?
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
								:	<p className='text-xs text-tertiary capitalize'>
										{participant.role}
									</p>
								}
							</div>
							{/* Approve/Deny buttons for pending contributors */}
							{canApproveDeny && (
								<div className='flex gap-2 mt-2'>
									<Button
										variant='primary'
										onClick={() => onApproveContributor(participant.id)}
										loading={approvingContributor === participant.id}
										disabled={
											approvingContributor === participant.id ||
											denyingContributor === participant.id
										}
										className='flex items-center gap-1 text-xs px-2 py-1 min-h-[32px]'>
										<FaCheck className='w-3 h-3' />
										Approve
									</Button>
									<Button
										variant='secondary'
										onClick={() => onDenyContributor(participant.id)}
										loading={denyingContributor === participant.id}
										disabled={
											approvingContributor === participant.id ||
											denyingContributor === participant.id
										}
										className='flex items-center gap-1 text-xs px-2 py-1 min-h-[32px]'>
										<FaTimes className='w-3 h-3' />
										Deny
									</Button>
								</div>
							)}
						</div>
					</div>
				</div>
			</motion.div>
			<AnimatePresence>
				{isFriendOpen && participant.user?.id && isNotCurrentUser && (
					<motion.div
						ref={friendCardContentRef}
						initial={{ opacity: 0, y: openAbove ? -20 : 20 }}
						animate={{ opacity: 1, y: 0 }}
						exit={{ opacity: 0, y: openAbove ? -20 : 20 }}
						transition={{ duration: 0.3, ease: "easeInOut" }}
						className={`absolute left-0 z-50 w-full max-w-md ${
							openAbove ? "bottom-full mb-2" : "top-full mt-2"
						}`}>
						<FriendCard
							profile={participant.user}
							forceVertical={true}
							limitedActions={true}
						/>
					</motion.div>
				)}
			</AnimatePresence>
		</article>
	);
};

// Memoize to prevent unnecessary re-renders when props haven't changed
export const ParticipantCard = memo(
	ParticipantCardComponent,
	(prevProps, nextProps) => {
		// Custom comparison function - only re-render if these props change
		return (
			prevProps.participant.id === nextProps.participant.id &&
			prevProps.participant.role === nextProps.participant.role &&
			prevProps.participant.approval_status ===
				nextProps.participant.approval_status &&
			prevProps.participant.rsvp_status === nextProps.participant.rsvp_status &&
			prevProps.currentUserId === nextProps.currentUserId &&
			prevProps.canManage === nextProps.canManage &&
			prevProps.updatingRole === nextProps.updatingRole &&
			prevProps.approvingContributor === nextProps.approvingContributor &&
			prevProps.denyingContributor === nextProps.denyingContributor
		);
	},
);
