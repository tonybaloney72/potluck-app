interface EmptyStateProps {
	message: string;
	className?: string;
}

export const EmptyState = ({ message, className = "" }: EmptyStateProps) => {
	return <p className={`text-tertiary ${className}`}>{message}</p>;
};
