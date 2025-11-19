import { useEffect } from "react";
import { useAppDispatch, useAppSelector } from "../store/hooks";
import {
	fetchFriendships,
	acceptFriendRequest,
	removeFriend,
} from "../store/slices/friendsSlice";
import { Button } from "../components/common/Button";
import { LoadingSpinner } from "../components/common/LoadingSpinner";
import { FaUser, FaCheck, FaTimes } from "react-icons/fa";

export const FriendsPage = () => {
	const dispatch = useAppDispatch();
	const { friendships, loading } = useAppSelector(state => state.friends);
	const { profile } = useAppSelector(state => state.auth);

	useEffect(() => {
		dispatch(fetchFriendships());
	}, [dispatch]);

	const handleAccept = (friendshipId: string) => {
		dispatch(acceptFriendRequest(friendshipId));
	};

	const handleRemove = (friendshipId: string) => {
		dispatch(removeFriend(friendshipId));
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

			{/* Pending Requests */}
			{pendingRequests.length > 0 && (
				<div className='mb-8'>
					<h2 className='text-xl font-semibold mb-4 text-text-primary'>
						Friend Requests
					</h2>
					<div className='space-y-3'>
						{pendingRequests.map(friendship => (
							<div
								key={friendship.id}
								className='flex items-center justify-between p-4 bg-secondary border border-border rounded-lg'>
								<div className='flex items-center gap-3'>
									{/* For pending requests where friend_id === profile.id, the requester is user_id */}
									{friendship.user?.avatar_url ? (
										<img
											src={friendship.user.avatar_url}
											alt={friendship.user.name || "User"}
											className='w-10 h-10 rounded-full object-cover'
										/>
									) : (
										<div className='w-10 h-10 rounded-full bg-tertiary flex items-center justify-center'>
											<FaUser className='w-5 h-5 text-text-primary' />
										</div>
									)}
									<div>
										<p className='font-medium text-text-primary'>
											{friendship.user?.name || "Unknown User"}
										</p>
										<p className='text-sm text-text-secondary'>
											Wants to be friends
										</p>
									</div>
								</div>
								<div className='flex gap-2'>
									<Button
										variant='primary'
										onClick={() => handleAccept(friendship.id)}>
										<FaCheck className='w-4 h-4' />
									</Button>
									<Button
										variant='secondary'
										onClick={() => handleRemove(friendship.id)}>
										<FaTimes className='w-4 h-4' />
									</Button>
								</div>
							</div>
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
								<div
									key={friendship.id}
									className='flex items-center justify-between p-4 bg-secondary border border-border rounded-lg'>
									<div className='flex items-center gap-3'>
										{friend?.avatar_url ? (
											<img
												src={friend.avatar_url}
												alt={friend.name || "User"}
												className='w-10 h-10 rounded-full object-cover'
											/>
										) : (
											<div className='w-10 h-10 rounded-full bg-tertiary flex items-center justify-center'>
												<FaUser className='w-5 h-5 text-text-primary' />
											</div>
										)}
										<div>
											<p className='font-medium text-text-primary'>
												{friend?.name || "Unknown User"}
											</p>
											{friend?.location && (
												<p className='text-sm text-text-secondary'>
													{friend.location}
												</p>
											)}
										</div>
									</div>
									<Button
										variant='secondary'
										onClick={() => handleRemove(friendship.id)}>
										Remove
									</Button>
								</div>
							);
						})}
					</div>
				)}
			</div>
		</div>
	);
};
