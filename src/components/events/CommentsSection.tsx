import { useForm } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { AnimatedSection } from "../common/AnimatedSection";
import { EmptyState } from "../common/EmptyState";
import { DeleteButton } from "../common/DeleteButton";
import { Button } from "../common/Button";
import { Skeleton } from "../common/Skeleton";
import type { Event, EventParticipant } from "../../types";
import { canDeleteItem } from "../../utils/events";
import { FaComment } from "react-icons/fa";

const commentSchema = z.object({
	content: z.string().min(1, "Comment cannot be empty"),
});

type CommentFormData = z.infer<typeof commentSchema>;

interface CommentsSectionProps {
	event: Event;
	currentUserParticipant: EventParticipant | undefined;
	currentUserId: string | undefined;
	onAddComment: (data: CommentFormData) => void;
	onDeleteComment: (commentId: string) => void;
	addingComment: boolean;
	deletingComment: string | null;
}

export const CommentsSection = ({
	event,
	currentUserParticipant,
	currentUserId,
	onAddComment,
	onDeleteComment,
	addingComment,
	deletingComment,
}: CommentsSectionProps) => {
	const commentForm = useForm<CommentFormData>({
		resolver: zodResolver(commentSchema),
		defaultValues: {
			content: "",
		},
	});

	const handleSubmit = (data: CommentFormData) => {
		onAddComment(data);
		commentForm.reset();
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
					className='mb-6'>
					<textarea
						{...commentForm.register("content")}
						placeholder='Add a comment...'
						className='w-full px-4 py-2 bg-primary border border-border rounded-md text-primary placeholder:text-tertiary focus:outline-none focus:ring-2 focus:ring-accent mb-2'
						rows={3}
						autoComplete='off'
					/>
					{commentForm.formState.errors.content && (
						<p className='text-red-500 text-sm mb-2'>
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

			{event.comments === undefined ? (
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
			) : event.comments && event.comments.length > 0 ? (
				// Has comments: show list
				<div className='space-y-4'>
					{event.comments.map(comment => {
						const canDelete = canDeleteItem(
							comment.user_id,
							currentUserId,
							currentUserParticipant?.role,
						);

						return (
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
									{canDelete && (
										<DeleteButton
											variant='text'
											onDelete={() => onDeleteComment(comment.id)}
											isDeleting={deletingComment === comment.id}
										/>
									)}
								</div>
								<p className='text-primary'>{comment.content}</p>
							</div>
						);
					})}
				</div>
			) : (
				// Empty state: comments were fetched but there are none
				<EmptyState
					icon={<FaComment className='w-16 h-16' />}
					title='No comments yet'
					message='Be the first to comment on this event!'
				/>
			)}
		</AnimatedSection>
	);
};
