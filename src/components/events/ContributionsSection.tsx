import { useState } from "react";
import { useParams } from "react-router";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { useAppDispatch, useAppSelector } from "../../store/hooks";
import {
	addContribution,
	deleteContribution,
} from "../../store/slices/eventsSlice";
import { selectEventById } from "../../store/selectors/eventsSelectors";
import { motion, AnimatePresence } from "motion/react";
import { AnimatedSection } from "../common/AnimatedSection";
import { SectionHeader } from "../common/SectionHeader";
import { EmptyState } from "../common/EmptyState";
import { DeleteButton } from "../common/DeleteButton";
import { ConfirmModal } from "../common/ConfirmModal";
import { Button } from "../common/Button";
import { Skeleton } from "../common/Skeleton";
import { canAddContributions, canDeleteItem } from "../../utils/events";
import { FaGift } from "react-icons/fa";

const contributionSchema = z.object({
	itemName: z.string().min(1, "Item name is required"),
	quantity: z.string().optional(),
	description: z.string().optional(),
});

type ContributionFormData = z.infer<typeof contributionSchema>;

interface ContributionsSectionProps {}

export const ContributionsSection = ({}: ContributionsSectionProps) => {
	const { eventId } = useParams<{ eventId: string }>();
	const dispatch = useAppDispatch();

	// Get event from Redux store
	const event = useAppSelector(state =>
		eventId ? selectEventById(state, eventId) : null,
	);

	// Get current user ID
	const currentUserId = useAppSelector(state => state.auth.user?.id);

	// Get loading states
	const addingContribution = useAppSelector(
		state => state.events.addingContribution,
	);
	const deletingContribution = useAppSelector(
		state => state.events.deletingContribution,
	);

	// Compute current user participant
	const currentUserParticipant = event?.participants?.find(
		p => p.user_id === currentUserId,
	);

	// Early return if no event
	if (!event) {
		return null;
	}

	const [showForm, setShowForm] = useState(false);
	const [deleteContributionId, setDeleteContributionId] = useState<
		string | null
	>(null);

	const contributionForm = useForm<ContributionFormData>({
		resolver: zodResolver(contributionSchema),
		defaultValues: {
			itemName: "",
			quantity: "",
			description: "",
		},
	});

	const canAdd = canAddContributions(currentUserParticipant?.role);

	const actionButton =
		canAdd ?
			<motion.button
				layout
				onClick={() => setShowForm(!showForm)}
				className='text-sm min-h-[44px] cursor-pointer bg-accent hover:bg-accent-secondary px-4 py-2 rounded-md text-bg-secondary'>
				{showForm ? "Cancel" : "Add"}
			</motion.button>
		:	undefined;

	const handleSubmit = async (data: ContributionFormData) => {
		if (!eventId || !currentUserParticipant) return;

		// Check if user can add contributions
		if (!canAddContributions(currentUserParticipant.role)) {
			return;
		}

		await dispatch(
			addContribution({
				eventId,
				itemName: data.itemName,
				quantity: data.quantity || undefined,
				description: data.description || undefined,
			}),
		);
		contributionForm.reset();
		setShowForm(false);
	};

	const handleDeleteContribution = (contributionId: string) => {
		setDeleteContributionId(contributionId);
	};

	const handleConfirmDelete = async () => {
		if (!deleteContributionId) return;
		await dispatch(deleteContribution(deleteContributionId));
		setDeleteContributionId(null);
	};

	const formInputClassName =
		"w-full mb-2 px-4 py-2 bg-primary border border-border rounded-md text-primary placeholder:text-tertiary focus:outline-none focus:ring-2 focus:ring-accent";

	return (
		<AnimatedSection
			delay={0.1}
			className='bg-primary rounded-lg shadow-md p-4 md:p-6 mb-6'>
			<SectionHeader title='Contributions' actionButton={actionButton} />

			<AnimatePresence>
				{showForm && (
					<motion.form
						initial={{ opacity: 0, height: 0, marginBottom: 0 }}
						animate={{ opacity: 1, height: "auto", marginBottom: 16 }}
						exit={{ opacity: 0, height: 0, marginBottom: 0 }}
						transition={{ duration: 0.2, ease: "easeInOut" }}
						onSubmit={contributionForm.handleSubmit(handleSubmit)}
						className='overflow-hidden p-4 bg-secondary rounded-lg'
						aria-label='Add contribution form'>
						<motion.div
							initial={{ y: -10 }}
							animate={{ y: 0 }}
							exit={{ y: -10 }}
							transition={{ duration: 0.2, ease: "easeInOut" }}>
							<label htmlFor='contribution-item-name' className='sr-only'>
								Item name (required)
							</label>
							<input
								id='contribution-item-name'
								type='text'
								placeholder='Item name *'
								{...contributionForm.register("itemName")}
								className={formInputClassName}
								aria-required='true'
								aria-invalid={
									contributionForm.formState.errors.itemName ? "true" : "false"
								}
								aria-describedby={
									contributionForm.formState.errors.itemName ?
										"item-name-error"
									:	undefined
								}
							/>
							{contributionForm.formState.errors.itemName && (
								<p
									id='item-name-error'
									className='text-red-500 text-sm mb-2'
									role='alert'>
									{contributionForm.formState.errors.itemName.message}
								</p>
							)}
							<label htmlFor='contribution-quantity' className='sr-only'>
								Quantity (optional)
							</label>
							<input
								id='contribution-quantity'
								type='text'
								placeholder='Quantity (optional)'
								{...contributionForm.register("quantity")}
								className={formInputClassName}
							/>
							<label htmlFor='contribution-description' className='sr-only'>
								Description (optional)
							</label>
							<textarea
								id='contribution-description'
								placeholder='Description (optional)'
								{...contributionForm.register("description")}
								className={formInputClassName}
								rows={2}
							/>
							<Button
								type='submit'
								disabled={addingContribution}
								loading={addingContribution}
								className='text-sm w-full sm:w-auto min-h-[44px]'>
								Add Contribution
							</Button>
						</motion.div>
					</motion.form>
				)}
			</AnimatePresence>

			{event.contributions === undefined ?
				// Loading state: contributions are being fetched
				<div className='grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3'>
					{Array.from({ length: 4 }).map((_, i) => (
						<div key={i} className='p-4 bg-secondary rounded-lg'>
							<div className='flex items-center gap-2 mb-2'>
								<Skeleton variant='text' width='60%' height={20} />
								<Skeleton variant='text' width='30%' height={16} />
							</div>
							<Skeleton
								variant='text'
								width='90%'
								height={16}
								className='mb-2'
							/>
							<Skeleton variant='text' width='50%' height={14} />
						</div>
					))}
				</div>
			: event.contributions && event.contributions.length > 0 ?
				// Has contributions: show grid
				<div className='grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3'>
					{event.contributions.map(contribution => {
						const canDelete = canDeleteItem(
							contribution.user_id,
							currentUserId,
							currentUserParticipant?.role,
						);

						return (
							<article
								key={contribution.id}
								className='p-4 bg-secondary rounded-lg relative'>
								{canDelete && (
									<div className='absolute top-2 right-2'>
										<DeleteButton
											variant='text'
											onDelete={() => handleDeleteContribution(contribution.id)}
											isDeleting={deletingContribution === contribution.id}
											label={`Delete contribution: ${contribution.item_name}`}
										/>
									</div>
								)}
								<div className={canDelete ? "pr-8" : ""}>
									<div className='flex flex-col mb-1'>
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
										<p className='text-sm text-secondary mb-1'>
											{contribution.description}
										</p>
									)}
									{contribution.user && (
										<p className='text-xs text-tertiary mt-1'>
											Brought by {contribution.user.name}
										</p>
									)}
								</div>
							</article>
						);
					})}
				</div>
				// Empty state: contributions were fetched but there are none
			:	<EmptyState
					icon={<FaGift className='w-16 h-16' />}
					title='No contributions yet'
					message='Be the first to add a contribution to this event!'
				/>
			}

			{/* Delete Contribution Confirmation Modal */}
			{deleteContributionId && (
				<ConfirmModal
					isOpen={!!deleteContributionId}
					onClose={() => setDeleteContributionId(null)}
					onConfirm={handleConfirmDelete}
					title='Delete Contribution'
					message='Are you sure you want to delete this contribution? This action cannot be undone.'
					confirmText='Delete'
					confirmVariant='secondary'
				/>
			)}
		</AnimatedSection>
	);
};
