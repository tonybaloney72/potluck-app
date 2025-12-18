import { motion, AnimatePresence } from "framer-motion";
import { Button } from "./Button";
import { useCloseModal } from "../../hooks/useCloseModal";

interface ConfirmModalProps {
	isOpen: boolean;
	onClose: () => void;
	onConfirm: () => void;
	title: string;
	message: string;
	confirmText?: string;
	cancelText?: string;
	confirmVariant?: "primary" | "secondary";
}

export const ConfirmModal = ({
	isOpen,
	onClose,
	onConfirm,
	title,
	message,
	confirmText = "Confirm",
	cancelText = "Cancel",
	confirmVariant = "primary",
}: ConfirmModalProps) => {
	const { modalRef, initialFocusRef } = useCloseModal({ isOpen, onClose });

	const handleConfirm = () => {
		onConfirm();
		onClose();
	};

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
							<div className='mb-4'>
								<h2
									id='modal-title'
									className='text-xl font-semibold text-primary mb-2'>
									{title}
								</h2>
								<p id='modal-description' className='text-secondary'>
									{message}
								</p>
							</div>
							<div className='flex gap-3 justify-end'>
								<Button
									ref={initialFocusRef}
									variant='secondary'
									onClick={onClose}
									type='button'>
									{cancelText}
								</Button>
								<Button
									variant={confirmVariant}
									onClick={handleConfirm}
									type='button'>
									{confirmText}
								</Button>
							</div>
						</div>
					</motion.div>
				</motion.div>
			)}
		</AnimatePresence>
	);
};
