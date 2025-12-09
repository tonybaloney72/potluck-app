import { useState, useEffect, useRef } from "react";
import type { EventParticipant, EventRole } from "../../types";
import { motion, AnimatePresence } from "motion/react";
import { DeleteButton } from "../common/DeleteButton";
import { Avatar } from "../common/Avatar";
import { RoleSelector } from "./RoleSelector";
import { FriendCard } from "../friends/FriendCard";

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
}

export const ParticipantCard = ({
	participant,
	currentUserId,
	canManage,
	onRemoveParticipant,
	onUpdateParticipantRole,
	updatingRole,
}: ParticipantCardProps) => {
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

	const handleToggleFriend = () => {
		// Prevent opening friend card for current user's own card
		if (!isNotCurrentUser) return;
		setIsFriendOpen(!isFriendOpen);
	};

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
					<span
						onClick={handleToggleFriend}
						className={isNotCurrentUser ? "cursor-pointer" : "cursor-default"}>
						<Avatar user={participant.user} size='md' />
					</span>
					<div className='flex-1 min-w-0'>
						<p
							className={
								isNotCurrentUser ?
									"font-semibold text-primary mb-1 sm:mb-0 cursor-pointer"
								:	"font-semibold text-primary mb-1 sm:mb-0"
							}
							onClick={handleToggleFriend}>
							{participant.user?.name || "Unknown"}
						</p>
						{/* Mobile: Stack role and RSVP vertically */}
						<div className='flex flex-col gap-1 sm:gap-2'>
							<div className='flex items-center gap-2'>
								<p className='text-xs text-tertiary capitalize'>
									{participant.role}
								</p>
								<span className='inline text-xs text-tertiary'>•</span>
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
