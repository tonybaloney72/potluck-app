import { useState } from "react";
import { useForm } from "react-hook-form";
import { useNavigate, useParams } from "react-router";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { useAppDispatch, useAppSelector } from "../../store/hooks";
import { addComment, deleteComment } from "../../store/slices/eventsSlice";
import { selectEventById } from "../../store/selectors/eventsSelectors";
import { AnimatedSection } from "../common/AnimatedSection";
import { EmptyState } from "../common/EmptyState";
import { DeleteButton } from "../common/DeleteButton";
import { ConfirmModal } from "../common/ConfirmModal";
import { Button } from "../common/Button";
import { Skeleton } from "../common/Skeleton";
import { canDeleteItem } from "../../utils/events";
import { FaComment } from "react-icons/fa";
import { Avatar } from "../common/Avatar";

const commentSchema = z.object({
	content: z.string().min(1, "Comment cannot be empty"),
});

type CommentFormData = z.infer<typeof commentSchema>;

interface CommentsSectionProps {}

export const CommentsSection = ({}: CommentsSectionProps) => {
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
	const addingComment = useAppSelector(state => state.events.addingComment);
	const deletingComment = useAppSelector(state => state.events.deletingComment);

	// Compute current user participant
	const currentUserParticipant = event?.participants?.find(
		p => p.user_id === currentUserId,
	);

	// Early return if no event
	if (!event) {
		return null;
	}

	const commentForm = useForm<CommentFormData>({
		resolver: zodResolver(commentSchema),
		defaultValues: {
			content: "",
		},
	});

	const [deleteCommentId, setDeleteCommentId] = useState<string | null>(null);

	const handleSubmit = async (data: CommentFormData) => {
		if (!eventId) return;
		await dispatch(addComment({ eventId, content: data.content }));
		commentForm.reset();
	};

	const handleDeleteComment = (commentId: string) => {
		setDeleteCommentId(commentId);
	};

	const handleConfirmDelete = async () => {
		if (!deleteCommentId) return;
		await dispatch(deleteComment(deleteCommentId));
		setDeleteCommentId(null);
	};

	return (
		<AnimatedSection
			delay={0.2}
			className='bg-primary rounded-lg shadow-md p-4 md:p-6'>
			<h2 className='text-xl md:text-2xl font-semibold text-primary mb-4'>
				Comments
			</h2>

			{currentUserParticipant && (
				<form
					onSubmit={commentForm.handleSubmit(handleSubmit)}
					className='mb-6'
					aria-label='Add a comment'>
					<label htmlFor='comment-content' className='sr-only'>
						Comment
					</label>
					<textarea
						id='comment-content'
						{...commentForm.register("content")}
						placeholder='Add a comment...'
						className='w-full px-4 py-2 bg-primary border border-border rounded-md text-primary placeholder:text-tertiary focus:outline-none focus:ring-2 focus:ring-accent mb-2'
						rows={3}
						autoComplete='off'
						aria-required='true'
						aria-invalid={
							commentForm.formState.errors.content ? "true" : "false"
						}
						aria-describedby={
							commentForm.formState.errors.content ? "comment-error" : undefined
						}
					/>
					{commentForm.formState.errors.content && (
						<p
							id='comment-error'
							className='text-red-500 text-sm mb-2'
							role='alert'>
							{commentForm.formState.errors.content.message}
						</p>
					)}
					<Button
						type='submit'
						disabled={addingComment}
						loading={addingComment}
						className='w-full sm:w-auto min-h-[44px]'>
						Post Comment
					</Button>
				</form>
			)}

			{event.comments === undefined ?
				// Loading state: comments are being fetched
				<div className='space-y-4'>
					{Array.from({ length: 2 }).map((_, i) => (
						<div key={i} className='p-4 bg-secondary rounded-lg'>
							<div className='flex justify-between items-start mb-2'>
								<div className='flex-1'>
									<Skeleton
										variant='text'
										width='30%'
										height={18}
										className='mb-1'
									/>
									<Skeleton variant='text' width='40%' height={14} />
								</div>
							</div>
							<Skeleton
								variant='text'
								width='90%'
								height={16}
								className='mb-1'
							/>
							<Skeleton variant='text' width='60%' height={16} />
						</div>
					))}
				</div>
			: event.comments && event.comments.length > 0 ?
				// Has comments: show list
				<div className='space-y-4'>
					{event.comments.map(comment => {
						const canDelete = canDeleteItem(
							comment.user_id,
							currentUserId,
							currentUserParticipant?.role,
						);

						return (
							<article key={comment.id} className='p-4 bg-secondary rounded-lg'>
								<div className='flex justify-between items-start mb-2'>
									<div className='flex gap-2'>
										{comment.user && (
											<>
												<Avatar
													user={comment.user}
													size='md'
													onClick={() =>
														navigate(`/profile/${comment?.user?.id}`)
													}
												/>
												<div className='flex flex-col'>
													<div
														className='font-semibold text-primary hover:text-secondary cursor-pointer'
														onClick={() =>
															navigate(`/profile/${comment?.user?.id}`)
														}>
														{comment.user.name}
													</div>
													<time
														dateTime={comment.created_at}
														className='text-xs text-tertiary'>
														{new Date(comment.created_at).toLocaleString()}
													</time>
												</div>
											</>
										)}
									</div>
									{canDelete && (
										<DeleteButton
											variant='text'
											onDelete={() => handleDeleteComment(comment.id)}
											isDeleting={deletingComment === comment.id}
											label={`Delete comment by ${
												comment.user?.name || "user"
											}`}
										/>
									)}
								</div>
								<p className='text-primary'>{comment.content}</p>
							</article>
						);
					})}
				</div>
				// Empty state: comments were fetched but there are none
			:	<EmptyState
					icon={<FaComment className='w-16 h-16' />}
					title='No comments yet'
					message='Be the first to comment on this event!'
				/>
			}

			{/* Delete Comment Confirmation Modal */}
			{deleteCommentId && (
				<ConfirmModal
					isOpen={!!deleteCommentId}
					onClose={() => setDeleteCommentId(null)}
					onConfirm={handleConfirmDelete}
					title='Delete Comment'
					message='Are you sure you want to delete this comment? This action cannot be undone.'
					confirmText='Delete'
					confirmVariant='secondary'
				/>
			)}
		</AnimatedSection>
	);
};
