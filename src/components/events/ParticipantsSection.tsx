import { useState, useEffect } from "react";
import { useNavigate, useParams } from "react-router";
import { useAppDispatch, useAppSelector } from "../../store/hooks";
import {
	addParticipant,
	joinPublicEvent,
	removeParticipant,
} from "../../store/slices/eventsSlice";
import { selectEventById } from "../../store/selectors/eventsSelectors";
import {
	selectHasPendingRequestForEvent,
	addPendingRequestRealtime,
	fetchUserPendingRequests,
} from "../../store/slices/pendingRequestsSlice";
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
	const navigate = useNavigate();

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

	// Fetch user's own pending requests when component mounts
	useEffect(() => {
		if (currentUserId) {
			dispatch(fetchUserPendingRequests());
		}
	}, [dispatch, currentUserId]);

	// Check if user has a pending request for this event
	const hasPendingRequest = useAppSelector(state =>
		eventId && currentUserId ?
			selectHasPendingRequestForEvent(state, eventId, currentUserId)
		:	false,
	);

	// Check if user can join this public event
	const canJoinPublicEvent =
		event.is_public && !currentUserParticipant && !hasPendingRequest;

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
	const handleJoinPublicEvent = async (
		role: "guest" | "contributor",
		contribution?: {
			itemName: string;
			quantity?: string;
			description?: string;
		},
	) => {
		if (!eventId) return;
		try {
			const result = await dispatch(
				joinPublicEvent({ eventId, role, contribution }),
			).unwrap();

			// If a pending request was created, add it to the pending requests state
			if (result.pending && result.pendingRequest) {
				dispatch(addPendingRequestRealtime(result.pendingRequest));
			}
		} catch (error) {
			console.error("Failed to join event:", error);
			// Error is already stored in Redux state, but we log it here for debugging
		}
	};

	const handleLeaveEvent = async () => {
		if (!eventId || !currentUserId || !currentUserParticipant) return;

		// Prevent hosts from leaving events they created
		if (event.created_by === currentUserId) {
			console.error("Hosts cannot leave events they created");
			return;
		}
		try {
			await dispatch(
				removeParticipant({
					eventId,
					userId: currentUserId,
				}),
			);
			navigate("/");
		} catch (error) {
			console.error("Failed to leave event:", error);
		}
	};

	return (
		<AnimatedSection
			delay={0.15}
			className='bg-primary rounded-lg shadow-md p-4 md:p-6 mb-6'>
			<div className='flex flex-col md:flex-row justify-between items-start md:items-center mb-4'>
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
							onJoin={async (role, contribution) => {
								await handleJoinPublicEvent(role, contribution);
								setShowJoinModal(false);
							}}
							availableRoles={getAvailableRoles()}
							eventTitle={event.title}
							loading={joiningEvent}
						/>
					</div>
				)}
				{hasPendingRequest && <p>You have a pending request for this event.</p>}
				{/* Leave event button (for participants, but not hosts) */}
				{currentUserParticipant && event.created_by !== currentUserId && (
					<Button onClick={handleLeaveEvent}>Leave Event</Button>
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
