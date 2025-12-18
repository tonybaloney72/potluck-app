import { useEffect, useState, useRef } from "react";
import { useParams, useNavigate } from "react-router";
import { useAppDispatch, useAppSelector } from "../store/hooks";
import { FaArrowLeft, FaEdit, FaTimes, FaCheck, FaTrash } from "react-icons/fa";
import {
	fetchEventById,
	checkEventUpdated,
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
	joinPublicEvent,
	approveContributorRequest,
	denyContributorRequest,
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
import type { EventRole, RSVPStatus, PublicRoleRestriction } from "../types";
import { SkeletonEventDetails } from "../components/common/Skeleton";
import {
	selectEventById,
	selectIsEventFetching,
} from "../store/selectors/eventsSelectors";

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
		updatingRSVP,
		addingComment,
		addingContribution,
		addingParticipant,
		deletingComment,
		deletingContribution,
		updatingEvent,
		updatingRole,
		error,
		joiningPublicEvent,
		approvingContributor,
		denyingContributor,
	} = useAppSelector(state => state.events);
	const { user } = useAppSelector(state => state.auth);

	// Consolidated confirmation modal state
	const [confirmationModal, setConfirmationModal] =
		useState<ConfirmationModal>(null);

	// Track selected friends for the FriendSelector component
	const [selectedFriends, setSelectedFriends] = useState<SelectedFriend[]>([]);

	// Track editing state for EventHeader
	const [isEditing, setIsEditing] = useState(false);

	// Track which eventId we've already checked (prevents re-checking on event updates)
	const lastCheckedEventIdRef = useRef<string | null>(null);

	useEventDetailsRealtime(eventId || null);

	// Get event from URL eventId
	const event = useAppSelector(state =>
		eventId ? selectEventById(state, eventId) : null,
	);
	const isFetching = useAppSelector(state =>
		eventId ? selectIsEventFetching(state, eventId) : false,
	);

	// Single effect: Fetch event if we don't have it or are missing data
	useEffect(() => {
		if (!eventId || !user?.id) return;

		// Check if we have the event with all required data
		// The slice ensures participants, contributions, and comments are always arrays
		const hasFullData =
			event &&
			event.participants !== undefined &&
			event.contributions !== undefined &&
			event.comments !== undefined;

		if (hasFullData) {
			// Only check if we haven't already checked this eventId
			// This prevents re-checking when event updates via realtime

			if (lastCheckedEventIdRef.current !== eventId && event.updated_at) {
				lastCheckedEventIdRef.current = eventId;

				// Check if event has been updated since we last fetched
				dispatch(
					checkEventUpdated({
						eventId,
						currentUpdatedAt: event.updated_at,
					}),
				).then(result => {
					if (
						checkEventUpdated.fulfilled.match(result) &&
						result.payload.needsRefresh
					) {
						// Database has newer timestamp, fetch fresh data
						dispatch(fetchEventById(eventId));
					}
				});
			}
			return;
		}

		// Reset checked ref when we don't have full data (new event being loaded)
		lastCheckedEventIdRef.current = null;

		// If already fetching, don't fetch again
		if (isFetching) {
			return;
		}

		// Otherwise, fetch the event to get full details
		dispatch(fetchEventById(eventId));
		// eslint-disable-next-line react-hooks/exhaustive-deps
	}, [dispatch, eventId, event]);

	// Filter out friends that have been added as participants
	// This ensures they don't appear in the selected chips after being added
	useEffect(() => {
		if (event?.participants) {
			const participantIds = new Set(event.participants.map(p => p.user_id));
			setSelectedFriends(prev =>
				prev.filter(f => !participantIds.has(f.friendId)),
			);
		}
	}, [event?.participants]);

	// Show skeleton only on initial load (when we have eventId but no event)
	// Don't show skeleton during background refresh (when event exists but we're fetching updates)
	const isInitialLoad = eventId && !event && !error;

	if (isInitialLoad) {
		return <SkeletonEventDetails />;
	}

	// Early return if no event after loading is complete
	if (!event) {
		return (
			<main id='main-content' className='bg-secondary p-4 md:p-8' role='main'>
				<div className='max-w-4xl mx-auto'>
					{error && (
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
					)}
				</div>
			</main>
		);
	}

	// At this point, TypeScript knows event is not null due to early return above
	// Find current user's participant record
	const currentUserParticipant = event.participants?.find(
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
					const participantToRemove = event?.participants?.find(
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
				if (!event) return;
				// Prevent removing hosts
				const participantToRemove = event.participants?.find(
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
					role?: "guest" | "contributor" | "co-host";
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
		end_datetime?: string | null;
		status?: "active" | "completed" | "cancelled";
		location?: {
			lat: number;
			lng: number;
			address: string;
		} | null;
		public_role_restriction?: PublicRoleRestriction;
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
		if (!event) return;
		const participant = event.participants?.find(p => p.id === participantId);

		// Prevent changing to/from "host" role - hosts cannot be modified
		if (!participant || participant.role === "host" || role === "host") {
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

	const handleJoinPublicEvent = async (role: "guest" | "contributor") => {
		if (!eventId) return;
		await dispatch(joinPublicEvent({ eventId, role }));
	};

	const handleApproveContributor = async (participantId: string) => {
		if (!eventId) return;
		await dispatch(approveContributorRequest({ eventId, participantId }));
	};

	const handleDenyContributor = async (participantId: string) => {
		if (!eventId) return;
		await dispatch(denyContributorRequest({ eventId, participantId }));
	};

	const handleMarkComplete = async () => {
		try {
			await handleUpdateEvent({
				status: "completed",
			});
			setIsEditing(false);
		} catch (error) {
			console.error("Failed to update event:", error);
		}
	};

	const handleCancelEvent = async () => {
		try {
			await handleUpdateEvent({
				status: "cancelled",
			});
			setIsEditing(false);
		} catch (error) {
			console.error("Failed to cancel event:", error);
		}
	};

	const handleRestoreEvent = async () => {
		try {
			await handleUpdateEvent({
				status: "active",
			});
		} catch (error) {
			console.error("Failed to restore event:", error);
		}
	};

	const isEventCreator = event.created_by === user?.id;
	const canEdit =
		isEventCreator || hasManagePermission(currentUserParticipant?.role);

	// Check if event has started or ended (for Mark as Complete visibility)
	const canMarkComplete = (() => {
		if (!event) return false;
		if (event.status !== "active") return false;
		if (!isEditing) return false;
		if (!canEdit) return false; // Must be host or co-host

		const now = new Date();
		const eventStart = new Date(event.event_datetime);
		const eventEnd = event.end_datetime ? new Date(event.end_datetime) : null;

		// Event must have started OR have an end time that has passed
		return eventStart < now || (eventEnd !== null && eventEnd < now);
	})();

	return (
		<main
			id='main-content'
			className='bg-secondary p-4 md:p-8 min-h-0'
			role='main'>
			<div className='max-w-4xl mx-auto'>
				{/* Back Button, Edit, and Delete */}
				<div className='flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 mb-4'>
					<button
						onClick={() => navigate(-1)}
						className='text-primary hover:text-accent transition-colors min-w-[44px] min-h-[44px] flex items-center justify-center hover:cursor-pointer hover:bg-tertiary rounded-md'>
						<FaArrowLeft className='w-5 h-5' />
					</button>
					{canEdit && (
						<div className='flex flex-wrap gap-2 w-full sm:w-auto'>
							{/* Active Event - Editing Mode */}
							{event.status === "active" && isEditing && (
								<>
									<Button
										className='flex items-center justify-center gap-2 flex-1 sm:flex-none min-h-[44px]'
										type='button'
										variant='secondary'
										onClick={() => setIsEditing(false)}
										disabled={updatingEvent}>
										<FaTimes className='w-4 h-4' />
										<span className='hidden sm:inline'>Discard Changes</span>
										<span className='sm:hidden'>Discard</span>
									</Button>
									{canMarkComplete && (
										<Button
											variant='secondary'
											onClick={handleMarkComplete}
											className='flex items-center justify-center gap-2 flex-1 sm:flex-none min-h-[44px]'>
											<FaCheck className='w-4 h-4' />
											<span className='hidden sm:inline'>Mark as Complete</span>
											<span className='sm:hidden'>Complete</span>
										</Button>
									)}
									{isEventCreator && (
										<Button
											variant='secondary'
											onClick={handleCancelEvent}
											className='flex items-center justify-center gap-2 flex-1 sm:flex-none min-h-[44px]'>
											<FaTimes className='w-4 h-4' />
											<span className='hidden sm:inline'>Cancel Event</span>
											<span className='sm:hidden'>Cancel</span>
										</Button>
									)}
								</>
							)}

							{/* Active Event - View Mode */}
							{event.status === "active" && !isEditing && (
								<Button
									variant='secondary'
									onClick={() => setIsEditing(true)}
									className='flex items-center justify-center gap-2 flex-1 sm:flex-none text-sm min-h-[44px]'>
									<FaEdit className='w-4 h-4' />
									<span className='hidden sm:inline'>Edit Event</span>
									<span className='sm:hidden'>Edit</span>
								</Button>
							)}

							{/* Cancelled Event - View Mode */}
							{event.status === "cancelled" && !isEditing && (
								<>
									{isEventCreator && (
										<Button
											variant='secondary'
											onClick={handleRestoreEvent}
											className='flex items-center justify-center gap-2 flex-1 sm:flex-none min-h-[44px]'>
											<FaCheck className='w-4 h-4' />
											<span className='hidden sm:inline'>Restore Event</span>
											<span className='sm:hidden'>Restore</span>
										</Button>
									)}
									<Button
										variant='secondary'
										onClick={() => setIsEditing(true)}
										className='flex items-center justify-center gap-2 flex-1 sm:flex-none text-sm min-h-[44px]'>
										<FaEdit className='w-4 h-4' />
										<span className='hidden sm:inline'>Edit</span>
										<span className='sm:hidden'>Edit</span>
									</Button>
									{isEventCreator && (
										<Button
											variant='secondary'
											onClick={() => handleDelete("deleteEvent")}
											className='flex items-center justify-center gap-2 flex-1 sm:flex-none text-sm text-red-600 hover:text-red-700 min-h-[44px]'>
											<FaTrash className='w-4 h-4' />
											<span className='hidden sm:inline'>Delete</span>
											<span className='sm:hidden'>Delete</span>
										</Button>
									)}
								</>
							)}

							{/* Cancelled Event - Editing Mode */}
							{event.status === "cancelled" && isEditing && (
								<>
									<Button
										className='flex items-center justify-center gap-2 flex-1 sm:flex-none min-h-[44px]'
										type='button'
										variant='secondary'
										onClick={() => setIsEditing(false)}
										disabled={updatingEvent}>
										<FaTimes className='w-4 h-4' />
										<span className='hidden sm:inline'>Discard Changes</span>
										<span className='sm:hidden'>Discard</span>
									</Button>
								</>
							)}
						</div>
					)}
				</div>

				{/* Event Header */}
				<EventHeader
					event={event}
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
					event={event}
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
							// via the useEffect that syncs with event.participants
						}
					}}
					onJoinEvent={handleJoinPublicEvent}
					joiningEvent={joiningPublicEvent}
					onApproveContributor={handleApproveContributor}
					onDenyContributor={handleDenyContributor}
					approvingContributor={approvingContributor}
					denyingContributor={denyingContributor}
				/>

				{/* Contributions Section */}
				<ContributionsSection
					event={event}
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
					event={event}
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
							confirmationModal.type === "deleteEvent" ? "Delete Event"
							: confirmationModal.type === "deleteComment" ?
								"Delete Comment"
							: confirmationModal.type === "deleteContribution" ?
								"Delete Contribution"
							:	"Remove Attendee"
						}
						message={
							confirmationModal.type === "deleteEvent" ?
								"Are you sure you want to delete this event? This action cannot be undone."
							: confirmationModal.type === "deleteComment" ?
								"Are you sure you want to delete this comment? This action cannot be undone."
							: confirmationModal.type === "deleteContribution" ?
								"Are you sure you want to delete this contribution? This action cannot be undone."
							:	`Are you sure you want to remove ${confirmationModal.userName} from this event? This action cannot be undone.`

						}
						confirmText={
							confirmationModal.type === "removeParticipant" ?
								"Remove"
							:	"Delete"
						}
						confirmVariant='secondary'
					/>
				)}
			</div>
		</main>
	);
};
