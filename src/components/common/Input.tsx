import { forwardRef, useState, useRef, useLayoutEffect } from "react";
import { PasswordStrengthIndicator } from "./PasswordStrengthIndicator";

interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
	label?: string;
	error?: string;
	helperText?: string;
	success?: boolean;
	showCharacterCount?: boolean;
	maxLength?: number;
	showPasswordStrength?: boolean;
}

export const Input = forwardRef<HTMLInputElement, InputProps>(
	(
		{
			label,
			error,
			helperText,
			success,
			showCharacterCount,
			maxLength,
			showPasswordStrength,
			value,
			type,
			className = "",
			autoComplete,
			...props
		},
		ref,
	) => {
		const inputRef = useRef<HTMLInputElement | null>(null);
		const [currentLength, setCurrentLength] = useState(() => {
			// Initial length from value prop if available
			if (value !== undefined && typeof value === "string") {
				return value.length;
			}
			return 0;
		});

		// Use a ref to read the actual input value for character counting
		// This works with React Hook Form's register() which manages value internally
		// Use useLayoutEffect to ensure ref is set before attaching listeners
		useLayoutEffect(() => {
			if (!showCharacterCount) return;

			const input = inputRef.current;
			if (!input) return;

			const updateLength = () => {
				if (input) {
					setCurrentLength(input.value.length);
				}
			};

			// Initial length from the actual input element
			updateLength();

			// Listen for input changes
			input.addEventListener("input", updateLength);

			// Cleanup
			return () => {
				if (input) {
					input.removeEventListener("input", updateLength);
				}
			};
		}, [showCharacterCount]);

		// For password strength, use the value prop if available, otherwise get from ref
		const passwordValue =
			value !== undefined && value !== null
				? value
				: inputRef.current?.value || "";

		const inputId =
			props.id ||
			`input-${label?.toLowerCase().replace(/\s+/g, "-") || "field"}`;
		const errorId = error ? `${inputId}-error` : undefined;
		const helperTextId = helperText && !error ? `${inputId}-helper` : undefined;
		const describedBy =
			[errorId, helperTextId].filter(Boolean).join(" ") || undefined;

		return (
			<div className='w-full'>
				{label && (
					<label
						htmlFor={inputId}
						className='block text-sm font-medium text-primary'>
						{label}
					</label>
				)}
				{helperText && !error && (
					<p id={helperTextId} className='text-sm text-secondary mb-1'>
						{helperText}
					</p>
				)}
				<input
					id={inputId}
					ref={node => {
						if (typeof ref === "function") {
							ref(node);
						} else if (ref) {
							ref.current = node;
						}
						inputRef.current = node;
					}}
					type={type}
					maxLength={maxLength}
					className={`w-full px-4 py-2 bg-secondary border rounded-md text-primary placeholder:text-tertiary focus:outline-none focus:ring-2 ${
						error
							? "border-red-500 focus:ring-red-500"
							: "border-border focus:ring-accent"
					} ${className}`}
					autoComplete={autoComplete ?? "off"}
					aria-invalid={error ? "true" : "false"}
					aria-required={props.required ? "true" : undefined}
					aria-describedby={describedBy}
					aria-label={!label ? props["aria-label"] : undefined}
					{...props}
				/>
				<div className='mt-1 flex justify-between items-start'>
					<div className='flex-1'>
						{error && (
							<p id={errorId} className='text-sm text-red-500' role='alert'>
								{error}
							</p>
						)}
						{showPasswordStrength &&
							type === "password" &&
							typeof passwordValue === "string" && (
								<PasswordStrengthIndicator password={passwordValue} />
							)}
					</div>
					{showCharacterCount && maxLength && (
						<span
							className={`text-xs ml-2 ${
								currentLength > maxLength * 0.9
									? "text-orange-500"
									: "text-tertiary"
							}`}>
							{currentLength}/{maxLength}
						</span>
					)}
				</div>
			</div>
		);
	},
);

Input.displayName = "Input";
