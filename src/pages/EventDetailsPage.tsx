import { useEffect, useState, useRef } from "react";
import { useParams, useNavigate } from "react-router";
import { useAppDispatch, useAppSelector } from "../store/hooks";
import { FaArrowLeft, FaEdit, FaTimes, FaCheck, FaTrash } from "react-icons/fa";
import {
	fetchEventById,
	checkEventUpdated,
	deleteEvent,
	updateEvent,
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
import { hasManagePermission } from "../utils/events";
import { SkeletonEventDetails } from "../components/common/Skeleton";
import {
	selectEventById,
	selectIsEventFetching,
} from "../store/selectors/eventsSelectors";

// Confirmation modal type - consolidated state
type ConfirmationModal = { type: "deleteEvent" } | null;

export const EventDetailPage = () => {
	const { eventId } = useParams<{ eventId: string }>();
	const navigate = useNavigate();
	const dispatch = useAppDispatch();
	const { updatingEvent, error } = useAppSelector(state => state.events);
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

	// Compute permissions
	const isEventCreator = event.created_by === user?.id;
	const canEdit =
		isEventCreator || hasManagePermission(currentUserParticipant?.role);

	// Unified delete handler - sets confirmation modal
	const handleDelete = (type: "deleteEvent") => {
		if (type === "deleteEvent") {
			setConfirmationModal({ type: "deleteEvent" });
		}
	};

	// Unified confirm delete handler
	const handleConfirmDelete = async () => {
		if (!confirmationModal || !eventId) return;

		if (confirmationModal.type === "deleteEvent") {
			const result = await dispatch(deleteEvent(eventId));
			if (deleteEvent.fulfilled.match(result)) {
				navigate("/");
			}
		}
		setConfirmationModal(null);
		// No need to refetch - state is updated optimistically
	};

	const handleMarkComplete = async () => {
		try {
			if (eventId) {
				await dispatch(
					updateEvent({ eventId, updates: { status: "completed" } }),
				);
			}
			setIsEditing(false);
		} catch (error) {
			console.error("Failed to update event:", error);
		}
	};

	const handleCancelEvent = async () => {
		try {
			if (eventId) {
				await dispatch(
					updateEvent({ eventId, updates: { status: "cancelled" } }),
				);
			}
			setIsEditing(false);
		} catch (error) {
			console.error("Failed to cancel event:", error);
		}
	};

	const handleRestoreEvent = async () => {
		try {
			if (eventId) {
				await dispatch(updateEvent({ eventId, updates: { status: "active" } }));
			}
		} catch (error) {
			console.error("Failed to restore event:", error);
		}
	};

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
				<EventHeader isEditing={isEditing} setIsEditing={setIsEditing} />

				{/* Participants Section */}
				<ParticipantsSection
					selectedFriends={selectedFriends}
					onSelectionChange={setSelectedFriends}
				/>

				{/* Contributions Section */}
				<ContributionsSection />

				{/* Comments Section */}
				<CommentsSection />

				{/* Consolidated Confirmation Modal */}
				{confirmationModal && (
					<ConfirmModal
						isOpen={!!confirmationModal}
						onClose={() => setConfirmationModal(null)}
						onConfirm={handleConfirmDelete}
						title='Delete Event'
						message='Are you sure you want to delete this event? This action cannot be undone.'
						confirmText='Delete'
						confirmVariant='secondary'
					/>
				)}
			</div>
		</main>
	);
};
