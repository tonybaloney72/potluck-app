interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
	variant?: "primary" | "secondary" | "toggle";
	loading?: boolean;
	active?: boolean;
}

export const Button = ({
	variant = "primary",
	loading = false,
	active = false,
	children,
	className = "",
	disabled,
	...props
}: ButtonProps) => {
	const baseStyles =
		"px-4 py-2 rounded-md font-medium transition-all duration-200 cursor-pointer hover:opacity-90 active:opacity-75";

	const variants = {
		primary:
			"bg-accent text-bg-secondary hover:bg-accent-secondary hover:shadow-md disabled:bg-accent-tertiary disabled:opacity-50 disabled:cursor-not-allowed",
		secondary:
			"bg-tertiary text-text-primary hover:bg-border hover:shadow-md disabled:bg-tertiary disabled:opacity-50 disabled:cursor-not-allowed",
		toggle: active
			? "bg-accent text-bg-secondary hover:bg-accent-secondary hover:shadow-md"
			: "bg-tertiary text-text-primary hover:bg-border hover:shadow-sm",
	};

	return (
		<button
			className={`${baseStyles} ${variants[variant]} ${className}`}
			disabled={disabled || loading}
			{...props}>
			{loading ? (
				<div className='flex items-center justify-center gap-2'>
					<div
						className='animate-spin rounded-full h-4 w-4 border-2 border-current border-t-transparent'
						aria-label='Loading'
						role='status'>
						<span className='sr-only'>Loading...</span>
					</div>
					<span>Saving...</span>
				</div>
			) : (
				children
			)}
		</button>
	);
};
