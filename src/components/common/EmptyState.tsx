import { type ReactNode } from "react";
import { Button } from "./Button";
import { motion } from "motion/react";

interface EmptyStateProps {
	icon?: ReactNode;
	title?: string;
	message: string;
	actionLabel?: string;
	onAction?: () => void;
	variant?: "default" | "error" | "success";
	className?: string;
}

export const EmptyState = ({
	icon,
	title,
	message,
	actionLabel,
	onAction,
	variant = "default",
	className = "",
}: EmptyStateProps) => {
	const variantStyles = {
		default: "text-secondary",
		error: "text-red-500",
		success: "text-green-500",
	};
	return (
		<motion.div
			initial={{ opacity: 0, y: 10 }}
			animate={{ opacity: 1, y: 0 }}
			transition={{ duration: 0.3 }}
			className={`flex flex-col items-center justify-center p-8 text-center ${className}`}>
			{icon && <div className={`mb-4 ${variantStyles[variant]}`}>{icon}</div>}
			{title && (
				<h3 className={`text-xl font-semibold mb-2 ${variantStyles[variant]}`}>
					{title}
				</h3>
			)}
			<p className={`text-secondary max-w-md mb-4 ${variantStyles[variant]}`}>
				{message}
			</p>
			{actionLabel && onAction && (
				<Button variant='primary' onClick={onAction}>
					{actionLabel}
				</Button>
			)}
		</motion.div>
	);
};
