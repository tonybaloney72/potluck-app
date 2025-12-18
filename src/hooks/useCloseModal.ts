import { useEffect, useRef } from "react";

type UseCloseModalParams = {
	isOpen: boolean;
	onClose: () => void;
};

/**
 * Trap focus and handle Escape key to close modals.
 * Returns a modal ref and a focusable button ref (typically for the Cancel/Close button).
 */
export const useCloseModal = ({ isOpen, onClose }: UseCloseModalParams) => {
	const modalRef = useRef<HTMLDivElement>(null);
	const initialFocusRef = useRef<HTMLButtonElement>(null);

	useEffect(() => {
		if (!isOpen) return;

		const modal = modalRef.current;
		if (!modal) return;

		// Focus initial (cancel/close) button when modal opens
		initialFocusRef.current?.focus();

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

				if (focusableElements.length === 0) return;

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

	return { modalRef, initialFocusRef };
};
