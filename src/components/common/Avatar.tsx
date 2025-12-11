interface AvatarProps {
	user: { avatar_url: string | null; name?: string | null } | null | undefined;
	size?: "sm" | "md" | "lg" | "xl";
	className?: string;
}

const sizeClasses = {
	sm: "w-8 h-8",
	md: "w-10 h-10 md:w-12 md:h-12",
	lg: "w-12 h-12 md:w-18 md:h-18",
	xl: "w-18 h-18 md:w-24 md:h-24",
};

export const Avatar = ({ user, size = "md", className = "" }: AvatarProps) => {
	const sizeClass = sizeClasses[size];

	if (user?.avatar_url) {
		return (
			<img
				src={user.avatar_url}
				alt={user.name || "User"}
				className={`${sizeClass} rounded-full ${className}`}
			/>
		);
	}

	const initial = user?.name ? user.name.charAt(0).toUpperCase() : "U";

	return (
		<div
			className={`${sizeClass} rounded-full bg-tertiary flex items-center justify-center ${className}`}>
			<span className='text-primary'>{initial}</span>
		</div>
	);
};
