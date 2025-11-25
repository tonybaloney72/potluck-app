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

export const SkeletonEventCard = ({
	className = "",
}: {
	className?: string;
}) => (
	<div
		className={`bg-primary rounded-lg shadow-md p-6 flex flex-col ${className}`}>
		{/* Title */}
		<Skeleton variant='text' width='70%' height={24} className='mb-3' />

		{/* Theme badge */}
		<Skeleton
			variant='rectangular'
			width={80}
			height={20}
			className='mb-2 rounded-full'
		/>

		{/* Description lines */}
		<SkeletonText lines={2} className='mb-4' />

		{/* Date and location */}
		<div className='mt-auto space-y-1'>
			<Skeleton variant='text' width='60%' height={16} />
			<Skeleton variant='text' width='80%' height={16} />
		</div>
	</div>
);

export const SkeletonFriendCard = ({
	className = "",
}: {
	className?: string;
}) => (
	<div
		className={`flex items-center gap-3 p-3 border border-border rounded-lg ${className}`}>
		<SkeletonAvatar size={48} />
		<div className='flex-1'>
			<Skeleton variant='text' width='40%' height={20} className='mb-2' />
			<Skeleton variant='text' width='60%' height={16} />
		</div>
	</div>
);

// Message Skeleton (for conversation messages)
export const SkeletonMessage = ({ isOwn = false }: { isOwn?: boolean }) => (
	<div className={`flex ${isOwn ? "justify-end" : "justify-start"} mb-4`}>
		<div className={`max-w-xs ${isOwn ? "flex-row-reverse" : "flex"} gap-2`}>
			{!isOwn && <SkeletonAvatar size={32} />}
			<div
				className={`flex-1 ${
					isOwn ? "items-end" : "items-start"
				} flex flex-col`}>
				<Skeleton variant='text' width='75%' height={20} className='mb-1' />
				<Skeleton variant='text' width='60%' height={16} />
			</div>
			{isOwn && <SkeletonAvatar size={32} />}
		</div>
	</div>
);

// Conversation List Item Skeleton
export const SkeletonConversationItem = ({
	className = "",
}: {
	className?: string;
}) => (
	<div className={`p-3 rounded-lg bg-secondary ${className}`}>
		<div className='flex items-center gap-3'>
			<SkeletonAvatar size={48} />
			<div className='flex-1'>
				<div className='flex justify-between items-center mb-1'>
					<Skeleton variant='text' width='50%' height={18} />
					<Skeleton variant='text' width={60} height={14} />
				</div>
				<Skeleton variant='text' width='80%' height={14} />
			</div>
		</div>
	</div>
);

// Event Details Page Skeleton
export const SkeletonEventDetails = () => (
	<div className='max-w-4xl mx-auto p-8 space-y-6'>
		{/* Header skeleton */}
		<div className='bg-primary rounded-lg shadow-md p-6'>
			<Skeleton variant='text' width='60%' height={32} className='mb-4' />
			<Skeleton variant='text' width='40%' height={20} className='mb-2' />
			<SkeletonText lines={3} className='mb-4' />
			<div className='flex gap-2'>
				<Skeleton variant='rectangular' width={120} height={36} />
				<Skeleton variant='rectangular' width={120} height={36} />
			</div>
		</div>

		{/* Section skeletons */}
		{Array.from({ length: 3 }).map((_, i) => (
			<div key={i} className='bg-primary rounded-lg shadow-md p-6'>
				<div className='flex justify-between items-center mb-4'>
					<Skeleton variant='text' width='30%' height={24} />
					<Skeleton variant='rectangular' width={100} height={32} />
				</div>
				<div className='space-y-3'>
					{Array.from({ length: 2 }).map((_, j) => (
						<div key={j} className='p-3 bg-secondary rounded-lg'>
							<Skeleton
								variant='text'
								width='40%'
								height={18}
								className='mb-2'
							/>
							<Skeleton variant='text' width='80%' height={16} />
						</div>
					))}
				</div>
			</div>
		))}
	</div>
);

// Profile Page Skeleton
export const SkeletonProfilePage = () => (
	<div className='max-w-2xl mx-auto p-8'>
		<Skeleton variant='text' width='40%' height={32} className='mb-8 mx-auto' />
		<div className='space-y-6'>
			{/* Name input skeleton */}
			<div>
				<Skeleton variant='text' width='15%' height={16} className='mb-2' />
				<Skeleton
					variant='rectangular'
					width='100%'
					height={40}
					className='rounded-md'
				/>
			</div>
			{/* Location input skeleton */}
			<div>
				<Skeleton variant='text' width='20%' height={16} className='mb-2' />
				<Skeleton
					variant='rectangular'
					width='100%'
					height={40}
					className='rounded-md'
				/>
			</div>
			{/* Submit button skeleton */}
			<Skeleton
				variant='rectangular'
				width={140}
				height={40}
				className='rounded-md'
			/>
		</div>
	</div>
);

// Notification Dropdown Skeleton
export const SkeletonNotificationItem = ({
	className = "",
}: {
	className?: string;
}) => (
	<div className={`p-4 border-b border-border ${className}`}>
		<div className='flex items-start gap-3'>
			{/* Icon skeleton */}
			<Skeleton
				variant='rectangular'
				width={32}
				height={32}
				className='rounded-md shrink-0'
			/>
			<div className='flex-1 min-w-0'>
				<div className='flex items-start justify-between gap-2 mb-2'>
					<Skeleton variant='text' width='50%' height={18} />
					<Skeleton
						variant='circular'
						width={8}
						height={8}
						className='shrink-0 mt-1'
					/>
				</div>
				<Skeleton variant='text' width='90%' height={16} className='mb-2' />
				<Skeleton variant='text' width='60%' height={12} />
				<div className='flex items-center gap-2 mt-3'>
					<Skeleton
						variant='rectangular'
						width={80}
						height={20}
						className='rounded'
					/>
					<Skeleton
						variant='rectangular'
						width={60}
						height={20}
						className='rounded'
					/>
				</div>
			</div>
		</div>
	</div>
);

// Protected Route / App Initialization Skeleton
export const SkeletonAppLoader = () => (
	<div className='h-screen w-screen bg-primary flex flex-col items-center justify-center p-4'>
		{/* App logo/brand skeleton */}
		<div className='mb-8 flex flex-col items-center'>
			<Skeleton
				variant='rectangular'
				width={64}
				height={64}
				className='rounded-full mb-4'
			/>
			<Skeleton variant='text' width={120} height={24} />
		</div>
		{/* Loading message */}
		<Skeleton variant='text' width={200} height={16} />
	</div>
);
