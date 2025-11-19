import { FaUser } from "react-icons/fa";
import type { Profile } from "../../types";

interface FriendCardProps {
	profile: Profile | null | undefined;
	subtitle?: string;
	actions: React.ReactNode;
}

export const FriendCard = ({ profile, subtitle, actions }: FriendCardProps) => {
	return (
		<div className='flex items-center justify-between p-4 bg-secondary border border-border rounded-lg'>
			<div className='flex items-center gap-3'>
				{profile?.avatar_url ? (
					<img
						src={profile.avatar_url}
						alt={profile.name || "User"}
						className='w-10 h-10 rounded-full object-cover'
					/>
				) : (
					<div className='w-10 h-10 rounded-full bg-tertiary flex items-center justify-center'>
						<FaUser className='w-5 h-5 text-text-primary' />
					</div>
				)}
				<div>
					<p className='font-medium text-text-primary'>
						{profile?.name || "Unknown User"}
					</p>
					{subtitle ? (
						<p className='text-sm text-text-secondary'>{subtitle}</p>
					) : (
						profile?.location && (
							<p className='text-sm text-text-secondary'>{profile.location}</p>
						)
					)}
				</div>
			</div>
			{actions}
		</div>
	);
};
