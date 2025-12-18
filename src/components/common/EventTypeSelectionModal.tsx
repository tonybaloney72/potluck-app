import { motion, AnimatePresence } from "motion/react";
import { useNavigate } from "react-router";
import { FaUsers, FaGlobe, FaTimes } from "react-icons/fa";
import { Button } from "./Button";
import { useCloseModal } from "../../hooks/useCloseModal";

interface EventTypeSelectionModalProps {
	isOpen: boolean;
	onClose: () => void;
}

export const EventTypeSelectionModal = ({
	isOpen,
	onClose,
}: EventTypeSelectionModalProps) => {
	const navigate = useNavigate();
	const { modalRef, initialFocusRef } = useCloseModal({ isOpen, onClose });

	const handlePrivateEvent = () => {
		onClose();
		navigate("/create-event");
	};

	const handlePublicEvent = () => {
		onClose();
		navigate("/create-event?public=true");
	};

	return (
		<AnimatePresence>
			{isOpen && (
				<motion.div
					initial={{ opacity: 0 }}
					animate={{ opacity: 1 }}
					exit={{ opacity: 0 }}
					transition={{ duration: 0.2 }}
					className='fixed inset-0 bg-black/50 z-40'
					onClick={onClose}
					aria-hidden='true'>
					{/* Modal */}
					<div className='fixed inset-0 z-50 flex items-center justify-center p-4'>
						<motion.div
							ref={modalRef}
							initial={{ opacity: 0, scale: 0.95, y: 20 }}
							animate={{ opacity: 1, scale: 1, y: 0 }}
							exit={{ opacity: 0, scale: 0.95, y: 20 }}
							transition={{ duration: 0.2, ease: "easeOut" }}
							className='bg-primary rounded-lg shadow-xl max-w-md w-full p-6'
							role='dialog'
							aria-modal='true'
							aria-labelledby='event-type-modal-title'
							aria-describedby='event-type-modal-description'>
							{/* Header */}
							<div className='flex items-center justify-between mb-6'>
								<div>
									<h2
										id='event-type-modal-title'
										className='text-2xl font-bold text-primary'>
										Create Event
									</h2>
									<p
										id='event-type-modal-description'
										className='text-sm text-secondary mt-1'>
										Choose the type of event you want to create
									</p>
								</div>
								<button
									onClick={onClose}
									className='text-tertiary hover:text-primary transition-colors min-w-[44px] min-h-[44px] flex items-center justify-center hover:bg-tertiary rounded-md cursor-pointer'
									aria-label='Close modal'
									type='button'>
									<FaTimes className='w-5 h-5' />
								</button>
							</div>

							{/* Options */}
							<div className='space-y-4'>
								{/* Private Event Option */}
								<motion.button
									whileHover={{ scale: 1.02 }}
									whileTap={{ scale: 0.98 }}
									onClick={handlePrivateEvent}
									className='w-full p-6 bg-secondary border-2 border-border rounded-lg hover:border-accent transition-all text-left group'
									type='button'
									aria-label='Create private event'>
									<div className='flex items-start gap-4'>
										<div className='shrink-0 w-12 h-12 bg-accent/20 rounded-lg flex items-center justify-center group-hover:bg-accent/30 transition-colors'>
											<FaUsers className='w-6 h-6 text-accent' />
										</div>
										<div className='flex-1'>
											<h3 className='text-lg font-semibold text-primary mb-1'>
												Private Event
											</h3>
											<p className='text-sm text-secondary'>
												Invite specific friends and control who can see and
												attend your event.
											</p>
										</div>
									</div>
								</motion.button>

								{/* Public Event Option */}
								<motion.button
									whileHover={{ scale: 1.02 }}
									whileTap={{ scale: 0.98 }}
									onClick={handlePublicEvent}
									className='w-full p-6 bg-secondary border-2 border-border rounded-lg hover:border-accent transition-all text-left group'
									type='button'
									aria-label='Create public event'>
									<div className='flex items-start gap-4'>
										<div className='shrink-0 w-12 h-12 bg-accent/20 rounded-lg flex items-center justify-center group-hover:bg-accent/30 transition-colors'>
											<FaGlobe className='w-6 h-6 text-accent' />
										</div>
										<div className='flex-1'>
											<h3 className='text-lg font-semibold text-primary mb-1'>
												Public Event
											</h3>
											<p className='text-sm text-secondary'>
												Make your event discoverable to others in your area.
												Anyone can find and join your event.
											</p>
										</div>
									</div>
								</motion.button>
							</div>

							{/* Cancel Button */}
							<div className='mt-6 flex justify-end'>
								<Button
									ref={initialFocusRef}
									type='button'
									variant='secondary'
									onClick={onClose}>
									Cancel
								</Button>
							</div>
						</motion.div>
					</div>
				</motion.div>
			)}
		</AnimatePresence>
	);
};
