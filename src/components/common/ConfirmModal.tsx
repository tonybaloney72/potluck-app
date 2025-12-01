import { useEffect, useRef } from "react";
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
	const modalRef = useRef<HTMLDivElement>(null);
	const cancelButtonRef = useRef<HTMLButtonElement>(null);
	const confirmButtonRef = useRef<HTMLButtonElement>(null);

	// Focus trap and keyboard handling
	useEffect(() => {
		if (!isOpen) return;

		const modal = modalRef.current;
		if (!modal) return;

		// Focus the cancel button when modal opens
		cancelButtonRef.current?.focus();

		const handleKeyDown = (e: KeyboardEvent) => {
			if (e.key === "Escape" || e.key === "Esc") {
				onClose();
				return;
			}

			// Focus trap: keep focus within modal
			if (e.key === "Tab") {
				const focusableElements = modal.querySelectorAll<HTMLElement>(
					'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])',
				);
				const firstElement = focusableElements[0];
				const lastElement = focusableElements[focusableElements.length - 1];

				if (e.shiftKey) {
					// Shift + Tab
					if (document.activeElement === firstElement) {
						e.preventDefault();
						lastElement?.focus();
					}
				} else {
					// Tab
					if (document.activeElement === lastElement) {
						e.preventDefault();
						firstElement?.focus();
					}
				}
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
						onClick={onClose}
						aria-hidden='true'>
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
										ref={cancelButtonRef}
										variant='secondary'
										onClick={onClose}
										type='button'>
										{cancelText}
									</Button>
									<Button
										ref={confirmButtonRef}
										variant={confirmVariant}
										onClick={handleConfirm}
										type='button'>
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
