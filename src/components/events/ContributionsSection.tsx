import { useState } from "react";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { motion, AnimatePresence } from "motion/react";
import { AnimatedSection } from "../common/AnimatedSection";
import { SectionHeader } from "../common/SectionHeader";
import { EmptyState } from "../common/EmptyState";
import { DeleteButton } from "../common/DeleteButton";
import { Button } from "../common/Button";
import { Skeleton } from "../common/Skeleton";
import type { Event, EventParticipant } from "../../types";
import { canAddContributions, canDeleteItem } from "../../utils/events";
import { FaGift } from "react-icons/fa";

const contributionSchema = z.object({
	itemName: z.string().min(1, "Item name is required"),
	quantity: z.string().optional(),
	description: z.string().optional(),
});

type ContributionFormData = z.infer<typeof contributionSchema>;

interface ContributionsSectionProps {
	event: Event;
	currentUserParticipant: EventParticipant | undefined;
	currentUserId: string | undefined;
	onAddContribution: (data: ContributionFormData) => void;
	onDeleteContribution: (contributionId: string) => void;
	addingContribution: boolean;
	deletingContribution: string | null;
}

export const ContributionsSection = ({
	event,
	currentUserParticipant,
	currentUserId,
	onAddContribution,
	onDeleteContribution,
	addingContribution,
	deletingContribution,
}: ContributionsSectionProps) => {
	const [showForm, setShowForm] = useState(false);

	const contributionForm = useForm<ContributionFormData>({
		resolver: zodResolver(contributionSchema),
		defaultValues: {
			itemName: "",
			quantity: "",
			description: "",
		},
	});

	const canAdd = canAddContributions(currentUserParticipant?.role);

	const actionButton = canAdd ? (
		<Button
			onClick={() => setShowForm(!showForm)}
			className='text-sm min-h-[44px]'>
			{showForm ? "Cancel" : "Add"}
		</Button>
	) : undefined;

	const handleSubmit = (data: ContributionFormData) => {
		onAddContribution(data);
		contributionForm.reset();
		setShowForm(false);
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
						className='overflow-hidden p-4 bg-secondary rounded-lg'>
						<motion.div
							initial={{ y: -10 }}
							animate={{ y: 0 }}
							exit={{ y: -10 }}
							transition={{ duration: 0.2, ease: "easeInOut" }}>
							<input
								type='text'
								placeholder='Item name *'
								{...contributionForm.register("itemName")}
								className={formInputClassName}
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
								className={formInputClassName}
							/>
							<textarea
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

			{event.contributions === undefined ? (
				// Loading state: contributions are being fetched
				<div className='space-y-3'>
					{Array.from({ length: 2 }).map((_, i) => (
						<div
							key={i}
							className='p-4 bg-secondary rounded-lg flex justify-between items-start'>
							<div className='flex-1'>
								<div className='flex items-center gap-2 mb-2'>
									<Skeleton variant='text' width='40%' height={20} />
									<Skeleton variant='text' width='20%' height={16} />
								</div>
								<Skeleton
									variant='text'
									width='80%'
									height={16}
									className='mb-2'
								/>
								<Skeleton variant='text' width='30%' height={14} />
							</div>
						</div>
					))}
				</div>
			) : event.contributions && event.contributions.length > 0 ? (
				// Has contributions: show list
				<div className='space-y-3'>
					{event.contributions.map(contribution => {
						const canDelete = canDeleteItem(
							contribution.user_id,
							currentUserId,
							currentUserParticipant?.role,
						);

						return (
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
								{canDelete && (
									<DeleteButton
										variant='text'
										onDelete={() => onDeleteContribution(contribution.id)}
										isDeleting={deletingContribution === contribution.id}
									/>
								)}
							</div>
						);
					})}
				</div>
			) : (
				// Empty state: contributions were fetched but there are none
				<EmptyState
					icon={<FaGift className='w-16 h-16' />}
					title='No contributions yet'
					message='Be the first to add a contribution to this event!'
				/>
			)}
		</AnimatedSection>
	);
};
