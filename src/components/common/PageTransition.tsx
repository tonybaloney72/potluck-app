import { motion } from "motion/react";
import { useLocation } from "react-router";
import type { ReactNode } from "react";

interface PageTransitionProps {
	children: ReactNode;
}

/**
 * PageTransition component provides smooth fade animations when routes change.
 * Note: Scroll-to-top is handled in Layout component where the scroll container exists.
 *
 * Usage:
 * <PageTransition>
 *   <YourPageContent />
 * </PageTransition>
 */
export const PageTransition = ({ children }: PageTransitionProps) => {
	const location = useLocation();

	return (
		<motion.div
			key={location.pathname}
			initial={{ opacity: 0, y: 10 }}
			animate={{ opacity: 1, y: 0 }}
			exit={{ opacity: 0, y: -10 }}
			transition={{ duration: 0.2, ease: "easeInOut" }}
			className='w-full h-full'>
			{children}
		</motion.div>
	);
};
