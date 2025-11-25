import { useState, useEffect } from "react";
import { useAppSelector, useAppDispatch } from "../../store/hooks";
import { motion, AnimatePresence } from "framer-motion";
import { FaUser } from "react-icons/fa";
import type { Profile } from "../../types";
import { fetchFriendships } from "../../store/slices/friendsSlice";
import { RoleSelector } from "../events/RoleSelector";
import type { EventRole } from "../../types";

interface FriendSelectorModalProps {
	isOpen: boolean;
	onClose: () => void;
	onSelectFriend: (
		friendId: string,
		role: "guest" | "contributor" | "co_host",
	) => void;
	excludeIds?: string[];
	enableRoleSelection?: boolean;
	initialRole?: "guest" | "contributor" | "co_host";
}

export const FriendSelectorModal = ({
	isOpen,
	onClose,
	onSelectFriend,
	excludeIds = [],
	enableRoleSelection = false,
	initialRole = "guest",
}: FriendSelectorModalProps) => {
	const dispatch = useAppDispatch();
	const { friendships } = useAppSelector(state => state.friends);
	const { profile } = useAppSelector(state => state.auth);
	const [selectedRoles, setSelectedRoles] = useState<Record<string, EventRole>>(
		{},
	);

	useEffect(() => {
		if (isOpen && enableRoleSelection) {
			// Initialize all friends with the initial role
			const initialRoles: Record<string, EventRole> = {};
			// We'll populate this after friends are loaded
			setSelectedRoles(initialRoles);
		} else if (!isOpen) {
			setSelectedRoles({});
		}
	}, [isOpen, enableRoleSelection, initialRole]);

	// Allow esc key to close the modal
	useEffect(() => {
		if (!isOpen) return;

		const handleKeyDown = (e: KeyboardEvent) => {
			if (e.key === "Escape" || e.key === "Esc") {
				onClose();
			}
		};
		window.addEventListener("keydown", handleKeyDown);
		return () => window.removeEventListener("keydown", handleKeyDown);
	}, [isOpen, onClose]);

	useEffect(() => {
		if (profile && friendships.length === 0) {
			dispatch(fetchFriendships());
		}
	}, [dispatch, profile, friendships.length]);
	// Only accepted friends, not self, and not in excludeIds
	const friends =
		profile && friendships
			? friendships
					.filter(
						f =>
							f.status === "accepted" &&
							(f.user_id === profile.id || f.friend_id === profile.id),
					)
					.map(f => {
						// If current user is the requester (user_id), the friend is friend_id
						// If current user is the friend (friend_id), the other person is user_id
						if (f.user_id === profile.id) {
							return f.friend; // The other person's profile
						} else {
							return f.user; // The other person's profile
						}
					})
					.filter(
						(f): f is Profile =>
							f !== undefined &&
							f.id !== profile.id &&
							!excludeIds.includes(f.id),
					)
			: [];

	return (
		<AnimatePresence>
			{isOpen && (
				<>
					{/* Backdrop Overlay */}
					<motion.div
						className='fixed inset-0 bg-black/40 z-40'
						initial={{ opacity: 0 }}
						animate={{ opacity: 1 }}
						exit={{ opacity: 0 }}
						onClick={onClose}>
						<motion.div
							className='fixed inset-0 z-50 flex items-center justify-center px-4 pointer-events-none'
							initial={{ opacity: 0, y: 40, scale: 0.96 }}
							animate={{ opacity: 1, y: 0, scale: 1 }}
							exit={{ opacity: 0, y: 40, scale: 0.96 }}
							transition={{ duration: 0.18 }}
							onClick={e => e.stopPropagation()}>
							<div
								className='bg-secondary rounded-lg shadow-xl w-full max-w-md p-6 relative z-50 pointer-events-auto'
								onClick={e => e.stopPropagation()}>
								<div className='flex justify-between items-center mb-4'>
									<h2 className='text-lg font-semibold'>Select a Friend</h2>
									<button
										onClick={onClose}
										className='p-2 rounded-full hover:bg-border focus:outline-none transition'
										aria-label='Close'
										type='button'>
										<span className='text-lg'>&times;</span>
									</button>
								</div>
								<div className='max-h-80 overflow-y-auto'>
									{friends.length === 0 ? (
										<div className='text-center text-tertiary py-10'>
											<p>No friends available to message.</p>
										</div>
									) : (
										<ul>
											{friends.map(friend => (
												<li key={friend.id}>
													<div className='flex flex-col gap-2'>
														<button
															className='flex items-center w-full gap-3 p-3 rounded-md hover:bg-tertiary transition mb-1'
															onClick={() => {
																const role = enableRoleSelection
																	? selectedRoles[friend.id] || initialRole
																	: "guest";
																onSelectFriend(
																	friend.id,
																	role as "guest" | "contributor" | "co_host",
																);
																onClose();
															}}>
															{friend.avatar_url ? (
																<img
																	src={friend.avatar_url}
																	alt={friend.name || "User"}
																	className='w-10 h-10 rounded-full object-cover'
																/>
															) : (
																<div className='w-10 h-10 rounded-full bg-tertiary flex items-center justify-center'>
																	<FaUser className='w-5 h-5' />
																</div>
															)}
															<div className='min-w-0 text-left'>
																<p className='font-medium truncate text-primary'>
																	{friend.name || "Unknown User"}
																</p>
																{friend.location && (
																	<p className='text-xs text-secondary truncate'>
																		{friend.location}
																	</p>
																)}
															</div>
														</button>
													</div>
													{enableRoleSelection && (
														<div className='ml-13 px-3'>
															<RoleSelector
																value={selectedRoles[friend.id] || initialRole}
																onChange={role => {
																	setSelectedRoles(prev => ({
																		...prev,
																		[friend.id]: role,
																	}));
																}}
															/>
														</div>
													)}
												</li>
											))}
										</ul>
									)}
								</div>
							</div>
						</motion.div>
					</motion.div>
				</>
			)}
		</AnimatePresence>
	);
};
