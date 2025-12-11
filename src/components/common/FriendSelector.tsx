import { useState, useEffect, useMemo, useRef } from "react";
import { useAppSelector, useAppDispatch } from "../../store/hooks";
import { fetchFriendships } from "../../store/slices/friendsSlice";
import {
	selectAllFriendships,
	selectFriendshipsByUserPair,
} from "../../store/selectors/friendsSelectors";
import {
	FaUser,
	FaSearch,
	FaTimes,
	FaPlus,
	FaChevronDown,
} from "react-icons/fa";
import { RoleSelector } from "../events/RoleSelector";
import { Input } from "./Input";
import { Button } from "./Button";
import type { Profile, EventRole } from "../../types";
import { motion, AnimatePresence } from "motion/react";

export interface SelectedFriend {
	friendId: string;
	role: EventRole;
}

interface FriendSelectorProps {
	selectedFriends: SelectedFriend[];
	onSelectionChange: (friends: SelectedFriend[]) => void;
	excludeIds?: string[];
	maxVisibleFriends?: number;
	label?: string;
	helperText?: string;
	className?: string;
	/**
	 * Optional callback fired immediately when a friend is added.
	 * Useful for immediate dispatch scenarios (e.g., EventDetailsPage).
	 * Called with the friendId and role before onSelectionChange.
	 */
	onFriendAdded?: (friendId: string, role: EventRole) => void;
	/**
	 * Hide the selected friends chips section.
	 * Useful when selected friends are displayed elsewhere (e.g., ParticipantsSection).
	 */
	hideSelectedChips?: boolean;
	/**
	 * Single-select mode. When true, the dropdown auto-closes after a friend is added.
	 * Useful for single-select scenarios (e.g., MessagesPage).
	 */
	singleSelect?: boolean;
}

