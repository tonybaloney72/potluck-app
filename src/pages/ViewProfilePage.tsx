import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router";
import { useAppDispatch, useAppSelector } from "../store/hooks";
import { fetchFriendships } from "../store/slices/friendsSlice";
import {
	sendFriendRequest,
	removeFriend,
	cancelFriendRequest,
} from "../store/slices/friendsSlice";
import { getOrCreateConversation } from "../store/slices/conversationsSlice";
import {
	fetchUserProfileMetadata,
	fetchUserProfile,
} from "../store/slices/usersSlice";
import { useFriendshipStatus } from "../hooks/useFriendshipStatus";
import { Avatar } from "../components/common/Avatar";
import { Button } from "../components/common/Button";
import { ConfirmModal } from "../components/common/ConfirmModal";
import { SkeletonProfilePage } from "../components/common/Skeleton";
import { Map } from "../components/common/Map";
import {
	FaArrowLeft,
	FaEnvelope,
	FaUserPlus,
	FaUserMinus,
	FaUsers,
	FaChevronDown,
	FaChevronUp,
} from "react-icons/fa";
import { ErrorDisplay } from "../components/common/ErrorDisplay";
import { motion, AnimatePresence } from "motion/react";

export const ViewProfilePage = () => {
	const { userId } = useParams<{ userId: string }>();
	const navigate = useNavigate();
	const dispatch = useAppDispatch();
	const { profile: _currentUserProfile, user: currentUser } = useAppSelector(
		state => state.auth,
	);
	const friendshipIds = useAppSelector(state => state.friends.friendshipIds);
	const profileMetadata = useAppSelector(
		state => state.users.profileMetadata[userId || ""],
	);
	const metadataLoading = useAppSelector(
		state => state.users.metadataLoading[userId || ""] || false,
	);
	const cachedProfile = useAppSelector(
		state => state.users.profilesById[userId || ""],
	);
	const profileLoading = useAppSelector(
		state => state.users.profileLoading[userId || ""] || false,
	);

	const [error, setError] = useState<string | null>(null);
	const [actionLoading, setActionLoading] = useState<string | null>(null);
	const [showRemoveModal, setShowRemoveModal] = useState(false);
	const [showMutualFriends, setShowMutualFriends] = useState(false);

	// Get friendship status
	const { status, friendshipId } = useFriendshipStatus(userId);

	// Fetch friendships if not loaded
	useEffect(() => {
		if (friendshipIds.length === 0) {
			dispatch(fetchFriendships());
		}
	}, [dispatch, friendshipIds.length]);

	// Fetch profile metadata (friend count and mutual friends) if not already loaded
	useEffect(() => {
		if (!userId || userId === currentUser?.id) return;

		// Only fetch if we don't already have the metadata
		if (!profileMetadata && !metadataLoading) {
			dispatch(fetchUserProfileMetadata(userId));
		}
	}, [userId, currentUser?.id, profileMetadata, metadataLoading, dispatch]);

	// Fetch user profile if not already cached
	useEffect(() => {
		if (!userId) {
			setError("User ID is required");
			return;
		}

		// Don't fetch if it's the current user (redirect to own profile)
		if (userId === currentUser?.id) {
			navigate("/profile", { replace: true });
			return;
		}

		// Only fetch if we don't already have the profile cached
		if (!cachedProfile && !profileLoading) {
			dispatch(fetchUserProfile(userId))
				.unwrap()
				.catch(err => {
					setError(
						err instanceof Error ? err.message : "Failed to load profile",
					);
				});
		}
	}, [
		userId,
		currentUser?.id,
		cachedProfile,
		profileLoading,
		dispatch,
		navigate,
	]);

	// Use cached profile or null
	const profile = cachedProfile || null;

	// Determine what content to show based on privacy and friendship
	const isFriend = status === "accepted";
	const isPrivate = profile?.private === true;
	const canViewFullProfile = !isPrivate || isFriend;

	// Loading state
	const loading = profileLoading && !cachedProfile;

	// Handler functions
	const handleSendRequest = async () => {
		if (!userId) return;
		setActionLoading("send");
		try {
			await dispatch(sendFriendRequest(userId)).unwrap();
		} catch (err) {
			console.error("Failed to send friend request:", err);
		} finally {
			setActionLoading(null);
		}
	};

	const handleCancelRequest = async () => {
		if (!friendshipId) return;
		setActionLoading("cancel");
		try {
			await dispatch(cancelFriendRequest(friendshipId)).unwrap();
		} catch (err) {
			console.error("Failed to cancel friend request:", err);
		} finally {
			setActionLoading(null);
		}
	};

	const handleMessage = async () => {
		if (!userId) return;
		setActionLoading("message");
		try {
			const result = await dispatch(getOrCreateConversation(userId)).unwrap();
			navigate(`/messages/${result.id}`);
		} catch (err) {
			console.error("Failed to create conversation:", err);
		} finally {
			setActionLoading(null);
		}
	};

	const handleRemove = () => {
		setShowRemoveModal(true);
	};

	const handleConfirmRemove = async () => {
		if (!friendshipId) return;
		setActionLoading("remove");
		try {
			await dispatch(removeFriend(friendshipId)).unwrap();
			setShowRemoveModal(false);
		} catch (err) {
			console.error("Failed to remove friend:", err);
		} finally {
			setActionLoading(null);
		}
	};

	// Render actions based on friendship status
	const renderActions = () => {
		if (status === "none") {
			return (
				<Button
					variant='primary'
					onClick={handleSendRequest}
					loading={actionLoading === "send"}
					disabled={actionLoading !== null}
					className='flex items-center gap-2'>
					<FaUserPlus className='w-4 h-4' />
					Add Friend
				</Button>
			);
		}

		if (status === "sent") {
			return (
				<Button
					variant='secondary'
					onClick={handleCancelRequest}
					loading={actionLoading === "cancel"}
					disabled={actionLoading !== null}
					className='flex items-center gap-2'>
					Cancel Request
				</Button>
			);
		}

		if (status === "accepted") {
			return (
				<div className='flex flex-col sm:flex-row gap-2 justify-between w-full'>
					<Button
						variant='primary'
						onClick={handleMessage}
						loading={actionLoading === "message"}
						disabled={actionLoading !== null}
						className='flex items-center justify-center gap-2 w-full'>
						<FaEnvelope className='w-4 h-4 shrink-0' />
						<span className='whitespace-nowrap'>Send Message</span>
					</Button>
					<Button
						variant='secondary'
						onClick={handleRemove}
						disabled={actionLoading !== null}
						className='flex items-center justify-center gap-2 w-full'>
						<FaUserMinus className='w-4 h-4 shrink-0' />
						<span className='whitespace-nowrap'>Remove Friend</span>
					</Button>
				</div>
			);
		}

		// Pending request (received) - no actions needed here
		return null;
	};

	if (loading) {
		return <SkeletonProfilePage />;
	}

	if (error || !profile) {
		return (
			<main className='bg-secondary p-4 md:p-8'>
				<div className='max-w-2xl mx-auto'>
					<ErrorDisplay
						message={error || "Profile not found"}
						variant='fullscreen'
					/>
				</div>
			</main>
		);
	}

	return (
		<main id='main-content' className='bg-secondary p-4 md:p-8' role='main'>
			<div className='max-w-2xl mx-auto flex flex-col'>
				{/* Header */}
				<div className='flex items-center justify-between mb-4 md:mb-8 relative'>
					<button
						onClick={() => navigate(-1)}
						className='text-primary hover:text-accent transition-colors min-w-[44px] min-h-[44px] flex items-center justify-center hover:cursor-pointer hover:bg-tertiary rounded-md'
						aria-label='Go back'
						type='button'>
						<FaArrowLeft className='w-5 h-5' />
					</button>

					<div className='min-w-[44px]' aria-hidden='true' />
				</div>

				{/* Profile Content */}
				<div className='flex flex-col gap-6 bg-secondary border border-border rounded-lg p-6'>
					{/* Avatar and Name - Always visible */}
					<div className='flex flex-col items-center gap-4 w-full md:w-[60%] self-center h-full'>
						<div className='flex gap-4 w-full'>
							<Avatar user={profile} size='xl' />
							<div className='flex-1 flex flex-col h-full w-full gap-2'>
								<h2 className='text-2xl font-bold text-primary'>
									{profile.name || "Unknown User"}
								</h2>
								{/* Friend count and mutual friends */}
								{profileMetadata && (
									<div className='flex flex-col gap-2'>
										<div className='flex gap-2 items-center'>
											{profileMetadata.friendCount !== undefined && (
												<p className='text-sm text-secondary flex items-center gap-1'>
													<FaUsers className='w-3 h-3' />
													<span>
														{profileMetadata.friendCount}{" "}
														{profileMetadata.friendCount === 1 ?
															"friend"
														:	"friends"}
													</span>
												</p>
											)}
											{profileMetadata.mutualFriends.length > 0 && (
												<button
													onClick={() =>
														setShowMutualFriends(!showMutualFriends)
													}
													className='text-sm text-accent-tertiary hover:text-accent flex items-center gap-1 transition-colors hover:cursor-pointer'
													aria-expanded={showMutualFriends}
													aria-label={
														showMutualFriends ?
															"Hide mutual friends"
														:	`Show ${profileMetadata.mutualFriends.length} mutual friends`
													}>
													<span>
														{profileMetadata.mutualFriends.length}{" "}
														{profileMetadata.mutualFriends.length === 1 ?
															"mutual friend"
														:	"mutual friends"}
													</span>
													{showMutualFriends ?
														<FaChevronUp className='w-3 h-3' />
													:	<FaChevronDown className='w-3 h-3' />}
												</button>
											)}
										</div>
										{/* Expandable mutual friends list */}
										<AnimatePresence>
											{showMutualFriends &&
												profileMetadata.mutualFriends.length > 0 && (
													<motion.div
														initial={{ height: 0, opacity: 0 }}
														animate={{ height: "auto", opacity: 1 }}
														exit={{ height: 0, opacity: 0 }}
														transition={{ duration: 0.2 }}
														className='overflow-hidden'>
														<div className='pt-2 border-t border-border'>
															<div className='grid grid-cols-2 sm:grid-cols-3 gap-3 max-h-48 overflow-y-auto scrollbar-thin'>
																{profileMetadata.mutualFriends.map(
																	mutualFriend => (
																		<button
																			key={mutualFriend.id}
																			onClick={() =>
																				navigate(`/profile/${mutualFriend.id}`)
																			}
																			className='flex flex-col items-center gap-1 p-2 rounded-md hover:bg-tertiary transition-colors hover:cursor-pointer group'
																			aria-label={`View ${mutualFriend.name || "mutual friend"}'s profile`}>
																			<Avatar user={mutualFriend} size='md' />
																			<p className='text-xs text-secondary text-center truncate w-full group-hover:text-primary transition-colors'>
																				{mutualFriend.name || "Unknown"}
																			</p>
																		</button>
																	),
																)}
															</div>
														</div>
													</motion.div>
												)}
										</AnimatePresence>
									</div>
								)}
								{metadataLoading && (
									<p className='text-sm text-secondary mt-2'>Loading...</p>
								)}
							</div>
						</div>

						{/* Actions */}
						{renderActions()}
					</div>

					{/* Full Profile Content - Only if canViewFullProfile */}
					{canViewFullProfile ?
						<div className='space-y-6 pt-6 border-t border-border'>
							{/* Location */}
							{profile.location && (
								<div>
									<h3 className='text-lg font-semibold text-primary mb-2'>
										Location
									</h3>
									<Map selectedLocation={profile.location} canSearch={false} />
								</div>
							)}

							{/* Email (if available) */}
							{/* {profile.email && (
								<div>
									<h3 className='text-lg font-semibold text-primary mb-2'>
										Email
									</h3>
									<p className='text-secondary'>{profile.email}</p>
								</div>
							)} */}
						</div>
					:	<div className='text-center py-4'>
							<p className='text-secondary'>
								This profile is private. Add this user as a friend to view their
								full profile.
							</p>
						</div>
					}
				</div>
			</div>

			{/* Remove Friend Confirmation Modal */}
			<ConfirmModal
				isOpen={showRemoveModal}
				onClose={() => setShowRemoveModal(false)}
				onConfirm={handleConfirmRemove}
				title='Remove Friend'
				message={`Are you sure you want to remove ${profile.name || "this friend"} from your friends list?`}
				confirmText='Remove'
				cancelText='Cancel'
				confirmVariant='primary'
			/>
		</main>
	);
};
