import { useState } from "react";
import { motion, AnimatePresence } from "motion/react";
import { Button } from "../common/Button";
import { useCloseModal } from "../../hooks/useCloseModal";
import { FaTimes } from "react-icons/fa";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";

const contributionSchema = z.object({
	itemName: z.string().min(1, "Item name is required"),
	quantity: z.string().optional(),
	description: z.string().optional(),
});

type ContributionFormData = z.infer<typeof contributionSchema>;

interface JoinEventModalProps {
	isOpen: boolean;
	onClose: () => void;
	onJoin: (
		role: "guest" | "contributor",
		contribution?: ContributionFormData,
	) => Promise<void>;
	availableRoles: ("guest" | "contributor")[];
	eventTitle: string;
	loading?: boolean;
}

export const JoinEventModal = ({
	isOpen,
	onClose,
	onJoin,
	availableRoles,
	eventTitle,
	loading = false,
}: JoinEventModalProps) => {
	const { modalRef, initialFocusRef } = useCloseModal({ isOpen, onClose });
	const [step, setStep] = useState<1 | 2>(1);
	const [selectedRole, setSelectedRole] = useState<"guest" | "contributor">(
		availableRoles[0] || "guest",
	);

	const contributionForm = useForm<ContributionFormData>({
		resolver: zodResolver(contributionSchema),
		defaultValues: {
			itemName: "",
			quantity: "",
			description: "",
		},
	});

	const needsApproval =
		selectedRole === "contributor" && availableRoles.includes("contributor");

	const handleRoleSelection = () => {
		if (selectedRole === "contributor") {
			setStep(2);
		} else {
			handleJoin();
		}
	};

	const handleJoin = async () => {
		if (selectedRole === "contributor") {
			const formData = contributionForm.getValues();
			await onJoin(selectedRole, formData);
		} else {
			await onJoin(selectedRole);
		}
	};

	const handleBack = () => {
		setStep(1);
		contributionForm.reset();
	};

	const handleClose = () => {
		setStep(1);
		contributionForm.reset();
		onClose();
	};

	const formInputClassName =
		"w-full mb-2 px-4 py-2 bg-primary border border-border rounded-md text-primary placeholder:text-tertiary focus:outline-none focus:ring-2 focus:ring-accent";

	return (
		<AnimatePresence>
			{isOpen && (
				<motion.div
					className='fixed inset-0 bg-black/40 z-40'
					initial={{ opacity: 0 }}
					animate={{ opacity: 1 }}
					exit={{ opacity: 0 }}
					onClick={handleClose}>
					<motion.div
						className='fixed inset-0 z-50 flex items-center justify-center px-4 pointer-events-none'
						initial={{ opacity: 0, y: 40, scale: 0.96 }}
						animate={{ opacity: 1, y: 0, scale: 1 }}
						exit={{ opacity: 0, y: 40, scale: 0.96 }}
						transition={{ duration: 0.18 }}
						onClick={e => e.stopPropagation()}>
						<div
							ref={modalRef}
							role='dialog'
							aria-modal='true'
							aria-labelledby='modal-title'
							aria-describedby='modal-description'
							className='bg-secondary rounded-lg shadow-xl w-full max-w-md p-6 relative z-50 pointer-events-auto border border-border'
							onClick={e => e.stopPropagation()}>
							{/* Close button */}
							<div className='mb-6'>
								<div className='flex justify-between items-center mb-2'>
									<h2
										id='modal-title'
										className='text-xl font-semibold text-primary'>
										{step === 1 ? "Join Event" : "What are you contributing?"}
									</h2>
									<button
										onClick={handleClose}
										className='text-tertiary hover:text-primary transition-colors cursor-pointer flex items-center justify-center'
										aria-label='Close modal'>
										<FaTimes className='w-5 h-5' />
									</button>
								</div>

								<p id='modal-description' className='text-secondary mb-4'>
									{step === 1 ?
										`How would you like to join "${eventTitle}"?`
									: needsApproval ?
										"Tell us what you'd like to contribute. The host will review your request."
									:	"What would you like to contribute to this event?"}
								</p>

								{/*Step 1: Role selection */}
								<AnimatePresence mode='wait'>
									{step === 1 && (
										<motion.div
											key='step1'
											initial={{ opacity: 0, x: -20 }}
											animate={{ opacity: 1, x: 0 }}
											exit={{ opacity: 0, x: 20 }}
											transition={{ duration: 0.2 }}>
											<div className='space-y-2'>
												{availableRoles.includes("guest") && (
													<label className='flex items-center gap-3 p-3 border border-border rounded-md cursor-pointer hover:bg-tertiary transition-colors'>
														<input
															type='radio'
															name='joinRole'
															value='guest'
															checked={selectedRole === "guest"}
															onChange={() => setSelectedRole("guest")}
															className='mt-1'
														/>
														<div className='flex-1'>
															<div className='font-medium text-primary'>
																Join as Guest
															</div>
															<div className='text-sm text-secondary'>
																You can view the event and see what others are
																bringing.
															</div>
														</div>
													</label>
												)}

												{availableRoles.includes("contributor") && (
													<label className='flex items-center gap-3 p-3 border border-border rounded-md cursor-pointer hover:bg-tertiary transition-colors'>
														<input
															type='radio'
															name='joinRole'
															value='contributor'
															checked={selectedRole === "contributor"}
															onChange={() => setSelectedRole("contributor")}
															className='mt-1'
														/>
														<div className='flex-1'>
															<div className='font-medium text-primary'>
																Join as Contributor
															</div>
															<div className='text-sm text-secondary'>
																{needsApproval ?
																	"You can add items you're bringing, but the host needs to approve your request first."
																:	"You can add items you're bringing to the event."
																}
															</div>
														</div>
													</label>
												)}
											</div>
										</motion.div>
									)}

									{/* Step 2: Contribution Form */}
									{step === 2 && (
										<motion.form
											key='step2'
											initial={{ opacity: 0, x: -20 }}
											animate={{ opacity: 1, x: 0 }}
											exit={{ opacity: 0, x: 20 }}
											transition={{ duration: 0.2 }}
											onSubmit={contributionForm.handleSubmit(handleJoin)}
											className='space-y-4'>
											<div>
												<label
													htmlFor='contribution-item-name'
													className='block text-sm font-medium text-primary mb-1'>
													Item name <span className='text-red-500'>*</span>
												</label>
												<input
													id='contribution-item-name'
													type='text'
													placeholder='e.g., Macaroni and Cheese'
													{...contributionForm.register("itemName")}
													className={formInputClassName}
													autoComplete='off'
													aria-required='true'
													aria-invalid={
														contributionForm.formState.errors.itemName ?
															"true"
														:	"false"
													}
												/>
												{contributionForm.formState.errors.itemName && (
													<p className='text-red-500 text-sm mt-1' role='alert'>
														{contributionForm.formState.errors.itemName.message}
													</p>
												)}
											</div>

											<div>
												<label
													htmlFor='contribution-quantity'
													className='block text-sm font-medium text-primary mb-1'>
													Quantity (optional)
												</label>
												<input
													id='contribution-quantity'
													type='text'
													placeholder='e.g., 2 dishes, 1 dozen'
													{...contributionForm.register("quantity")}
													className={formInputClassName}
													autoComplete='off'
												/>
											</div>

											<div>
												<label
													htmlFor='contribution-description'
													className='block text-sm font-medium text-primary mb-1'>
													Description (optional)
												</label>
												<textarea
													id='contribution-description'
													placeholder='Any additional details about your contribution...'
													{...contributionForm.register("description")}
													className={formInputClassName}
													rows={3}
													autoComplete='off'
												/>
											</div>
										</motion.form>
									)}
								</AnimatePresence>
							</div>

							<div className='flex gap-3 justify-end'>
								{step === 2 && (
									<Button
										variant='secondary'
										onClick={handleBack}
										type='button'
										disabled={loading}>
										Back
									</Button>
								)}
								<Button
									ref={step === 1 ? initialFocusRef : undefined}
									variant='secondary'
									onClick={handleClose}
									type='button'
									disabled={loading}>
									Cancel
								</Button>
								{step === 1 ?
									<Button
										variant='primary'
										onClick={handleRoleSelection}
										type='button'
										disabled={loading}>
										Continue
									</Button>
								:	<Button
										variant='primary'
										onClick={contributionForm.handleSubmit(handleJoin)}
										type='button'
										loading={loading}
										disabled={loading}>
										{needsApproval ? "Send Request" : "Join Event"}
									</Button>
								}
							</div>
						</div>
					</motion.div>
				</motion.div>
			)}
		</AnimatePresence>
	);
};
