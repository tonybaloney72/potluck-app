import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { useAppDispatch, useAppSelector } from "../store/hooks";
import {
	fetchEventById,
	updateRSVP,
	addComment,
	deleteComment,
	addContribution,
	// updateContribution,
	deleteContribution,
	addParticipant,
	removeParticipant,
} from "../store/slices/eventsSlice";
import { motion } from "motion/react";
import { Button } from "../components/common/Button";
import { ConfirmModal } from "../components/common/ConfirmModal";
import { deleteEvent } from "../store/slices/eventsSlice";
import {
	generateGoogleCalendarUrl,
	downloadAppleCalendar,
} from "../utils/calendar";
import { FaApple, FaGoogle, FaTimes } from "react-icons/fa";
import { useEventDetailsRealtime } from "../hooks/useEventDetailsRealtime";
import { FriendSelectorModal } from "../components/messaging/FriendSelectorModal";

// Confirmation modal type - consolidated state
type ConfirmationModal =
	| { type: "deleteEvent" }
	| { type: "deleteComment"; commentId: string }
	| { type: "deleteContribution"; contributionId: string }
	| { type: "removeParticipant"; userId: string; userName: string }
	| null;

// Form schemas
const commentSchema = z.object({
	content: z.string().min(1, "Comment cannot be empty"),
});

const contributionSchema = z.object({
	itemName: z.string().min(1, "Item name is required"),
	quantity: z.string().optional(),
	description: z.string().optional(),
});

