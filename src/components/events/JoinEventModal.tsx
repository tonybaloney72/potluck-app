import { useState } from "react";
import { motion, AnimatePresence } from "motion/react";
import { Button } from "../common/Button";
import { useCloseModal } from "../../hooks/useCloseModal";
import { FaTimes } from "react-icons/fa";

interface JoinEventModalProps {
	isOpen: boolean;
	onClose: () => void;
	onJoin: (role: "guest" | "contributor") => Promise<void>;
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
	const [selectedRole, setSelectedRole] = useState<"guest" | "contributor">(
		availableRoles[0] || "guest",
	);

	const handleJoin = async () => {
		await onJoin(selectedRole);
	};

	const needsApproval =
		selectedRole === "contributor" && availableRoles.includes("contributor");

	return (
		<AnimatePresence>
			{isOpen && (
				<motion.div
					className='fixed inset-0 bg-black/40 z-40'
					initial={{ opacity: 0 }}
					animate={{ opacity: 1 }}
					exit={{ opacity: 0 }}
					onClick={onClose}>
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
										Join Event
									</h2>
									<button
										onClick={onClose}
										className='text-tertiary hover:text-primary transition-colors cursor-pointer flex items-center justify-center'
										aria-label='Close modal'>
										<FaTimes className='w-5 h-5' />
									</button>
								</div>

								<p id='modal-description' className='text-secondary mb-4'>
									How would you like to join "{eventTitle}"?
								</p>

								{/* Role selection */}
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
													:	"You can add items you're bringing to the event."}
												</div>
											</div>
										</label>
									)}
								</div>
							</div>

							<div className='flex gap-3 justify-end'>
								<Button
									ref={initialFocusRef}
									variant='secondary'
									onClick={onClose}
									type='button'
									disabled={loading}>
									Cancel
								</Button>
								<Button
									variant='primary'
									onClick={handleJoin}
									type='button'
									loading={loading}
									disabled={loading}>
									{needsApproval ? "Request to Join" : "Join Event"}
								</Button>
							</div>
						</div>
					</motion.div>
				</motion.div>
			)}
		</AnimatePresence>
	);
};
