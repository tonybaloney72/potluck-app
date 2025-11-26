import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router";
import { useAppDispatch, useAppSelector } from "../store/hooks";
import { FaArrowLeft, FaEdit, FaTimes } from "react-icons/fa";
import {
	fetchEventById,
	updateRSVP,
	addComment,
	deleteComment,
	addContribution,
	deleteContribution,
	addParticipant,
	removeParticipant,
	deleteEvent,
	updateEvent,
	updateParticipantRole,
	clearError,
} from "../store/slices/eventsSlice";
import { ErrorDisplay } from "../components/common/ErrorDisplay";
import { Button } from "../components/common/Button";
import { ConfirmModal } from "../components/common/ConfirmModal";
import { useEventDetailsRealtime } from "../hooks/useEventDetailsRealtime";
import type { SelectedFriend } from "../components/common/FriendSelector";
import { EventHeader } from "../components/events/EventHeader";
import { ParticipantsSection } from "../components/events/ParticipantsSection";
import { ContributionsSection } from "../components/events/ContributionsSection";
import { CommentsSection } from "../components/events/CommentsSection";
import { canAddContributions, hasManagePermission } from "../utils/events";
import type { EventRole, RSVPStatus } from "../types";
import { SkeletonEventDetails } from "../components/common/Skeleton";

// Confirmation modal type - consolidated state
type ConfirmationModal =
	| { type: "deleteEvent" }
	| { type: "deleteComment"; commentId: string }
	| { type: "deleteContribution"; contributionId: string }
	| { type: "removeParticipant"; userId: string; userName: string }
	| null;