export const FriendSelector = ({
	selectedFriends,
	onSelectionChange,
	excludeIds = [],
	maxVisibleFriends = 4,
	label = "",
	helperText,
	className = "",
	onFriendAdded,
	hideSelectedChips = false,
	singleSelect = false,
}: FriendSelectorProps) => {
	const dispatch = useAppDispatch();
	const friendships = useAppSelector(selectAllFriendships);
	const friendshipsByUserPair = useAppSelector(selectFriendshipsByUserPair);
	const friendshipIds = useAppSelector(state => state.friends.friendshipIds);
	const { profile } = useAppSelector(state => state.auth);
	const [searchQuery, setSearchQuery] = useState("");
	const [isOpen, setIsOpen] = useState(false);
	const dropdownRef = useRef<HTMLDivElement>(null);

	// Fetch friendships if not already loaded
	useEffect(() => {
		if (profile && friendshipIds.length === 0) {
			dispatch(fetchFriendships());
		}
	}, [dispatch, profile, friendshipIds.length]);

	// Get available friends (accepted, not self, not excluded, not already selected)
	const availableFriends = useMemo(() => {
		if (!profile || !friendships) return [];

		const selectedIds = new Set(selectedFriends.map(f => f.friendId));

		return friendships
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
					f !== undefined &&
					f !== null &&
					f.id !== profile.id &&
					f.active !== false &&
					!excludeIds.includes(f.id) &&
					!selectedIds.has(f.id),
			);
	}, [profile, friendships, selectedFriends, excludeIds]);

	// Filter friends by search query
	// When searching, show all matches (no limit). When not searching, limit to maxVisibleFriends
	const filteredFriends = useMemo(() => {
		if (!searchQuery.trim()) {
			return availableFriends.slice(0, maxVisibleFriends);
		}

		const query = searchQuery.toLowerCase().trim();
		return availableFriends.filter(
			friend =>
				friend.name?.toLowerCase().includes(query) ||
				friend.location?.address?.toLowerCase().includes(query) ||
				friend.email?.toLowerCase().includes(query),
		);
	}, [availableFriends, searchQuery, maxVisibleFriends]);

	// Close dropdown when clicking outside
	useEffect(() => {
		const handleClickOutside = (event: MouseEvent) => {
			if (
				dropdownRef.current &&
				!dropdownRef.current.contains(event.target as Node)
			) {
				setIsOpen(false);
			}
		};

		if (isOpen) {
			document.addEventListener("mousedown", handleClickOutside);
		}

		return () => {
			document.removeEventListener("mousedown", handleClickOutside);
		};
	}, [isOpen]);

	useEffect(() => {
		// Auto-close dropdown when all available friends are selected
		// Only close if dropdown is open, no search query, and no filtered friends
		if (isOpen && !searchQuery.trim() && availableFriends.length === 0) {
			setIsOpen(false);
		}
	}, [isOpen, searchQuery, availableFriends.length]);

	// Get selected friend profiles
	const selectedFriendProfiles = useMemo(() => {
		if (!profile || !friendships) return [];

		return selectedFriends
			.map(selected => {
				// O(1) lookup using user pair map
				const key = [profile.id, selected.friendId].sort().join("-");
				const friendship = friendshipsByUserPair[key];

				// Only include accepted friendships
				if (!friendship || friendship.status !== "accepted") return null;

				const friendProfile =
					friendship.user_id === profile.id ?
						friendship.friend
					:	friendship.user;

				if (!friendProfile || friendProfile.id === profile.id) return null;

				return {
					profile: friendProfile,
					role: selected.role,
				};
			})
			.filter((f): f is { profile: Profile; role: EventRole } => f !== null);
	}, [profile, friendships, selectedFriends]);

	const handleAddFriend = (friendId: string) => {
		// Always default to "guest" role - can be changed after adding
		const role = "guest" as EventRole;
		// Fire immediate callback if provided (useful for immediate dispatch)
		if (onFriendAdded) {
			onFriendAdded(friendId, role);
		}
		onSelectionChange([...selectedFriends, { friendId, role }]);
		// Clear search after adding
		setSearchQuery("");
		// Auto-close dropdown if single-select mode
		if (singleSelect) {
			setIsOpen(false);
		}
	};

	const handleInputClick = () => {
		setIsOpen(true);
	};

	const handleInputFocus = () => {
		setIsOpen(true);
	};

	const handleRemoveFriend = (friendId: string) => {
		onSelectionChange(selectedFriends.filter(f => f.friendId !== friendId));
	};

	const handleRoleChange = (friendId: string, role: EventRole) => {
		onSelectionChange(
			selectedFriends.map(f => (f.friendId === friendId ? { ...f, role } : f)),
		);
	};

	return (
		<div className={`w-full ${className}`}>
			{/* Label */}
			{label && (
				<label className='block text-sm font-medium text-primary'>
					{label}
				</label>
			)}

			{/* Helper Text */}
			{helperText && (
				<p className='text-xs text-secondary mb-1'>{helperText}</p>
			)}

			{/* Combo Box Dropdown */}
			<div className='relative' ref={dropdownRef}>
				{/* Search Input (Trigger) */}
				<div className='relative'>
					<FaSearch
						className='absolute left-3 top-1/2 -translate-y-1/2 text-tertiary w-4 h-4 pointer-events-none z-10'
						aria-hidden='true'
					/>
					<Input
						type='text'
						placeholder='Search friends'
						value={searchQuery}
						onChange={e => setSearchQuery(e.target.value)}
						onClick={handleInputClick}
						onFocus={handleInputFocus}
						className='pl-10 pr-10 cursor-text'
						autoComplete='off'
						readOnly={false}
						aria-label='Search friends to add'
						aria-expanded={isOpen}
						aria-haspopup='listbox'
						aria-controls='friend-selector-listbox'
						role='combobox'
					/>
					<FaChevronDown
						className={`absolute right-3 top-1/2 -translate-y-1/2 text-tertiary w-4 h-4 pointer-events-none transition-transform ${
							isOpen ? "rotate-180" : ""
						}`}
						aria-hidden='true'
					/>
				</div>

				{/* Dropdown Menu */}
				<AnimatePresence>
					{isOpen && (
						<>
							{/* Backdrop */}
							<motion.div
								className='fixed inset-0 z-40'
								initial={{ opacity: 0 }}
								animate={{ opacity: 1 }}
								exit={{ opacity: 0 }}
								onClick={() => setIsOpen(false)}
							/>

							{/* Dropdown Content */}
							<motion.div
								id='friend-selector-listbox'
								className='absolute top-full left-0 right-0 mt-1 bg-secondary border border-border rounded-lg shadow-lg z-50 overflow-visible'
								initial={{ opacity: 0, y: -10, scale: 0.95 }}
								animate={{ opacity: 1, y: 0, scale: 1 }}
								exit={{ opacity: 0, y: -10, scale: 0.95 }}
								transition={{ duration: 0.15 }}
								role='listbox'
								aria-label='Available friends'>
								{availableFriends.length === 0 ?
									<div className='p-6 text-center border border-border rounded-lg'>
										<p className='text-tertiary text-sm'>
											No friends available to invite.
										</p>
									</div>
								: filteredFriends.length === 0 ?
									<div className='p-4 text-center text-tertiary text-sm'>
										{searchQuery.trim() ?
											`No friends found matching "${searchQuery}"`
										:	"No friends available to invite"}
									</div>
								:	<>
										<div className='max-h-[320px] overflow-y-auto overflow-x-visible'>
											<ul className='[&>*:not(:first-child)]:border-t [&>*:not(:first-child)]:border-border'>
												{filteredFriends.map(friend => (
													<li
														key={friend.id}
														className='p-3 hover:bg-tertiary hover:shadow-sm rounded-md transition-all duration-200'
														role='option'
														aria-label={`Add ${friend.name || "Unknown User"}${friend.location ? ` from ${friend.location.address}` : ""}`}>
														<div className='flex items-center justify-between gap-3'>
															{/* Friend Info */}
															<div className='flex items-center gap-3 flex-1 min-w-0'>
																{friend.avatar_url ?
																	<img
																		src={friend.avatar_url}
																		alt={`${friend.name || "User"} avatar`}
																		className='w-10 h-10 rounded-full object-cover shrink-0'
																	/>
																:	<div className='w-10 h-10 rounded-full bg-tertiary flex items-center justify-center shrink-0'>
																		<FaUser
																			className='w-5 h-5'
																			aria-hidden='true'
																		/>
																	</div>
																}
																<div className='min-w-0 flex-1'>
																	<p className='font-medium text-primary truncate'>
																		{friend.name || "Unknown User"}
																	</p>
																	{friend.location && (
																		<p className='text-xs text-secondary truncate'>
																			{friend.location.address}
																		</p>
																	)}
																</div>
															</div>

															{/* Add Button */}
															<Button
																type='button'
																variant='primary'
																onClick={() => handleAddFriend(friend.id)}
																className='flex items-center gap-1.5 h-8 px-3 text-sm shrink-0'
																aria-label={`Add ${friend.name || "friend"}`}>
																<FaPlus
																	className='w-3 h-3'
																	aria-hidden='true'
																/>
																Add
															</Button>
														</div>
													</li>
												))}
											</ul>
										</div>

										{/* Show hint if there are more friends (only when not searching) */}
										{availableFriends.length > maxVisibleFriends &&
											!searchQuery.trim() &&
											filteredFriends.length >= maxVisibleFriends && (
												<div className='p-3 text-center text-xs text-secondary border-t border-border bg-tertiary/30'>
													Showing {maxVisibleFriends} of{" "}
													{availableFriends.length} friends. Use search to find
													more.
												</div>
											)}
									</>
								}
							</motion.div>
						</>
					)}
				</AnimatePresence>
			</div>

			{/* Selected Friends Chips */}
			{!hideSelectedChips && selectedFriendProfiles.length > 0 && (
				<div className='mt-4'>
					<p className='text-xs text-secondary mb-2'>
						{selectedFriendProfiles.length} friend
						{selectedFriendProfiles.length > 1 ? "s" : ""} selected
					</p>
					<div className='flex flex-wrap gap-2'>
						<AnimatePresence>
							{selectedFriendProfiles.map(({ profile: friend, role }) => (
								<motion.div
									key={friend.id}
									initial={{ opacity: 0, scale: 0.9 }}
									animate={{ opacity: 1, scale: 1 }}
									exit={{ opacity: 0, scale: 0.9 }}
									className='flex items-center gap-2 px-3 py-2 bg-tertiary border border-border rounded-lg text-sm min-w-[280px] max-w-[280px]'>
									{friend.avatar_url ?
										<img
											src={friend.avatar_url}
											alt={friend.name || "User"}
											className='w-6 h-6 rounded-full object-cover shrink-0'
										/>
									:	<div className='w-6 h-6 rounded-full bg-tertiary flex items-center justify-center shrink-0'>
											<FaUser className='w-3 h-3' />
										</div>
									}
									<span
										className='text-primary font-medium truncate min-w-0 flex-1'
										title={friend.name || "Unknown"}>
										{friend.name || "Unknown"}
									</span>
									<div className='w-px h-4 bg-border shrink-0' />
									<RoleSelector
										value={role}
										onChange={newRole => handleRoleChange(friend.id, newRole)}
										className='shrink-0'
									/>
									<button
										type='button'
										onClick={() => handleRemoveFriend(friend.id)}
										className='text-secondary hover:text-red-500 hover:bg-red-500/10 rounded-full p-1 transition-all duration-200 shrink-0 hover:cursor-pointer flex items-center justify-center'
										aria-label={`Remove ${friend.name || "friend"}`}>
										<FaTimes className='w-3 h-3' aria-hidden='true' />
									</button>
								</motion.div>
							))}
						</AnimatePresence>
					</div>
				</div>
			)}
		</div>
	);
};
