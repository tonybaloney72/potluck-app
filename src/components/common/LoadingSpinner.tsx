interface LoadingSpinnerProps {
	fullScreen?: boolean;
	size?: "sm" | "md" | "lg";
	message?: string;
}

export const LoadingSpinner = ({
	fullScreen = false,
	size = "md",
	message,
}: LoadingSpinnerProps) => {
	const sizeClasses = {
		sm: "h-6 w-6 border-2",
		md: "h-12 w-12 border-b-2",
		lg: "h-16 w-16 border-b-2",
	};

	const spinner = (
		<div
			className={`animate-spin rounded-full border-accent ${sizeClasses[size]}`}
			aria-label='Loading'
			role='status'>
			<span className='sr-only'>Loading...</span>
		</div>
	);

	if (fullScreen) {
		return (
			<div className='flex flex-col items-center justify-center bg-primary p-4'>
				{spinner}
				{message && <p className='mt-4 text-sm text-secondary'>{message}</p>}
			</div>
		);
	}

	return (
		<div className='flex flex-col items-center justify-center p-4'>
			{spinner}
			{message && <p className='mt-4 text-sm text-secondary'>{message}</p>}
		</div>
	);
};
