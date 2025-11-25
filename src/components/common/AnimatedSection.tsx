import { motion } from "motion/react";
import type { ReactNode } from "react";

interface AnimatedSectionProps {
	children: ReactNode;
	delay?: number;
	className?: string;
}

export const AnimatedSection = ({
	children,
	delay = 0,
	className = "",
}: AnimatedSectionProps) => {
	return (
		<motion.div
			initial={{ opacity: 0, y: 20 }}
			animate={{ opacity: 1, y: 0 }}
			transition={{ delay }}
			className={className}>
			{children}
		</motion.div>
	);
};