export const EventDetailPage = () => {
	const { eventId } = useParams<{ eventId: string }>();
	const navigate = useNavigate();
	const dispatch = useAppDispatch();
	const {
		currentEvent,
		loading,
		updatingRSVP,
		addingComment,
		addingContribution,
		addingParticipant,
		deletingComment,
		deletingContribution,
		updatingEvent,
		updatingRole,
		error,
	} = useAppSelector(state => state.events);
	const { user } = useAppSelector(state => state.auth);

	// Consolidated confirmation modal state
	const [confirmationModal, setConfirmationModal] =
		useState<ConfirmationModal>(null);

	// Track selected friends for the FriendSelector component
	const [selectedFriends, setSelectedFriends] = useState<SelectedFriend[]>([]);

	// Track editing state for EventHeader
	const [isEditing, setIsEditing] = useState(false);

	useEventDetailsRealtime(eventId || null);

	useEffect(() => {
		if (!eventId) return;

		// If we already have this event as currentEvent, no need to fetch again
		if (currentEvent?.id === eventId) {
			return;
		}

		// Fetch the event to get full details including comments and contributions
		dispatch(fetchEventById(eventId));
	}, [dispatch, eventId, currentEvent]);

	// Filter out friends that have been added as participants
	// This ensures they don't appear in the selected chips after being added
	useEffect(() => {
		if (currentEvent?.participants) {
			const participantIds = new Set(
				currentEvent.participants.map(p => p.user_id),
			);
			setSelectedFriends(prev =>
				prev.filter(f => !participantIds.has(f.friendId)),
			);
		}
	}, [currentEvent?.participants]);

	// Show loading if:
	// 1. We're actively loading, OR
	// 2. We have an eventId but currentEvent doesn't match (still fetching)
	const isLoading = loading || (eventId && currentEvent?.id !== eventId);

	if (isLoading) {
		return <SkeletonEventDetails />;
	}

	// Early return if no event after loading is complete
	if (!currentEvent) {
		return (
			<div className='bg-secondary p-4 md:p-8'>
				<div className='max-w-4xl mx-auto'>
					{error ? (
						<ErrorDisplay
							title='Failed to load event'
							message={error}
							onRetry={() => {
								dispatch(clearError());
								if (eventId) {
									dispatch(fetchEventById(eventId));
								}
							}}
							variant='fullscreen'
						/>
					) : (
						<ErrorDisplay
							title='Event not found'
							message='The event you are looking for does not exist or has been deleted.'
							variant='fullscreen'
						/>
					)}
				</div>
			</div>
		);
	}

	// At this point, TypeScript knows currentEvent is not null due to early return above
	// Find current user's participant record
	const currentUserParticipant = currentEvent.participants?.find(
		p => p.user_id === user?.id,
	);

	const formatDateTime = (datetimeString: string) => {
		const date = new Date(datetimeString);
		const dateStr = date.toLocaleDateString("en-US", {
			weekday: "long",
			year: "numeric",
			month: "long",
			day: "numeric",
		});
		const timeStr = date.toLocaleTimeString("en-US", {
			hour: "numeric",
			minute: "2-digit",
			hour12: true,
		});
		return { date: dateStr, time: timeStr };
	};

	const handleRSVP = async (status: RSVPStatus) => {
		if (eventId) {
			await dispatch(updateRSVP({ eventId, rsvpStatus: status }));
			// No need to refetch - state is updated optimistically
		}
	};

	// Unified delete handler - sets confirmation modal
	const handleDelete = (
		type:
			| "deleteEvent"
			| "deleteComment"
			| "deleteContribution"
			| "removeParticipant",
		data?: {
			commentId?: string;
			contributionId?: string;
			userId?: string;
			userName?: string;
		},
	) => {
		switch (type) {
			case "deleteEvent":
				setConfirmationModal({ type: "deleteEvent" });
				break;
			case "deleteComment":
				if (data?.commentId) {
					setConfirmationModal({
						type: "deleteComment",
						commentId: data.commentId,
					});
				}
				break;
			case "deleteContribution":
				if (data?.contributionId) {
					setConfirmationModal({
						type: "deleteContribution",
						contributionId: data.contributionId,
					});
				}
				break;
			case "removeParticipant":
				if (data?.userId && data?.userName) {
					// Prevent removing hosts
					const participantToRemove = currentEvent?.participants?.find(
						p => p.user_id === data.userId,
					);
					if (participantToRemove?.role === "host") {
						return; // Don't allow removing the host
					}
					setConfirmationModal({
						type: "removeParticipant",
						userId: data.userId,
						userName: data.userName,
					});
				}
				break;
		}
	};

	// Unified confirm delete handler
	const handleConfirmDelete = async () => {
		if (!confirmationModal || !eventId) return;

		switch (confirmationModal.type) {
			case "deleteEvent": {
				const result = await dispatch(deleteEvent(eventId));
				if (deleteEvent.fulfilled.match(result)) {
					navigate("/");
				}
				break;
			}
			case "deleteComment":
				await dispatch(deleteComment(confirmationModal.commentId));
				break;
			case "deleteContribution":
				await dispatch(deleteContribution(confirmationModal.contributionId));
				break;
			case "removeParticipant": {
				if (!currentEvent) return;
				// Prevent removing hosts
				const participantToRemove = currentEvent.participants?.find(
					p => p.user_id === confirmationModal.userId,
				);
				if (participantToRemove?.role === "host") {
					return; // Don't allow removing the host
				}
				await dispatch(
					removeParticipant({ eventId, userId: confirmationModal.userId }),
				);
				break;
			}
		}
		setConfirmationModal(null);
		// No need to refetch - state is updated optimistically
	};

	// Unified add handler
	const handleAdd = async (
		type: "comment" | "contribution" | "participant",
		data:
			| { content: string }
			| { itemName: string; quantity?: string; description?: string }
			| { friendId: string; role: EventRole },
	) => {
		if (!eventId) return;

		switch (type) {
			case "comment": {
				const commentData = data as { content: string };
				await dispatch(addComment({ eventId, content: commentData.content }));
				break;
			}
			case "contribution": {
				const contributionData = data as {
					itemName: string;
					quantity?: string;
					description?: string;
				};
				if (
					currentUserParticipant &&
					canAddContributions(currentUserParticipant.role)
				) {
					await dispatch(
						addContribution({
							eventId,
							itemName: contributionData.itemName,
							quantity: contributionData.quantity || undefined,
							description: contributionData.description || undefined,
						}),
					);
				}
				break;
			}
			case "participant": {
				const participantData = data as {
					friendId: string;
					role?: "guest" | "contributor" | "co_host";
				};
				if (!addingParticipant) {
					await dispatch(
						addParticipant({
							eventId,
							userId: participantData.friendId,
							role: participantData.role || "guest",
						}),
					);
				}
				break;
			}
		}
	};

	const handleUpdateEvent = async (updates: {
		title?: string;
		theme?: string | null;
		description?: string | null;
		event_datetime?: string;
		location?: string | null;
		location_url?: string | null;
	}) => {
		if (!eventId) return;
		await dispatch(updateEvent({ eventId, updates }));
	};

	const handleUpdateParticipantRole = async (
		participantId: string,
		userId: string,
		role: EventRole,
	) => {
		if (!eventId) return;

		// Find the participant to check their current role
		if (!currentEvent) return;
		const participant = currentEvent.participants?.find(
			p => p.id === participantId,
		);

		// Prevent changing to/from "host" role - hosts cannot be modified
		if (!participant || participant.role === "host" || role === "host") {
			return;
		}

		await dispatch(
			updateParticipantRole({
				eventId,
				userId,
				role: role as "guest" | "contributor" | "co_host",
			}),
		);
	};

	const isEventCreator = currentEvent.created_by === user?.id;
	const canEdit =
		isEventCreator || hasManagePermission(currentUserParticipant?.role);

	return (
		<div className='bg-secondary p-4 md:p-8'>
			<div className='max-w-4xl mx-auto'>
				{/* Back Button, Edit, and Delete */}
				<div className='flex justify-between items-center gap-3 mb-4'>
					<button
						onClick={() => navigate("/")}
						className='text-primary hover:text-accent transition-colors min-w-[44px] min-h-[44px] flex items-center justify-center'>
						<FaArrowLeft className='w-5 h-5 hover:cursor-pointer' />
					</button>
					{canEdit && (
						<div className='flex gap-2'>
							{isEventCreator && isEditing && (
								<Button
									variant='secondary'
									onClick={() => handleDelete("deleteEvent")}
									className='text-sm text-red-600 hover:text-red-700 min-h-[44px]'>
									Delete Event
								</Button>
							)}
							{isEventCreator && isEditing && (
								<Button
									className='flex items-center justify-center gap-2  sm:w-auto min-h-[44px]'
									type='button'
									variant='secondary'
									onClick={() => setIsEditing(false)}
									disabled={updatingEvent}>
									<FaTimes />
									Cancel
								</Button>
							)}
							{!isEditing && (
								<Button
									variant='secondary'
									onClick={() => setIsEditing(true)}
									className='text-sm flex items-center gap-2 min-h-[44px]'>
									<FaEdit className='w-4 h-4' />
									Edit Event
								</Button>
							)}
						</div>
					)}
				</div>

				{/* Event Header */}
				<EventHeader
					event={currentEvent}
					currentUserParticipant={currentUserParticipant}
					onRSVPChange={handleRSVP}
					updatingRSVP={updatingRSVP}
					formatDateTime={formatDateTime}
					canEdit={canEdit}
					onUpdateEvent={handleUpdateEvent}
					updatingEvent={updatingEvent}
					isEditing={isEditing}
					setIsEditing={setIsEditing}
				/>

				{/* Participants Section */}
				<ParticipantsSection
					event={currentEvent}
					currentUserParticipant={currentUserParticipant}
					currentUserId={user?.id}
					onRemoveParticipant={(userId, userName) =>
						handleDelete("removeParticipant", { userId, userName })
					}
					onUpdateParticipantRole={handleUpdateParticipantRole}
					updatingRole={updatingRole}
					selectedFriends={selectedFriends}
					onSelectionChange={setSelectedFriends}
					onFriendAdded={async (friendId, role) => {
						// Immediately dispatch addParticipant when a friend is added
						if (eventId && !addingParticipant) {
							await dispatch(
								addParticipant({
									eventId,
									userId: friendId,
									role: role || "guest",
								}),
							);
							// Friend will appear in ParticipantsSection via real-time update
							// They'll be automatically filtered out from selectedFriends
							// via the useEffect that syncs with currentEvent.participants
						}
					}}
				/>

				{/* Contributions Section */}
				<ContributionsSection
					event={currentEvent}
					currentUserParticipant={currentUserParticipant}
					currentUserId={user?.id}
					onAddContribution={data => handleAdd("contribution", data)}
					onDeleteContribution={contributionId =>
						handleDelete("deleteContribution", { contributionId })
					}
					addingContribution={addingContribution}
					deletingContribution={deletingContribution}
				/>

				{/* Comments Section */}
				<CommentsSection
					event={currentEvent}
					currentUserParticipant={currentUserParticipant}
					currentUserId={user?.id}
					onAddComment={data => handleAdd("comment", data)}
					onDeleteComment={commentId =>
						handleDelete("deleteComment", { commentId })
					}
					addingComment={addingComment}
					deletingComment={deletingComment}
				/>

				{/* Consolidated Confirmation Modal */}
				{confirmationModal && (
					<ConfirmModal
						isOpen={!!confirmationModal}
						onClose={() => setConfirmationModal(null)}
						onConfirm={handleConfirmDelete}
						title={
							confirmationModal.type === "deleteEvent"
								? "Delete Event"
								: confirmationModal.type === "deleteComment"
								? "Delete Comment"
								: confirmationModal.type === "deleteContribution"
								? "Delete Contribution"
								: "Remove Attendee"
						}
						message={
							confirmationModal.type === "deleteEvent"
								? "Are you sure you want to delete this event? This action cannot be undone."
								: confirmationModal.type === "deleteComment"
								? "Are you sure you want to delete this comment? This action cannot be undone."
								: confirmationModal.type === "deleteContribution"
								? "Are you sure you want to delete this contribution? This action cannot be undone."
								: `Are you sure you want to remove ${confirmationModal.userName} from this event? This action cannot be undone.`
						}
						confirmText={
							confirmationModal.type === "removeParticipant"
								? "Remove"
								: "Delete"
						}
						confirmVariant='secondary'
					/>
				)}
			</div>
		</div>
	);
};
