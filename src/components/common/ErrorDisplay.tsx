import type { ReactNode } from "react";
import { Button } from "./Button";
import { FaExclamationTriangle, FaRedo } from "react-icons/fa";
import { motion } from "motion/react";

interface ErrorDisplayProps {
	title?: string;
	message: string;
	onRetry?: () => void;
	retryLabel?: string;
	variant?: "inline" | "block" | "fullscreen";
	icon?: ReactNode;
	className?: string;
}

export const ErrorDisplay = ({
	title = "Something went wrong",
	message,
	onRetry,
	retryLabel = "Try Again",
	variant = "block",
	icon,
	className = "",
}: ErrorDisplayProps) => {
	const displayIcon = icon || (
		<FaExclamationTriangle className='w-6 h-6 text-red-500' />
	);

	const variants = {
		inline:
			"p-2 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded text-red-700 dark:text-red-400",
		block:
			"p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg text-red-700 dark:text-red-400",
		fullscreen:
			"flex flex-col items-center justify-center min-h-[400px] p-8 text-center",
	};

	return (
		<motion.div
			initial={{ opacity: 0, y: -10 }}
			animate={{ opacity: 1, y: 0 }}
			className={`${variants[variant]} ${className}`}>
			<div className='flex items-start gap-3'>
				<div className='flex-1 flex flex-col items-center'>
					{title && variant !== "inline" && (
						<div className='flex items-center gap-2'>
							{displayIcon}
							<h3 className='font-semibold mb-1'>{title}</h3>
						</div>
					)}
					<p className='text-sm'>{message}</p>
					{onRetry && variant !== "inline" && (
						<Button
							variant='primary'
							onClick={onRetry}
							className='mt-3 flex items-center gap-2'>
							<FaRedo className='w-4 h-4' />
							{retryLabel}
						</Button>
					)}
				</div>
			</div>
		</motion.div>
	);
};
