interface SkeletonProps {
	className?: string;
	variant?: "text" | "circular" | "rectangular";
	width?: string | number;
	height?: string | number;
	animation?: "pulse" | "wave" | "none";
}

export const Skeleton = ({
	className = "",
	variant = "rectangular",
	width,
	height,
	animation = "pulse",
}: SkeletonProps) => {
	const baseStyles = "bg-tertiary rounded";

	const variantStyles = {
		text: "h-4 rounded",
		circular: "rounded-full",
		rectangular: "rounded-md",
	};

	const animationStyles = {
		pulse: "animate-pulse",
		wave: "animate-[shimmer_2s_infinite]",
		none: "",
	};

	const style = {
		...(width && { width: typeof width === "number" ? `${width}px` : width }),
		...(height && {
			height: typeof height === "number" ? `${height}px` : height,
		}),
	};

	return (
		<div
			className={`${baseStyles} ${variantStyles[variant]} ${animationStyles[animation]} ${className}`}
			style={style}
			aria-label='Loading...'
		/>
	);
};

// Pre-configured skeleton components
export const SkeletonText = ({
	lines = 1,
	className = "",
}: {
	lines?: number;
	className?: string;
}) => (
	<div className={`space-y-2 ${className}`}>
		{Array.from({ length: lines }).map((_, i) => (
			<Skeleton
				key={i}
				variant='text'
				width={i === lines - 1 ? "75%" : "100%"}
			/>
		))}
	</div>
);

export const SkeletonCard = ({ className = "" }: { className?: string }) => (
	<div className={`p-4 border border-border rounded-lg ${className}`}>
		<div className='flex items-center gap-3 mb-3'>
			<Skeleton variant='circular' width={40} height={40} />
			<Skeleton variant='text' width='60%' />
		</div>
		<SkeletonText lines={3} />
	</div>
);

export const SkeletonAvatar = ({
	size = 40,
	className = "",
}: {
	size?: number;
	className?: string;
}) => (
	<Skeleton
		variant='circular'
		width={size}
		height={size}
		className={className}
	/>
);
