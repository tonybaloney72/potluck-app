import { useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Button } from "./Button";

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
	// Allow esc key to close the modal
	useEffect(() => {
		if (!isOpen) return;

		const handleKeyDown = (e: KeyboardEvent) => {
			if (e.key === "Escape" || e.key === "Esc") {
				onClose();
			}
		};
		window.addEventListener("keydown", handleKeyDown);
		return () => window.removeEventListener("keydown", handleKeyDown);
	}, [isOpen, onClose]);

	const handleConfirm = () => {
		onConfirm();
		onClose();
	};

	return (
		<AnimatePresence>
			{isOpen && (
				<>
					{/* Backdrop Overlay */}
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
								className='bg-secondary rounded-lg shadow-xl w-full max-w-md p-6 relative z-50 pointer-events-auto border border-border'
								onClick={e => e.stopPropagation()}>
								<div className='mb-4'>
									<h2 className='text-xl font-semibold text-primary mb-2'>
										{title}
									</h2>
									<p className='text-secondary'>{message}</p>
								</div>
								<div className='flex gap-3 justify-end'>
									<Button variant='secondary' onClick={onClose}>
										{cancelText}
									</Button>
									<Button variant={confirmVariant} onClick={handleConfirm}>
										{confirmText}
									</Button>
								</div>
							</div>
						</motion.div>
					</motion.div>
				</>
			)}
		</AnimatePresence>
	);
};
