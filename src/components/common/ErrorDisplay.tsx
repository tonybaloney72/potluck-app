import type { ReactNode } from "react";
import { Button } from "./Button";
import { FaExclamationTriangle, FaHome, FaRedo } from "react-icons/fa";
import { motion } from "motion/react";

interface ErrorDisplayProps {
	title?: string;
	message: string;
	onRetry?: () => void;
	onGoHome?: () => void;
	retryLabel?: string;
	goHomeLabel?: string;
	variant?: "inline" | "block" | "fullscreen";
	icon?: ReactNode;
	className?: string;
}

export const ErrorDisplay = ({
	title = "Something went wrong",
	message,
	onRetry,
	onGoHome,
	goHomeLabel = "Go to Home",
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
					<div className='flex flex-col gap-2 md:flex-row items-center justify-center'>
						{onRetry && variant !== "inline" && (
							<Button
								variant='primary'
								onClick={onRetry}
								className='mt-3 flex items-center gap-2'>
								<FaRedo className='w-4 h-4' />
								{retryLabel}
							</Button>
						)}
						{onGoHome && variant !== "inline" && (
							<Button
								variant='secondary'
								onClick={onGoHome}
								className='mt-3 flex items-center gap-2'>
								<FaHome className='w-4 h-4' />
								{goHomeLabel}
							</Button>
						)}
					</div>
				</div>
			</div>
		</motion.div>
	);
};
