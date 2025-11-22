import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router";
import { useAppDispatch, useAppSelector } from "../store/hooks";
import {
	fetchEventById,
	updateRSVP,
	addComment,
	deleteComment,
	addContribution,
	// updateContribution,
	deleteContribution,
} from "../store/slices/eventsSlice";
import { motion } from "motion/react";
import { Button } from "../components/common/Button";

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
		deletingComment,
		deletingContribution,
	} = useAppSelector(state => state.events);
	const { user } = useAppSelector(state => state.auth);
	const [commentText, setCommentText] = useState("");
	const [showContributionForm, setShowContributionForm] = useState(false);
	const [contributionForm, setContributionForm] = useState({
		itemName: "",
		quantity: "",
		description: "",
	});

	useEffect(() => {
		if (eventId) {
			dispatch(fetchEventById(eventId));
		}
	}, [dispatch, eventId]);

	if (loading) {
		return (
			<div className='min-h-screen flex items-center justify-center'>
				<div className='text-lg'>Loading event...</div>
			</div>
		);
	}

	if (!currentEvent) {
		return (
			<div className='min-h-screen flex items-center justify-center'>
				<div className='text-lg text-red-500'>Event not found</div>
			</div>
		);
	}

	// Find current user's participant record
	const currentUserParticipant = currentEvent.participants?.find(
		p => p.user_id === user?.id,
	);

	const formatDate = (dateString: string) => {
		const date = new Date(dateString);
		return date.toLocaleDateString("en-US", {
			weekday: "long",
			year: "numeric",
			month: "long",
			day: "numeric",
		});
	};

	const formatTime = (timeString: string) => {
		const [hours, minutes] = timeString.split(":");
		const hour = parseInt(hours);
		const ampm = hour >= 12 ? "PM" : "AM";
		const displayHour = hour % 12 || 12;
		return `${displayHour}:${minutes} ${ampm}`;
	};

	const handleRSVP = async (status: "going" | "not_going" | "maybe") => {
		if (eventId) {
			await dispatch(updateRSVP({ eventId, rsvpStatus: status }));
			// No need to refetch - state is updated optimistically
		}
	};

	const handleAddComment = async () => {
		if (eventId && commentText.trim()) {
			await dispatch(addComment({ eventId, content: commentText }));
			setCommentText("");
			// No need to refetch - state is updated optimistically
		}
	};

	const handleDeleteComment = async (commentId: string) => {
		await dispatch(deleteComment(commentId));
		// No need to refetch - state is updated optimistically
	};

	const handleAddContribution = async () => {
		if (
			eventId &&
			contributionForm.itemName.trim() &&
			currentUserParticipant &&
			["host", "co_host", "contributor"].includes(currentUserParticipant.role)
		) {
			await dispatch(
				addContribution({
					eventId,
					itemName: contributionForm.itemName,
					quantity: contributionForm.quantity || undefined,
					description: contributionForm.description || undefined,
				}),
			);
			setContributionForm({ itemName: "", quantity: "", description: "" });
			setShowContributionForm(false);
			// No need to refetch - state is updated optimistically
		}
	};

	const handleDeleteContribution = async (contributionId: string) => {
		await dispatch(deleteContribution(contributionId));
		// No need to refetch - state is updated optimistically
	};

	// const userContributions = currentEvent.contributions?.filter(
	// 	c => c.user_id === user?.id,
	// );

	return (
		<div className='min-h-screen bg-gray-50 dark:bg-gray-900 p-8'>
			<div className='max-w-4xl mx-auto'>
				{/* Back Button */}
				<button
					onClick={() => navigate(-1)}
					className='mb-4 text-blue-600 dark:text-blue-400 hover:underline'>
					← Back to My Events
				</button>
				{/* Event Header */}
				<motion.div
					initial={{ opacity: 0, y: 20 }}
					animate={{ opacity: 1, y: 0 }}
					className='bg-white dark:bg-gray-800 rounded-lg shadow-md p-6 mb-6'>
					<div className='flex justify-between items-start mb-4'>
						<div>
							<h1 className='text-3xl font-bold text-gray-900 dark:text-white mb-2'>
								{currentEvent.title}
							</h1>
							{currentEvent.theme && (
								<span className='inline-block px-3 py-1 text-sm bg-blue-100 dark:bg-blue-900 text-blue-800 dark:text-blue-200 rounded'>
									{currentEvent.theme}
								</span>
							)}
						</div>
						{currentEvent.creator && (
							<div className='text-right'>
								<p className='text-sm text-gray-500 dark:text-gray-400'>
									Hosted by
								</p>
								<p className='font-semibold text-gray-900 dark:text-white'>
									{currentEvent.creator.name}
								</p>
							</div>
						)}
					</div>

					{currentEvent.description && (
						<p className='text-gray-700 dark:text-gray-300 mb-4'>
							{currentEvent.description}
						</p>
					)}

					<div className='grid grid-cols-1 md:grid-cols-2 gap-4 text-sm'>
						<div>
							<p className='text-gray-500 dark:text-gray-400'>Date & Time</p>
							<p className='font-semibold text-gray-900 dark:text-white'>
								{formatDate(currentEvent.event_date)} at{" "}
								{formatTime(currentEvent.event_time)}
							</p>
						</div>
						{currentEvent.location && (
							<div>
								<p className='text-gray-500 dark:text-gray-400'>Location</p>
								{currentEvent.location_url ? (
									<a
										href={currentEvent.location_url}
										target='_blank'
										rel='noopener noreferrer'
										className='font-semibold text-blue-600 dark:text-blue-400 hover:underline'>
										{currentEvent.location} →
									</a>
								) : (
									<p className='font-semibold text-gray-900 dark:text-white'>
										{currentEvent.location}
									</p>
								)}
							</div>
						)}
					</div>

					{/* RSVP Section */}
					{currentUserParticipant && (
						<div className='mt-6 pt-6 border-t border-gray-200 dark:border-gray-700'>
							<p className='text-sm font-medium text-gray-700 dark:text-gray-300 mb-2'>
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
					className='bg-white dark:bg-gray-800 rounded-lg shadow-md p-6 mb-6'>
					<h2 className='text-2xl font-semibold text-gray-900 dark:text-white mb-4'>
						Attendees ({currentEvent.participants?.length || 0})
					</h2>
					{currentEvent.participants && currentEvent.participants.length > 0 ? (
						<div className='grid grid-cols-1 md:grid-cols-2 gap-3'>
							{currentEvent.participants.map(participant => (
								<div
									key={participant.id}
									className='p-3 bg-gray-50 dark:bg-gray-700 rounded-lg flex items-center justify-between'>
									<div className='flex items-center gap-3'>
										{participant.user?.avatar_url ? (
											<img
												src={participant.user.avatar_url}
												alt={participant.user.name || "User"}
												className='w-10 h-10 rounded-full'
											/>
										) : (
											<div className='w-10 h-10 rounded-full bg-gray-300 dark:bg-gray-600 flex items-center justify-center'>
												<span className='text-gray-600 dark:text-gray-300'>
													{participant.user?.name?.charAt(0).toUpperCase() ||
														"?"}
												</span>
											</div>
										)}
										<div>
											<p className='font-semibold text-gray-900 dark:text-white'>
												{participant.user?.name || "Unknown"}
											</p>
											<p className='text-xs text-gray-500 dark:text-gray-400 capitalize'>
												{participant.role} • {participant.rsvp_status}
											</p>
										</div>
									</div>
								</div>
							))}
						</div>
					) : (
						<p className='text-gray-500 dark:text-gray-400'>
							No attendees yet.
						</p>
					)}
				</motion.div>
				{/* Contributions Section */}
				<motion.div
					initial={{ opacity: 0, y: 20 }}
					animate={{ opacity: 1, y: 0 }}
					transition={{ delay: 0.1 }}
					className='bg-white dark:bg-gray-800 rounded-lg shadow-md p-6 mb-6'>
					<div className='flex justify-between items-center mb-4'>
						<h2 className='text-2xl font-semibold text-gray-900 dark:text-white'>
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
						<div className='mb-4 p-4 bg-gray-50 dark:bg-gray-700 rounded-lg'>
							<input
								type='text'
								placeholder='Item name *'
								value={contributionForm.itemName}
								onChange={e =>
									setContributionForm({
										...contributionForm,
										itemName: e.target.value,
									})
								}
								className='w-full mb-2 px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-gray-800 dark:text-white'
							/>
							<input
								type='text'
								placeholder='Quantity (optional)'
								value={contributionForm.quantity}
								onChange={e =>
									setContributionForm({
										...contributionForm,
										quantity: e.target.value,
									})
								}
								className='w-full mb-2 px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-gray-800 dark:text-white'
							/>
							<textarea
								placeholder='Description (optional)'
								value={contributionForm.description}
								onChange={e =>
									setContributionForm({
										...contributionForm,
										description: e.target.value,
									})
								}
								className='w-full mb-2 px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-gray-800 dark:text-white'
								rows={2}
							/>
							<Button
								onClick={handleAddContribution}
								disabled={addingContribution}
								loading={addingContribution}
								className='text-sm'>
								Add Contribution
							</Button>
						</div>
					)}

					{currentEvent.contributions &&
					currentEvent.contributions.length > 0 ? (
						<div className='space-y-3'>
							{currentEvent.contributions.map(contribution => (
								<div
									key={contribution.id}
									className='p-4 bg-gray-50 dark:bg-gray-700 rounded-lg flex justify-between items-start'>
									<div className='flex-1'>
										<div className='flex items-center gap-2 mb-1'>
											<p className='font-semibold text-gray-900 dark:text-white'>
												{contribution.item_name}
											</p>
											{contribution.quantity && (
												<span className='text-sm text-gray-500 dark:text-gray-400'>
													({contribution.quantity})
												</span>
											)}
										</div>
										{contribution.description && (
											<p className='text-sm text-gray-600 dark:text-gray-300'>
												{contribution.description}
											</p>
										)}
										{contribution.user && (
											<p className='text-xs text-gray-500 dark:text-gray-400 mt-1'>
												Brought by {contribution.user.name}
											</p>
										)}
									</div>
									{(contribution.user_id === user?.id ||
										currentUserParticipant?.role === "host" ||
										currentUserParticipant?.role === "co_host") && (
										<button
											onClick={() => handleDeleteContribution(contribution.id)}
											disabled={deletingContribution === contribution.id}
											className='text-red-500 hover:text-red-700 text-sm ml-4 disabled:opacity-50 disabled:cursor-not-allowed'>
											{deletingContribution === contribution.id
												? "Deleting..."
												: "Delete"}
										</button>
									)}
								</div>
							))}
						</div>
					) : (
						<p className='text-gray-500 dark:text-gray-400'>
							No contributions yet.
						</p>
					)}
				</motion.div>
				{/* Comments Section */}
				<motion.div
					initial={{ opacity: 0, y: 20 }}
					animate={{ opacity: 1, y: 0 }}
					transition={{ delay: 0.2 }}
					className='bg-white dark:bg-gray-800 rounded-lg shadow-md p-6'>
					<h2 className='text-2xl font-semibold text-gray-900 dark:text-white mb-4'>
						Comments
					</h2>

					{/* Add Comment Form */}
					{currentUserParticipant && (
						<div className='mb-6'>
							<textarea
								value={commentText}
								onChange={e => setCommentText(e.target.value)}
								placeholder='Add a comment...'
								className='w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white mb-2'
								rows={3}
							/>
							<Button
								onClick={handleAddComment}
								disabled={!commentText.trim() || addingComment}
								loading={addingComment}>
								Post Comment
							</Button>
						</div>
					)}

					{/* Comments List */}
					{currentEvent.comments && currentEvent.comments.length > 0 ? (
						<div className='space-y-4'>
							{currentEvent.comments.map(comment => (
								<div
									key={comment.id}
									className='p-4 bg-gray-50 dark:bg-gray-700 rounded-lg'>
									<div className='flex justify-between items-start mb-2'>
										<div>
											{comment.user && (
												<p className='font-semibold text-gray-900 dark:text-white'>
													{comment.user.name}
												</p>
											)}
											<p className='text-xs text-gray-500 dark:text-gray-400'>
												{new Date(comment.created_at).toLocaleString()}
											</p>
										</div>
										{(comment.user_id === user?.id ||
											currentUserParticipant?.role === "host" ||
											currentUserParticipant?.role === "co_host") && (
											<button
												onClick={() => handleDeleteComment(comment.id)}
												disabled={deletingComment === comment.id}
												className='text-red-500 hover:text-red-700 text-sm disabled:opacity-50 disabled:cursor-not-allowed'>
												{deletingComment === comment.id
													? "Deleting..."
													: "Delete"}
											</button>
										)}
									</div>
									<p className='text-gray-700 dark:text-gray-300'>
										{comment.content}
									</p>
								</div>
							))}
						</div>
					) : (
						<p className='text-gray-500 dark:text-gray-400'>No comments yet.</p>
					)}
				</motion.div>
			</div>
		</div>
	);
};