type CommentFormData = z.infer<typeof commentSchema>;
type ContributionFormData = z.infer<typeof contributionSchema>;

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
	} = useAppSelector(state => state.events);
	const { user } = useAppSelector(state => state.auth);

	// Consolidated confirmation modal state
	const [confirmationModal, setConfirmationModal] =
		useState<ConfirmationModal>(null);

	// Simple boolean toggles (keeping as requested)
	const [showContributionForm, setShowContributionForm] = useState(false);
	const [showFriendSelector, setShowFriendSelector] = useState(false);

	// Form management with react-hook-form
	const commentForm = useForm<CommentFormData>({
		resolver: zodResolver(commentSchema),
		defaultValues: {
			content: "",
		},
	});

	const contributionForm = useForm<ContributionFormData>({
		resolver: zodResolver(contributionSchema),
		defaultValues: {
			itemName: "",
			quantity: "",
			description: "",
		},
	});

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

	// Show loading if:
	// 1. We're actively loading, OR
	// 2. We have an eventId but currentEvent doesn't match (still fetching)
	const isLoading = loading || (eventId && currentEvent?.id !== eventId);

	if (isLoading) {
		return (
			<div className=' flex items-center justify-center'>
				<div className='text-lg'>Loading event...</div>
			</div>
		);
	}

	// Only show "not found" if we've finished loading and still don't have the event
	if (!currentEvent) {
		return (
			<div className='flex items-center justify-center'>
				<div className='text-lg text-red-500'>Event not found</div>
			</div>
		);
	}

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

	const handleRSVP = async (status: "going" | "not_going" | "maybe") => {
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
			case "removeParticipant":
				await dispatch(
					removeParticipant({ eventId, userId: confirmationModal.userId }),
				);
				break;
		}
		setConfirmationModal(null);
		// No need to refetch - state is updated optimistically
	};

	// Unified add handler
	const handleAdd = async (
		type: "comment" | "contribution" | "participant",
		data: CommentFormData | ContributionFormData | string,
	) => {
		if (!eventId) return;

		switch (type) {
			case "comment": {
				const commentData = data as CommentFormData;
				await dispatch(addComment({ eventId, content: commentData.content }));
				commentForm.reset();
				// No need to refetch - state is updated optimistically
				break;
			}
			case "contribution": {
				const contributionData = data as ContributionFormData;
				if (
					currentUserParticipant &&
					["host", "co_host", "contributor"].includes(
						currentUserParticipant.role,
					)
				) {
					await dispatch(
						addContribution({
							eventId,
							itemName: contributionData.itemName,
							quantity: contributionData.quantity || undefined,
							description: contributionData.description || undefined,
						}),
					);
					contributionForm.reset();
					setShowContributionForm(false);
					// No need to refetch - state is updated optimistically
				}
				break;
			}
			case "participant": {
				const friendId = data as string;
				if (!addingParticipant) {
					await dispatch(addParticipant({ eventId, userId: friendId }));
					setShowFriendSelector(false);
					// No need to refetch - state is updated optimistically
				}
				break;
			}
		}
	};

	const isEventCreator = currentEvent.created_by === user?.id;

	const eventDateTime = formatDateTime(currentEvent.event_datetime);

	// const userContributions = currentEvent.contributions?.filter(
	// 	c => c.user_id === user?.id,
	// );

	return (
		<div className='bg-secondary p-8'>
			<div className='max-w-4xl mx-auto'>
				{/* Back Button */}
				<div className='flex justify-between items-center mb-4'>
					<button
						onClick={() => navigate("/")}
						className='mb-4 text-accent hover:underline hover:cursor-pointer'>
						← Back to My Events
					</button>
					{isEventCreator && (
						<div className='flex gap-2'>
							<Button
								variant='secondary'
								onClick={() => handleDelete("deleteEvent")}
								className='text-sm text-red-600 hover:text-red-700'>
								Delete Event
							</Button>
						</div>
					)}
				</div>
				{/* Event Header */}
				<motion.div
					initial={{ opacity: 0, y: 20 }}
					animate={{ opacity: 1, y: 0 }}
					className='bg-primary rounded-lg shadow-md p-6 mb-6'>
					<div className='flex justify-between items-start mb-4'>
						<div>
							<h1 className='text-3xl font-bold text-primary mb-2'>
								{currentEvent.title}
							</h1>
							{currentEvent.theme && (
								<span className='inline-block px-3 py-1 text-sm bg-accent/20 text-accent rounded'>
									{currentEvent.theme}
								</span>
							)}
						</div>
						<div className='flex flex-col gap-2'>
							{currentEvent.creator && (
								<div className='text-right'>
									<p className='text-sm text-tertiary'>Hosted by</p>
									<p className='font-semibold text-primary'>
										{currentEvent.creator.name}
									</p>
								</div>
							)}
							{/* Calendar Buttons */}
							<div className='flex gap-2'>
								<a
									href={generateGoogleCalendarUrl(currentEvent)}
									target='_blank'
									rel='noopener noreferrer'
									className='flex items-center gap-2 px-3 py-1.5 bg-accent-secondary hover:bg-accent text-white rounded-md text-sm transition'>
									<FaGoogle className='w-4 h-4' />
									<span>Google</span>
								</a>
								<button
									onClick={() => downloadAppleCalendar(currentEvent)}
									className='flex items-center gap-2 px-3 py-1.5 bg-secondary hover:bg-tertiary text-white rounded-md text-sm transition cursor-pointer'>
									<FaApple className='w-4 h-4' />
									<span>Apple</span>
								</button>
							</div>
						</div>
					</div>

					{currentEvent.description && (
						<p className='text-primary mb-4'>{currentEvent.description}</p>
					)}

					<div className='grid grid-cols-1 md:grid-cols-2 gap-4 text-sm'>
						<div>
							<p className='text-tertiary'>Date & Time</p>
							<p className='font-semibold text-primary'>
								{eventDateTime.date} at {eventDateTime.time}
							</p>
						</div>
						{currentEvent.location && (
							<div>
								<p className='text-tertiary'>Location</p>
								{currentEvent.location_url ? (
									<a
										href={currentEvent.location_url}
										target='_blank'
										rel='noopener noreferrer'
										className='font-semibold text-accent hover:underline'>
										{currentEvent.location} →
									</a>
								) : (
									<p className='font-semibold text-primary'>
										{currentEvent.location}
									</p>
								)}
							</div>
						)}
					</div>

					{/* RSVP Section */}
					{currentUserParticipant && (
						<div className='mt-6 pt-6 border-t border-border'>
							<p className='text-sm font-medium text-primary mb-2'>
								Your RSVP Status:{" "}
								<span className='capitalize'>
									{currentUserParticipant.rsvp_status}
								</span>
							</p>
							<div className='flex gap-2'>
								<Button
									variant={
										currentUserParticipant.rsvp_status === "going"
											? "primary"
											: "secondary"
									}
									onClick={() => handleRSVP("going")}
									disabled={updatingRSVP === "going"}
									loading={updatingRSVP === "going"}
									className='text-sm'>
									Going
								</Button>
								<Button
									variant={
										currentUserParticipant.rsvp_status === "maybe"
											? "primary"
											: "secondary"
									}
									onClick={() => handleRSVP("maybe")}
									disabled={updatingRSVP === "maybe"}
									loading={updatingRSVP === "maybe"}
									className='text-sm'>
									Maybe
								</Button>
								<Button
									variant={
										currentUserParticipant.rsvp_status === "not_going"
											? "primary"
											: "secondary"
									}
									onClick={() => handleRSVP("not_going")}
									disabled={updatingRSVP === "not_going"}
									loading={updatingRSVP === "not_going"}
									className='text-sm'>
									Can't Go
								</Button>
							</div>
						</div>
					)}
				</motion.div>
				{/* Participants Section */}
				<motion.div
					initial={{ opacity: 0, y: 20 }}
					animate={{ opacity: 1, y: 0 }}
					transition={{ delay: 0.15 }}
					className='bg-primary rounded-lg shadow-md p-6 mb-6'>
					<div className='flex justify-between items-center mb-4'>
						<h2 className='text-2xl font-semibold text-primary'>
							Attendees ({currentEvent.participants?.length || 0})
						</h2>
						{currentUserParticipant &&
							["host", "co_host"].includes(currentUserParticipant.role) && (
								<Button
									onClick={() => setShowFriendSelector(true)}
									disabled={addingParticipant}
									loading={addingParticipant}
									className='text-sm'>
									Add
								</Button>
							)}
					</div>
					{currentEvent.participants && currentEvent.participants.length > 0 ? (
						<div className='grid grid-cols-1 md:grid-cols-2 gap-3'>
							{currentEvent.participants.map(participant => (
								<div
									key={participant.id}
									className='p-3 bg-secondary rounded-lg flex items-center justify-between relative'>
									<div className='flex items-center gap-3'>
										{participant.user?.avatar_url ? (
											<img
												src={participant.user.avatar_url}
												alt={participant.user.name || "User"}
												className='w-10 h-10 rounded-full'
											/>
										) : (
											<div className='w-10 h-10 rounded-full bg-tertiary flex items-center justify-center'>
												<span className='text-primary'>
													{participant.user?.name?.charAt(0).toUpperCase() ||
														"?"}
												</span>
											</div>
										)}
										<div>
											<p className='font-semibold text-primary'>
												{participant.user?.name || "Unknown"}
											</p>
											<p className='text-xs text-tertiary capitalize'>
												{participant.role} • {participant.rsvp_status}
											</p>
										</div>
									</div>
									{currentUserParticipant &&
										["host", "co_host"].includes(currentUserParticipant.role) &&
										participant.user_id !== user?.id && (
											<button
												onClick={() =>
													handleDelete("removeParticipant", {
														userId: participant.user_id,
														userName: participant.user?.name || "Unknown",
													})
												}
												className='text-red-500 hover:text-red-700 text-sm p-1 rounded-full hover:bg-red-500/10 transition disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer'
												title='Remove attendee'>
												<FaTimes className='w-4 h-4' />
											</button>
										)}
								</div>
							))}
						</div>
					) : (
						<p className='text-tertiary'>No attendees yet.</p>
					)}
				</motion.div>
				{/* Contributions Section */}
				<motion.div
					initial={{ opacity: 0, y: 20 }}
					animate={{ opacity: 1, y: 0 }}
					transition={{ delay: 0.1 }}
					className='bg-primary rounded-lg shadow-md p-6 mb-6'>
					<div className='flex justify-between items-center mb-4'>
						<h2 className='text-2xl font-semibold text-primary'>
							Contributions
						</h2>
						{currentUserParticipant &&
							["host", "co_host", "contributor"].includes(
								currentUserParticipant.role,
							) && (
								<Button
									onClick={() => setShowContributionForm(!showContributionForm)}
									className='text-sm'>
									{showContributionForm ? "Cancel" : "Add Contribution"}
								</Button>
							)}
					</div>

					{showContributionForm && (
						<form
							onSubmit={contributionForm.handleSubmit(data =>
								handleAdd("contribution", data),
							)}
							className='mb-4 p-4 bg-secondary rounded-lg'>
							<input
								type='text'
								placeholder='Item name *'
								{...contributionForm.register("itemName")}
								className='w-full mb-2 px-4 py-2 bg-primary border border-border rounded-md text-primary placeholder:text-tertiary focus:outline-none focus:ring-2 focus:ring-accent'
							/>
							{contributionForm.formState.errors.itemName && (
								<p className='text-red-500 text-sm mb-2'>
									{contributionForm.formState.errors.itemName.message}
								</p>
							)}
							<input
								type='text'
								placeholder='Quantity (optional)'
								{...contributionForm.register("quantity")}
								className='w-full mb-2 px-4 py-2 bg-primary border border-border rounded-md text-primary placeholder:text-tertiary focus:outline-none focus:ring-2 focus:ring-accent'
							/>
							<textarea
								placeholder='Description (optional)'
								{...contributionForm.register("description")}
								className='w-full mb-2 px-4 py-2 bg-primary border border-border rounded-md text-primary placeholder:text-tertiary focus:outline-none focus:ring-2 focus:ring-accent'
								rows={2}
							/>
							<Button
								type='submit'
								disabled={addingContribution}
								loading={addingContribution}
								className='text-sm'>
								Add Contribution
							</Button>
						</form>
					)}

					{currentEvent.contributions &&
					currentEvent.contributions.length > 0 ? (
						<div className='space-y-3'>
							{currentEvent.contributions.map(contribution => (
								<div
									key={contribution.id}
									className='p-4 bg-secondary rounded-lg flex justify-between items-start'>
									<div className='flex-1'>
										<div className='flex items-center gap-2 mb-1'>
											<p className='font-semibold text-primary'>
												{contribution.item_name}
											</p>
											{contribution.quantity && (
												<span className='text-sm text-tertiary'>
													({contribution.quantity})
												</span>
											)}
										</div>
										{contribution.description && (
											<p className='text-sm text-secondary'>
												{contribution.description}
											</p>
										)}
										{contribution.user && (
											<p className='text-xs text-tertiary mt-1'>
												Brought by {contribution.user.name}
											</p>
										)}
									</div>
									{(contribution.user_id === user?.id ||
										currentUserParticipant?.role === "host" ||
										currentUserParticipant?.role === "co_host") && (
										<button
											onClick={() =>
												handleDelete("deleteContribution", {
													contributionId: contribution.id,
												})
											}
											disabled={deletingContribution === contribution.id}
											className='text-red-500 hover:text-red-700 text-sm ml-4 disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer'>
											{deletingContribution === contribution.id
												? "Deleting..."
												: "Delete"}
										</button>
									)}
								</div>
							))}
						</div>
					) : (
						<p className='text-tertiary'>No contributions yet.</p>
					)}
				</motion.div>
				{/* Comments Section */}
				<motion.div
					initial={{ opacity: 0, y: 20 }}
					animate={{ opacity: 1, y: 0 }}
					transition={{ delay: 0.2 }}
					className='bg-primary rounded-lg shadow-md p-6'>
					<h2 className='text-2xl font-semibold text-primary mb-4'>Comments</h2>

					{/* Add Comment Form */}
					{currentUserParticipant && (
						<form
							onSubmit={commentForm.handleSubmit(data =>
								handleAdd("comment", data),
							)}
							className='mb-6'>
							<textarea
								{...commentForm.register("content")}
								placeholder='Add a comment...'
								className='w-full px-4 py-2 bg-primary border border-border rounded-md text-primary placeholder:text-tertiary focus:outline-none focus:ring-2 focus:ring-accent mb-2'
								rows={3}
							/>
							{commentForm.formState.errors.content && (
								<p className='text-red-500 text-sm mb-2'>
									{commentForm.formState.errors.content.message}
								</p>
							)}
							<Button
								type='submit'
								disabled={addingComment}
								loading={addingComment}>
								Post Comment
							</Button>
						</form>
					)}

					{/* Comments List */}
					{currentEvent.comments && currentEvent.comments.length > 0 ? (
						<div className='space-y-4'>
							{currentEvent.comments.map(comment => (
								<div key={comment.id} className='p-4 bg-secondary rounded-lg'>
									<div className='flex justify-between items-start mb-2'>
										<div>
											{comment.user && (
												<p className='font-semibold text-primary'>
													{comment.user.name}
												</p>
											)}
											<p className='text-xs text-tertiary'>
												{new Date(comment.created_at).toLocaleString()}
											</p>
										</div>
										{(comment.user_id === user?.id ||
											currentUserParticipant?.role === "host" ||
											currentUserParticipant?.role === "co_host") && (
											<button
												onClick={() =>
													handleDelete("deleteComment", {
														commentId: comment.id,
													})
												}
												disabled={deletingComment === comment.id}
												className='text-red-500 hover:text-red-700 text-sm disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer'>
												{deletingComment === comment.id
													? "Deleting..."
													: "Delete"}
											</button>
										)}
									</div>
									<p className='text-primary'>{comment.content}</p>
								</div>
							))}
						</div>
					) : (
						<p className='text-tertiary'>No comments yet.</p>
					)}
				</motion.div>

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

				{/* Friend Selector Modal */}
				<FriendSelectorModal
					isOpen={showFriendSelector}
					onClose={() => setShowFriendSelector(false)}
					onSelectFriend={friendId => handleAdd("participant", friendId)}
					excludeIds={currentEvent.participants?.map(p => p.user_id) || []}
				/>
			</div>
		</div>
	);
};
