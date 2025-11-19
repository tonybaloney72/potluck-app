import { forwardRef } from "react";

interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
	label?: string;
	error?: string;
}

export const Input = forwardRef<HTMLInputElement, InputProps>(
	({ label, error, className = "", ...props }, ref) => {
		return (
			<div className='w-full'>
				{label && (
					<label className='block text-sm font-medium mb-1 text-text-primary'>
						{label}
					</label>
				)}
				<input
					ref={ref}
					className={`w-full px-4 py-2 bg-secondary border rounded-md text-text-primary placeholder:text-text-tertiary focus:outline-none focus:ring-2 focus:ring-accent ${
						error ? "border-red-500" : "border-border"
					} ${className}`}
					{...props}
				/>
				{error && <p className='mt-1 text-sm text-red-500'>{error}</p>}
			</div>
		);
	},
);

Input.displayName = "Input";
