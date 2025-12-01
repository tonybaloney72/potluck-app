import { FaTimes } from "react-icons/fa";

interface DeleteButtonProps {
	onDelete: () => void;
	disabled?: boolean;
	isDeleting?: boolean;
	label?: string;
	variant?: "icon" | "text";
	className?: string;
}

export const DeleteButton = ({
	onDelete,
	disabled = false,
	isDeleting = false,
	label = "Delete",
	variant = "text",
	className = "",
}: DeleteButtonProps) => {
	const baseClasses =
		"text-red-500 hover:text-red-700 text-sm disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer transition-all duration-200";

	if (variant === "icon") {
		return (
			<button
				onClick={onDelete}
				disabled={disabled || isDeleting}
				className={`${baseClasses} p-1 rounded-full hover:bg-red-500/10 active:scale-95 flex justify-center items-center ${className}`}
				aria-label={label}
				aria-busy={isDeleting}
				aria-disabled={disabled || isDeleting}
				type='button'>
				<FaTimes className='w-4 h-4' aria-hidden='true' />
			</button>
		);
	}

	return (
		<button
			onClick={onDelete}
			disabled={disabled || isDeleting}
			className={`${baseClasses} p-1 rounded-full hover:bg-red-500/10 active:scale-95 flex justify-center items-center ${className}`}
			aria-label={label}
			aria-busy={isDeleting}
			aria-disabled={disabled || isDeleting}
			type='button'>
			{isDeleting ? (
				<>
					<span className='sr-only'>Deleting</span>
					<span aria-live='polite'>Deleting...</span>
				</>
			) : (
				<FaTimes className='w-4 h-4' aria-hidden='true' />
			)}
		</button>
	);
};
