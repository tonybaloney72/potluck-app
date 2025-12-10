import { forwardRef } from "react";

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
	variant?: "primary" | "secondary" | "toggle";
	loading?: boolean;
	loadingText?: string;
	active?: boolean;
}

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(
	(
		{
			variant = "primary",
			loading = false,
			loadingText,
			active = false,
			children,
			className = "",
			disabled,
			...props
		},
		ref,
	) => {
		const baseStyles =
			"px-4 py-2 rounded-md font-medium transition-all duration-200 active:scale-[0.98] cursor-pointer disabled:cursor-not-allowed";

		const variants = {
			primary:
				"bg-accent text-bg-secondary hover:bg-accent-secondary hover:shadow-md disabled:bg-accent-tertiary disabled:opacity-50",
			secondary:
				"bg-tertiary text-primary hover:bg-primary hover:shadow-md disabled:bg-tertiary disabled:opacity-50",
			toggle:
				active ?
					"bg-accent text-bg-secondary hover:bg-accent-secondary hover:shadow-md disabled:bg-accent-tertiary disabled:opacity-50"
				:	"bg-tertiary text-primary hover:bg-primary hover:shadow-sm disabled:bg-tertiary disabled:opacity-50",
		};

		// Default loading text based on context, or use provided loadingText
		const defaultLoadingText = loadingText || "Saving...";

		return (
			<button
				ref={ref}
				className={`${baseStyles} ${variants[variant]} ${className} `}
				disabled={disabled || loading}
				aria-busy={loading}
				aria-disabled={disabled || loading}
				{...props}>
				{loading ?
					<div className='flex items-center justify-center gap-2'>
						<div
							className='animate-spin rounded-full h-4 w-4 border-2 border-current border-t-transparent'
							aria-hidden='true'
							role='status'>
							<span className='sr-only'>Loading...</span>
						</div>
						{defaultLoadingText && (
							<span aria-live='polite'>{defaultLoadingText}</span>
						)}
					</div>
				:	children}
			</button>
		);
	},
);

Button.displayName = "Button";
