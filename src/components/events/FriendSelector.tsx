import { useState, useEffect } from "react";
import { useAppSelector, useAppDispatch } from "../../store/hooks";
import { fetchFriendships } from "../../store/slices/friendsSlice";
import { FaUser, FaTimes } from "react-icons/fa";
import type { Profile } from "../../types";

interface FriendSelectorProps {
	selectedFriends: string[];
	onSelectionChange: (friendIds: string[]) => void;
	excludeIds?: string[];
}

export const FriendSelector = ({
	selectedFriends,
	onSelectionChange,
	excludeIds = [],
}: FriendSelectorProps) => {
	const dispatch = useAppDispatch();
	const { friendships } = useAppSelector(state => state.friends);
	const { profile } = useAppSelector(state => state.auth);
	const [isOpen, setIsOpen] = useState(false);

	// Fetch friendships if not already loaded
	useEffect(() => {
		if (profile && friendships.length === 0) {
			dispatch(fetchFriendships());
		}
	}, [dispatch, profile, friendships.length]);

	// Get accepted friends (not self)
	const friends =
		profile && friendships
			? friendships
					.filter(
						f =>
							f.status === "accepted" &&
							(f.user_id === profile.id || f.friend_id === profile.id),
					)
					.map(f => {
						if (f.user_id === profile.id) {
							return f.friend;
						} else {
							return f.user;
						}
					})
					.filter(
						(f): f is Profile =>
							f !== null &&
							f !== undefined &&
							f.id !== profile.id &&
							!excludeIds?.includes(f.id), // Add excludeIds check
					)
			: [];

	const toggleFriend = (friendId: string) => {
		if (selectedFriends.includes(friendId)) {
			onSelectionChange(selectedFriends.filter(id => id !== friendId));
		} else {
			onSelectionChange([...selectedFriends, friendId]);
		}
	};

	const removeFriend = (friendId: string) => {
		onSelectionChange(selectedFriends.filter(id => id !== friendId));
	};

	const selectedFriendProfiles = friends.filter(f =>
		selectedFriends.includes(f.id),
	);

	return (
		<div className='relative'>
			<label className='block text-sm font-medium mb-1 text-primary'>
				Invite Friends (optional)
			</label>

			{/* Selected Friends Display */}
			{selectedFriendProfiles.length > 0 && (
				<div className='flex flex-wrap gap-2 mb-2'>
					{selectedFriendProfiles.map(friend => (
						<div
							key={friend.id}
							className='flex items-center gap-2 px-3 py-1 bg-accent rounded-full text-sm'>
							{friend.avatar_url ? (
								<img
									src={friend.avatar_url}
									alt={friend.name || "User"}
									className='w-5 h-5 rounded-full object-cover'
								/>
							) : (
								<div className='w-5 h-5 rounded-full bg-tertiary flex items-center justify-center'>
									<FaUser className='w-3 h-3' />
								</div>
							)}
							<span className='text-primary'>{friend.name || "Unknown"}</span>
							<button
								type='button'
								onClick={() => removeFriend(friend.id)}
								className='text-primary hover:text-red-500 transition'>
								<FaTimes className='w-3 h-3' />
							</button>
						</div>
					))}
				</div>
			)}

			{/* Friend Selector Dropdown */}
			<div className='relative'>
				<button
					type='button'
					onClick={() => setIsOpen(!isOpen)}
					className='w-full px-4 py-2 bg-secondary border border-border rounded-md text-primary focus:outline-none focus:ring-2 focus:ring-accent text-left flex items-center justify-between'>
					<span>
						{selectedFriends.length > 0
							? `${selectedFriends.length} friend${
									selectedFriends.length > 1 ? "s" : ""
							  } selected`
							: "Select friends to invite"}
					</span>
					<span className='text-tertiary'>{isOpen ? "▲" : "▼"}</span>
				</button>

				{isOpen && (
					<div className='absolute z-10 w-full mt-1 bg-secondary border border-border rounded-md shadow-lg max-h-60 overflow-y-auto'>
						{friends.length === 0 ? (
							<div className='p-4 text-center text-tertiary text-sm'>
								No friends available to invite.
							</div>
						) : (
							<ul className='py-1'>
								{friends.map(friend => {
									const isSelected = selectedFriends.includes(friend.id);
									return (
										<li key={friend.id}>
											<button
												type='button'
												onClick={() => toggleFriend(friend.id)}
												className={`w-full flex items-center gap-3 px-4 py-2 hover:bg-tertiary transition ${
													isSelected ? "bg-accent/50" : ""
												}`}>
												{friend.avatar_url ? (
													<img
														src={friend.avatar_url}
														alt={friend.name || "User"}
														className='w-8 h-8 rounded-full object-cover'
													/>
												) : (
													<div className='w-8 h-8 rounded-full bg-tertiary flex items-center justify-center'>
														<FaUser className='w-4 h-4' />
													</div>
												)}
												<div className='flex-1 text-left'>
													<p className='font-medium text-primary'>
														{friend.name || "Unknown User"}
													</p>
													{friend.location && (
														<p className='text-xs text-tertiary'>
															{friend.location}
														</p>
													)}
												</div>
												{isSelected && <span className='text-accent'>✓</span>}
											</button>
										</li>
									);
								})}
							</ul>
						)}
					</div>
				)}
			</div>

			{/* Close dropdown when clicking outside */}
			{isOpen && (
				<div className='fixed inset-0 z-0' onClick={() => setIsOpen(false)} />
			)}
		</div>
	);
};
