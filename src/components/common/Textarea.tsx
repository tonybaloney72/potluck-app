import { forwardRef, useState, useLayoutEffect, useRef } from "react";

interface TextareaProps
	extends React.TextareaHTMLAttributes<HTMLTextAreaElement> {
	label?: string;
	error?: string;
	helperText?: string;
	success?: boolean;
	showCharacterCount?: boolean;
	maxLength?: number;
}

export const Textarea = forwardRef<HTMLTextAreaElement, TextareaProps>(
	(
		{
			label,
			error,
			helperText,
			success,
			showCharacterCount,
			maxLength,
			value,
			className = "",
			autoComplete,
			...props
		},
		ref,
	) => {
		const textareaRef = useRef<HTMLTextAreaElement | null>(null);
		const [isFocused, setIsFocused] = useState(false);
		const [currentLength, setCurrentLength] = useState(() => {
			// Initial length from value prop if available
			if (value !== undefined && typeof value === "string") {
				return value.length;
			}
			return 0;
		});

		// Use a ref to read the actual textarea value for character counting
		// This works with React Hook Form's register() which manages value internally
		// Use useLayoutEffect to ensure ref is set before attaching listeners
		useLayoutEffect(() => {
			if (!showCharacterCount) return;

			const textarea = textareaRef.current;
			if (!textarea) return;

			const updateLength = () => {
				if (textarea) {
					setCurrentLength(textarea.value.length);
				}
			};

			// Initial length from the actual textarea element
			updateLength();

			// Listen for input changes
			textarea.addEventListener("input", updateLength);

			// Cleanup
			return () => {
				if (textarea) {
					textarea.removeEventListener("input", updateLength);
				}
			};
		}, [showCharacterCount]);

		return (
			<div className='w-full'>
				{label && (
					<label className='block text-sm font-medium mb-1 text-primary'>
						{label}
					</label>
				)}
				<textarea
					ref={node => {
						if (typeof ref === "function") {
							ref(node);
						} else if (ref) {
							ref.current = node;
						}
						textareaRef.current = node;
					}}
					maxLength={maxLength}
					onFocus={() => setIsFocused(true)}
					onBlur={() => setIsFocused(false)}
					className={`w-full px-4 py-2 bg-secondary border rounded-md text-primary placeholder:text-tertiary focus:outline-none focus:ring-2 min-h-[100px] resize-y ${
						error
							? "border-red-500 focus:ring-red-500"
							: isFocused
							? "border-accent focus:ring-accent"
							: "border-border focus:ring-accent"
					} ${className}`}
					autoComplete={autoComplete ?? "off"}
					{...props}
				/>
				<div className='mt-1 flex justify-between items-start'>
					<div className='flex-1'>
						{error && <p className='text-sm text-red-500'>{error}</p>}
						{helperText && !error && (
							<p className='text-sm text-secondary'>{helperText}</p>
						)}
					</div>
					{showCharacterCount && maxLength && (
						<span
							className={`text-xs ml-2 ${
								currentLength > maxLength * 0.9
									? "text-orange-500"
									: currentLength > maxLength * 0.75
									? "text-yellow-500"
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

Textarea.displayName = "Textarea";
