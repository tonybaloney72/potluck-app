import { useState, useEffect, useRef, memo } from "react";
import { useNavigate, useParams } from "react-router";
import { useAppDispatch, useAppSelector } from "../../store/hooks";
import {
	removeParticipant,
	updateParticipantRole,
} from "../../store/slices/eventsSlice";
import { selectEventById } from "../../store/selectors/eventsSelectors";
import { hasManagePermission } from "../../utils/events";
import type { EventParticipant, EventRole } from "../../types";
import { motion, AnimatePresence } from "motion/react";
import { DeleteButton } from "../common/DeleteButton";
import { ConfirmModal } from "../common/ConfirmModal";
import { Avatar } from "../common/Avatar";
import { RoleSelector } from "./RoleSelector";
import { FriendCard } from "../friends/FriendCard";

interface ParticipantCardProps {
	participant: EventParticipant;
}

const ParticipantCardComponent = ({ participant }: ParticipantCardProps) => {
	const { eventId } = useParams<{ eventId: string }>();
	const dispatch = useAppDispatch();
	const navigate = useNavigate();

	// Get event from Redux store
	const event = useAppSelector(state =>
		eventId ? selectEventById(state, eventId) : null,
	);

	// Get current user ID
	const currentUserId = useAppSelector(state => state.auth.user?.id);

	// Get loading states
	const updatingRole = useAppSelector(state => state.events.updatingRole);

	// Compute current user participant
	const currentUserParticipant = event?.participants?.find(
		p => p.user_id === currentUserId,
	);

	// Compute canManage
	const canManage = hasManagePermission(currentUserParticipant?.role);

	const [isFriendOpen, setIsFriendOpen] = useState(false);
	const [openAbove, setOpenAbove] = useState(false);
	const friendCardRef = useRef<HTMLDivElement>(null);
	const friendCardContentRef = useRef<HTMLDivElement>(null);
	const isNotCurrentUser = participant.user_id !== currentUserId;
	const isHost = participant.role === "host";

	// Can only modify roles if user has manage permission, it's not the current user, and the participant is not a host
	const canModifyRole = canManage && isNotCurrentUser && !isHost;
	// Can only remove participants if user has manage permission, it's not the current user, and the participant is not a host
	const canRemoveParticipant = canManage && isNotCurrentUser && !isHost;
	// Can approve/deny if user has manage permission and participant is pending contributor

	const [showRemoveModal, setShowRemoveModal] = useState(false);

	const handleRemoveClick = () => {
		// Prevent removing hosts
		if (participant.role === "host") {
			return;
		}
		setShowRemoveModal(true);
	};

	const handleConfirmRemove = async () => {
		if (!eventId || participant.role === "host") return;
		await dispatch(
			removeParticipant({
				eventId,
				userId: participant.user_id,
			}),
		);
		setShowRemoveModal(false);
	};

	// Handle update participant role
	const handleUpdateParticipantRole = async (
		participantId: string,
		userId: string,
		role: EventRole,
	) => {
		if (!eventId) return;
		// Find the participant to check their current role
		const participantToUpdate = event?.participants?.find(
			p => p.id === participantId,
		);
		// Prevent changing to/from "host" role - hosts cannot be modified
		if (
			!participantToUpdate ||
			participantToUpdate.role === "host" ||
			role === "host"
		) {
			return;
		}
		await dispatch(
			updateParticipantRole({
				eventId,
				userId,
				role: role as "guest" | "contributor" | "co-host",
			}),
		);
	};

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
							onDelete={handleRemoveClick}
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
								{canModifyRole ?
									<RoleSelector
										value={participant.role}
										onChange={role => {
											handleUpdateParticipantRole(
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

			{/* Remove Participant Confirmation Modal */}
			{showRemoveModal && (
				<ConfirmModal
					isOpen={showRemoveModal}
					onClose={() => setShowRemoveModal(false)}
					onConfirm={handleConfirmRemove}
					title='Remove Attendee'
					message={`Are you sure you want to remove ${participant.user?.name || "this attendee"} from this event? This action cannot be undone.`}
					confirmText='Remove'
					confirmVariant='secondary'
				/>
			)}
		</article>
	);
};

// Memoize to prevent unnecessary re-renders when props haven't changed
export const ParticipantCard = memo(
	ParticipantCardComponent,
	(prevProps, nextProps) => {
		// Custom comparison function - only re-render if participant data changes
		return (
			prevProps.participant.id === nextProps.participant.id &&
			prevProps.participant.role === nextProps.participant.role &&
			prevProps.participant.rsvp_status === nextProps.participant.rsvp_status
		);
	},
);
