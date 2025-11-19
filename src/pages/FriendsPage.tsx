import { useEffect, useState } from "react";
import { useAppDispatch, useAppSelector } from "../store/hooks";
import {
	fetchFriendships,
	acceptFriendRequest,
	removeFriend,
	sendFriendRequest,
	cancelFriendRequest,
} from "../store/slices/friendsSlice";
import { searchUsers } from "../store/slices/usersSlice";
import { Button } from "../components/common/Button";
import { Input } from "../components/common/Input";
import { LoadingSpinner } from "../components/common/LoadingSpinner";
import { ConfirmModal } from "../components/common/ConfirmModal";
import { FaCheck, FaTimes, FaSearch, FaUserPlus } from "react-icons/fa";
import { useDebounce } from "../hooks/useDebounce";
import { FriendCard } from "../components/friends/FriendCard";

export const FriendsPage = () => {
	const dispatch = useAppDispatch();
	const { friendships, loading, sendingRequest } = useAppSelector(
		state => state.friends,
	);
	const { searchResults, searchLoading } = useAppSelector(state => state.users);
	const { profile } = useAppSelector(state => state.auth);
	const [searchQuery, setSearchQuery] = useState("");
	const [showRemoveConfirm, setShowRemoveConfirm] = useState(false);
	const [friendshipToRemove, setFriendshipToRemove] = useState<{
		id: string;
		friendName: string;
		isDecliningRequest?: boolean;
	} | null>(null);

	const debouncedSearchQuery = useDebounce(searchQuery, 300);

	useEffect(() => {
		dispatch(fetchFriendships());
	}, [dispatch]);

	useEffect(() => {
		if (debouncedSearchQuery.trim()) {
			dispatch(searchUsers(debouncedSearchQuery));
		} else {
			dispatch({ type: "friends/searchUsers/fulfilled", payload: [] });
		}
	}, [debouncedSearchQuery, dispatch]);

	const handleAccept = (friendshipId: string) => {
		dispatch(acceptFriendRequest(friendshipId));
	};

	const handleRemove = (
		friendshipId: string,
		friendName: string,
		isDecliningRequest = false,
	) => {
		setFriendshipToRemove({
			id: friendshipId,
			friendName,
			isDecliningRequest,
		});
		setShowRemoveConfirm(true);
	};

	const handleConfirmRemove = () => {
		if (friendshipToRemove) {
			dispatch(removeFriend(friendshipToRemove.id));
			setFriendshipToRemove(null);
		}
	};

	const handleCancel = (friendshipId: string) => {
		dispatch(cancelFriendRequest(friendshipId));
	};

	const handleSendRequest = (userId: string) => {
		dispatch(sendFriendRequest(userId));
		setSearchQuery("");
	};

	const getRelationshipStatus = (
		userId: string,
	): "none" | "pending" | "accepted" | "sent" => {
		const friendship = friendships.find(
			f =>
				(f.user_id === profile?.id && f.friend_id === userId) ||
				(f.user_id === userId && f.friend_id === profile?.id),
		);

		if (!friendship) return "none";
		if (friendship.status === "accepted") return "accepted";
		if (friendship.status === "pending" && friendship.user_id === profile?.id)
			return "sent";
		return "pending";
	};

	if (loading && friendships.length === 0) {
		return <LoadingSpinner fullScreen />;
	}

	const acceptedFriends = friendships.filter(f => f.status === "accepted");
	const pendingRequests = friendships.filter(
		f => f.status === "pending" && f.friend_id === profile?.id,
	);
	const sentRequests = friendships.filter(
		f => f.status === "pending" && f.user_id === profile?.id,
	);

	return (
		<div className='max-w-4xl mx-auto p-8'>
			<h1 className='text-3xl font-bold mb-8 text-text-primary'>Friends</h1>

			{/* Search Section */}
			<div className='mb-8'>
				<div className='relative'>
					<Input
						type='text'
						placeholder='Search for users by name or email...'
						value={searchQuery}
						onChange={e => setSearchQuery(e.target.value)}
						className='pl-10'
					/>
					<FaSearch className='absolute left-3 top-1/2 transform -translate-y-1/2 text-text-secondary w-4 h-4' />
				</div>

				{/* Search Results */}
				{searchQuery.trim() && (
					<div className='mt-4'>
						{searchLoading ? (
							<div className='text-center py-4 text-text-secondary'>
								Searching...
							</div>
						) : searchResults.length === 0 ? (
							<div className='text-center py-4 text-text-secondary'>
								No users found
							</div>
						) : (
							<div className='space-y-3'>
								{searchResults.map(user => {
									const status = getRelationshipStatus(user.id);
									return (
										<FriendCard
											key={user.id}
											profile={user}
											actions={
												<>
													{status === "none" && (
														<Button
															className='flex items-center'
															variant='primary'
															onClick={() => handleSendRequest(user.id)}
															loading={sendingRequest}
															disabled={sendingRequest}>
															<FaUserPlus className='w-4 h-4 mr-2' />
															Send Request
														</Button>
													)}
													{status === "sent" && (
														<span className='text-sm text-text-secondary'>
															Request Sent
														</span>
													)}
													{status === "pending" && (
														<span className='text-sm text-text-secondary'>
															Pending Request
														</span>
													)}
													{status === "accepted" && (
														<span className='text-sm text-text-secondary'>
															Already Friends
														</span>
													)}
												</>
											}
										/>
									);
								})}
							</div>
						)}
					</div>
				)}
			</div>

			{/* Pending Requests */}
			{pendingRequests.length > 0 && (
				<div className='mb-8'>
					<h2 className='text-xl font-semibold mb-4 text-text-primary'>
						Friend Requests
					</h2>
					<div className='space-y-3'>
						{pendingRequests.map(friendship => (
							<FriendCard
								key={friendship.id}
								profile={friendship.user}
								subtitle='Wants to be friends'
								actions={
									<div className='flex gap-2'>
										<Button
											variant='primary'
											onClick={() => handleAccept(friendship.id)}>
											<FaCheck className='w-4 h-4' />
										</Button>
										<Button
											variant='secondary'
											onClick={() =>
												handleRemove(
													friendship.id,
													friendship.user?.name || "Unknown User",
													true,
												)
											}>
											<FaTimes className='w-4 h-4' />
										</Button>
									</div>
								}
							/>
						))}
					</div>
				</div>
			)}

			{/* Sent Requests */}
			{sentRequests.length > 0 && (
				<div className='mb-8'>
					<h2 className='text-xl font-semibold mb-4 text-text-primary'>
						Sent Requests
					</h2>
					<div className='space-y-3'>
						{sentRequests.map(friendship => (
							<FriendCard
								key={friendship.id}
								profile={friendship.friend}
								subtitle='Waiting for response'
								actions={
									<Button
										className='flex items-center gap-2'
										variant='secondary'
										onClick={() => handleCancel(friendship.id)}>
										<FaTimes className='w-4 h-4 mt-0.5' />
										Cancel Request
									</Button>
								}
							/>
						))}
					</div>
				</div>
			)}

			{/* Friends List */}
			<div>
				<h2 className='text-xl font-semibold mb-4 text-text-primary'>
					Your Friends ({acceptedFriends.length})
				</h2>
				{acceptedFriends.length === 0 ? (
					<p className='text-text-secondary'>No friends yet.</p>
				) : (
					<div className='space-y-3'>
						{acceptedFriends.map(friendship => {
							// If current user is the requester (user_id), the friend is friend_id
							// If current user is the friend (friend_id), the other person is user_id
							const friend =
								friendship.user_id === profile?.id
									? friendship.friend
									: friendship.user;
							return (
								<FriendCard
									key={friendship.id}
									profile={friend}
									actions={
										<Button
											variant='secondary'
											onClick={() =>
												handleRemove(
													friendship.id,
													friend?.name || "Unknown User",
												)
											}>
											Remove
										</Button>
									}
								/>
							);
						})}
					</div>
				)}
			</div>

			{/* Remove Friend / Decline Request Confirmation Modal */}
			<ConfirmModal
				isOpen={showRemoveConfirm}
				onClose={() => {
					setShowRemoveConfirm(false);
					setFriendshipToRemove(null);
				}}
				onConfirm={handleConfirmRemove}
				title={
					friendshipToRemove?.isDecliningRequest
						? "Decline Friend Request"
						: "Remove Friend"
				}
				message={
					friendshipToRemove?.isDecliningRequest
						? `Are you sure you want to decline the friend request from ${
								friendshipToRemove?.friendName || "this user"
						  }?`
						: `Are you sure you want to remove ${
								friendshipToRemove?.friendName || "this friend"
						  } from your friends list?`
				}
				confirmText={
					friendshipToRemove?.isDecliningRequest ? "Decline" : "Remove"
				}
				cancelText='Cancel'
				confirmVariant='primary'
			/>
		</div>
	);
};
