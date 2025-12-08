import { useEffect, useState, useRef } from "react";
import { useAppDispatch, useAppSelector } from "../store/hooks";
import { fetchFriendships } from "../store/slices/friendsSlice";
import {
	selectAcceptedFriendships,
	selectPendingReceivedRequests,
	selectPendingSentRequests,
} from "../store/selectors/friendsSelectors";
import { searchUsers } from "../store/slices/usersSlice";
import { Input } from "../components/common/Input";
import { FaSearch, FaUsers } from "react-icons/fa";
import { useDebounce } from "../hooks/useDebounce";
import { FriendCard } from "../components/friends/FriendCard";
import { EmptyState } from "../components/common/EmptyState";
import { Skeleton, SkeletonFriendCard } from "../components/common/Skeleton";

export const FriendsPage = () => {
	const dispatch = useAppDispatch();
	const searchInputRef = useRef<HTMLInputElement>(null);

	const { loading } = useAppSelector(state => state.friends);
	const { searchResults, searchLoading } = useAppSelector(state => state.users);
	const { profile } = useAppSelector(state => state.auth);
	const [searchQuery, setSearchQuery] = useState("");

	const debouncedSearchQuery = useDebounce(searchQuery, 300);

	useEffect(() => {
		dispatch(fetchFriendships());
	}, [dispatch]);

	useEffect(() => {
		if (debouncedSearchQuery.trim()) {
			dispatch(searchUsers(debouncedSearchQuery));
		} else {
			// Clear search results by dispatching searchUsers with empty string
			// The thunk will return empty array for empty queries
			dispatch(searchUsers(""));
		}
	}, [debouncedSearchQuery, dispatch]);

	const friendshipIds = useAppSelector(state => state.friends.friendshipIds);
	const acceptedFriends = useAppSelector(selectAcceptedFriendships);
	const pendingRequests = useAppSelector(state =>
		selectPendingReceivedRequests(state, profile?.id),
	);
	const sentRequests = useAppSelector(state =>
		selectPendingSentRequests(state, profile?.id),
	);

	// Early return after all hooks
	if (loading && friendshipIds.length === 0) {
		return (
			<div className='max-w-4xl mx-auto p-8'>
				<Skeleton variant='text' width='20%' height={32} className='mb-8' />

				{/* Search section skeleton */}
				<div className='mb-8'>
					<Skeleton
						variant='rectangular'
						width='100%'
						height={40}
						className='rounded-md'
					/>
				</div>

				{/* Friends list skeleton */}
				<div className='space-y-3'>
					{Array.from({ length: 5 }).map((_, i) => (
						<SkeletonFriendCard key={i} />
					))}
				</div>
			</div>
		);
	}

	return (
		<div className='max-w-4xl mx-auto p-4 md:p-8'>
			<h1 className='text-3xl font-bold mb-4 md:mb-8 text-primary'>Friends</h1>

			{/* Search Section */}
			<div className='mb-4 md:mb-8'>
				<div className='relative'>
					<Input
						type='text'
						placeholder='Search for users by name or email...'
						value={searchQuery}
						onChange={e => setSearchQuery(e.target.value)}
						className='pl-10'
						ref={searchInputRef}
					/>
					<FaSearch className='absolute left-3 top-1/2 transform -translate-y-1/2 text-secondary w-4 h-4' />
				</div>

				{/* Search Results */}
				{searchQuery.trim() && (
					<div className='mt-4'>
						{searchLoading ?
							<div className='text-center py-4 text-secondary'>
								{Array.from({ length: 3 }).map((_, i) => (
									<SkeletonFriendCard key={i} />
								))}
							</div>
						: searchResults.length === 0 ?
							<div className='text-center py-4 text-secondary'>
								No users found
							</div>
						:	<div className='space-y-3'>
								{searchResults.map(user => (
									<FriendCard
										key={user.id}
										userId={user.id}
										profile={user}
										forceVertical={false}
									/>
								))}
							</div>
						}
					</div>
				)}
			</div>

			{/* Pending Requests */}
			{pendingRequests.length > 0 && (
				<div className='mb-8'>
					<h2 className='text-xl font-semibold mb-4 text-primary'>
						Friend Requests
					</h2>
					<div className='space-y-3'>
						{pendingRequests.map(friendship => (
							<FriendCard
								key={friendship.id}
								userId={friendship.user?.id}
								profile={friendship.user}
								subtitle='Wants to be friends'
							/>
						))}
					</div>
				</div>
			)}

			{/* Sent Requests */}
			{sentRequests.length > 0 && (
				<div className='mb-8'>
					<h2 className='text-xl font-semibold mb-4 text-primary'>
						Sent Requests
					</h2>
					<div className='space-y-3'>
						{sentRequests.map(friendship => (
							<FriendCard
								key={friendship.id}
								userId={friendship.friend?.id}
								profile={friendship.friend}
								subtitle='Waiting for response'
							/>
						))}
					</div>
				</div>
			)}

			{/* Friends List */}
			<div>
				<h2 className='text-xl font-semibold mb-4 text-primary'>
					Your Friends ({acceptedFriends.length})
				</h2>
				{acceptedFriends.length === 0 ?
					<EmptyState
						icon={<FaUsers className='w-16 h-16' />}
						title='No friends yet'
						message='Start connecting with others! Search for friends to add them to your network.'
						actionLabel='Search Friends'
						onAction={() => searchInputRef.current?.focus()}
					/>
				:	<div className='space-y-3'>
						{acceptedFriends.map(friendship => {
							// If current user is the requester (user_id), the friend is friend_id
							// If current user is the friend (friend_id), the other person is user_id
							const friend =
								friendship.user_id === profile?.id ?
									friendship.friend
								:	friendship.user;
							return (
								<FriendCard
									key={friendship.id}
									userId={friend?.id}
									profile={friend}
								/>
							);
						})}
					</div>
				}
			</div>
		</div>
	);
};
