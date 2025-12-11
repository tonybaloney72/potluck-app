import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router";
import { useAppDispatch, useAppSelector } from "../store/hooks";
import { supabase } from "../services/supabase";
import { fetchFriendships } from "../store/slices/friendsSlice";
import {
	sendFriendRequest,
	removeFriend,
	cancelFriendRequest,
} from "../store/slices/friendsSlice";
import { getOrCreateConversation } from "../store/slices/conversationsSlice";
import { useFriendshipStatus } from "../hooks/useFriendshipStatus";
import type { Profile } from "../types";
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
} from "react-icons/fa";
import { ErrorDisplay } from "../components/common/ErrorDisplay";

export const ViewProfilePage = () => {
	const { userId } = useParams<{ userId: string }>();
	const navigate = useNavigate();
	const dispatch = useAppDispatch();
	const { profile: _currentUserProfile, user: currentUser } = useAppSelector(
		state => state.auth,
	);

	const [profile, setProfile] = useState<Profile | null>(null);
	const [loading, setLoading] = useState(true);
	const [error, setError] = useState<string | null>(null);
	const [actionLoading, setActionLoading] = useState<string | null>(null);
	const [showRemoveModal, setShowRemoveModal] = useState(false);

	// Get friendship status
	const { status, friendshipId } = useFriendshipStatus(userId);

	// Fetch friendships if not loaded
	useEffect(() => {
		dispatch(fetchFriendships());
	}, [dispatch]);

	// Fetch user profile
	useEffect(() => {
		if (!userId) {
			setError("User ID is required");
			setLoading(false);
			return;
		}

		// Don't fetch if it's the current user (redirect to own profile)
		if (userId === currentUser?.id) {
			navigate("/profile", { replace: true });
			return;
		}

		const fetchProfile = async () => {
			setLoading(true);
			setError(null);
			try {
				const { data, error: fetchError } = await supabase
					.from("profiles")
					.select("*")
					.eq("id", userId)
					.single();

				if (fetchError) throw fetchError;
				if (!data) throw new Error("Profile not found");

				setProfile(data as Profile);
			} catch (err) {
				setError(err instanceof Error ? err.message : "Failed to load profile");
			} finally {
				setLoading(false);
			}
		};

		fetchProfile();
	}, [userId, currentUser?.id, navigate]);

	// Determine what content to show based on privacy and friendship
	const isFriend = status === "accepted";
	const isPrivate = profile?.private === true;
	const canViewFullProfile = !isPrivate || isFriend;

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
				<div className='flex flex-col sm:flex-row gap-2 w-full sm:w-auto'>
					<Button
						variant='primary'
						onClick={handleMessage}
						loading={actionLoading === "message"}
						disabled={actionLoading !== null}
						className='flex items-center justify-center gap-2 w-full sm:w-auto'>
						<FaEnvelope className='w-4 h-4 shrink-0' />
						<span className='whitespace-nowrap'>Send Message</span>
					</Button>
					<Button
						variant='secondary'
						onClick={handleRemove}
						disabled={actionLoading !== null}
						className='flex items-center justify-center gap-2 w-full sm:w-auto'>
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
				<div className='bg-secondary border border-border rounded-lg p-6 space-y-6'>
					{/* Avatar and Name - Always visible */}
					<div className='flex flex-col items-center gap-4'>
						<Avatar user={profile} size='xl' />
						<div className='text-center'>
							<h2 className='text-2xl font-bold text-primary'>
								{profile.name || "Unknown User"}
							</h2>
						</div>
					</div>

					{/* Actions */}
					<div className='flex justify-center w-full'>{renderActions()}</div>

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
