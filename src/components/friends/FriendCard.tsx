import { useState, useEffect } from "react";
import { useNavigate } from "react-router";
import { FaCheck, FaTimes, FaUserPlus, FaEnvelope } from "react-icons/fa";
import { useAppDispatch, useAppSelector } from "../../store/hooks";
import {
	sendFriendRequest,
	acceptFriendRequest,
	removeFriend,
	cancelFriendRequest,
} from "../../store/slices/friendsSlice";
import { getOrCreateConversation } from "../../store/slices/conversationsSlice";
import { useFriendshipStatus } from "../../hooks/useFriendshipStatus";
import { supabase } from "../../services/supabase";
import type { Profile } from "../../types";
import { Button } from "../common/Button";
import { ConfirmModal } from "../common/ConfirmModal";
import { Avatar } from "../common/Avatar";

interface FriendCardProps {
	// Either userId OR profile (if profile is provided, userId is optional)
	userId?: string;
	profile?: Profile | null | undefined;
	subtitle?: string;
	// Optional callback when message is successful (if not provided, uses navigate)
	onMessageSuccess?: (conversationId: string) => void;
	// Force vertical layout (always flex-col, no responsive breakpoint)
	forceVertical?: boolean;
	// Limit actions to only "send request" and "message" (hide accept/decline/cancel/remove)
	limitedActions?: boolean;
}

export const FriendCard = ({
	userId,
	profile: providedProfile,
	subtitle,
	onMessageSuccess,
	forceVertical = false,
	limitedActions = false,
}: FriendCardProps) => {
	const dispatch = useAppDispatch();
	const navigate = useNavigate();
	const { sendingRequest } = useAppSelector(state => state.friends);

	// Get the actual userId (from prop or profile)
	const actualUserId = userId || providedProfile?.id;

	// Use the hook to get friendship status
	const { status, friendshipId } = useFriendshipStatus(actualUserId);

	// State for profile (fetched or provided)
	const [profile, setProfile] = useState<Profile | null | undefined>(
		providedProfile,
	);

	// Loading states
	const [loadingMessage, setLoadingMessage] = useState(false);
	const [loadingAction, setLoadingAction] = useState<string | null>(null);

	// Confirmation modal state
	const [confirmModal, setConfirmModal] = useState<{
		type: "remove" | "decline";
		friendshipId: string;
		userName: string;
	} | null>(null);

	// Fetch profile if userId provided but no profile
	useEffect(() => {
		if (userId && !providedProfile && !profile) {
			supabase
				.from("profiles")
				.select("*")
				.eq("id", userId)
				.single()
				.then(({ data, error }) => {
					if (!error && data) {
						setProfile(data);
					}
				});
		}
	}, [userId, providedProfile, profile]);

	// Map status to action type
	const getActionType = () => {
		if (status === "none") return "send-request";
		if (status === "sent") return "sent-request-actions";
		if (status === "pending") return "pending-request-actions";
		if (status === "accepted") return "friend-actions";
		return "none";
	};

	const actionType = getActionType();

	// Handler functions
	const handleSendRequest = async () => {
		if (!actualUserId) return;
		setLoadingAction("send");
		try {
			await dispatch(sendFriendRequest(actualUserId)).unwrap();
		} catch (error) {
			console.error("Failed to send friend request:", error);
		} finally {
			setLoadingAction(null);
		}
	};

	const handleAccept = async () => {
		if (!friendshipId) return;
		setLoadingAction("accept");
		try {
			await dispatch(acceptFriendRequest(friendshipId)).unwrap();
		} catch (error) {
			console.error("Failed to accept friend request:", error);
		} finally {
			setLoadingAction(null);
		}
	};

	const handleDecline = () => {
		if (!friendshipId || !profile) return;
		setConfirmModal({
			type: "decline",
			friendshipId,
			userName: profile.name || "Unknown User",
		});
	};

	const handleCancel = async () => {
		if (!friendshipId) return;
		setLoadingAction("cancel");
		try {
			await dispatch(cancelFriendRequest(friendshipId)).unwrap();
		} catch (error) {
			console.error("Failed to cancel friend request:", error);
		} finally {
			setLoadingAction(null);
		}
	};

	const handleMessage = async () => {
		if (!actualUserId) return;
		setLoadingMessage(true);
		try {
			const result = await dispatch(
				getOrCreateConversation(actualUserId),
			).unwrap();
			if (onMessageSuccess) {
				onMessageSuccess(result.id);
			} else {
				navigate(`/messages/${result.id}`);
			}
		} catch (error) {
			console.error("Failed to create conversation:", error);
		} finally {
			setLoadingMessage(false);
		}
	};

	const handleRemove = () => {
		if (!friendshipId || !profile) return;
		setConfirmModal({
			type: "remove",
			friendshipId,
			userName: profile.name || "Unknown User",
		});
	};

	const handleConfirmRemove = async () => {
		if (!confirmModal) return;
		setLoadingAction("remove");
		try {
			await dispatch(removeFriend(confirmModal.friendshipId)).unwrap();
			setConfirmModal(null);
		} catch (error) {
			console.error("Failed to remove friend:", error);
		} finally {
			setLoadingAction(null);
		}
	};

	const renderActions = () => {
		// Limited actions mode: only show "send request" and "message"
		if (limitedActions) {
			if (status === "none") {
				return (
					<Button
						className='flex items-center'
						variant='primary'
						onClick={handleSendRequest}
						loading={loadingAction === "send" || sendingRequest}
						loadingText='Sending...'
						disabled={loadingAction === "send" || sendingRequest}>
						<FaUserPlus className='w-4 h-4 mr-2' />
						Send Request
					</Button>
				);
			}
			if (status === "accepted") {
				return (
					<Button
						className='flex items-center'
						variant='primary'
						onClick={handleMessage}
						loading={loadingMessage}
						loadingText='Opening...'
						disabled={loadingMessage}>
						<FaEnvelope className='w-4 h-4 mr-2' /> Message
					</Button>
				);
			}
			// For "sent" or "pending" statuses in limited mode, show nothing
			return null;
		}

		// Full actions mode: show all available actions
		switch (actionType) {
			case "send-request":
				return (
					<Button
						className='flex items-center'
						variant='primary'
						onClick={handleSendRequest}
						loading={loadingAction === "send" || sendingRequest}
						loadingText='Sending...'
						disabled={loadingAction === "send" || sendingRequest}>
						<FaUserPlus className='w-4 h-4 mr-2' />
						Send Request
					</Button>
				);

			case "pending-request-actions":
				return (
					<div className='flex gap-2'>
						<Button
							variant='primary'
							onClick={handleAccept}
							loading={loadingAction === "accept"}
							disabled={loadingAction !== null}>
							<FaCheck className='w-4 h-4' />
						</Button>
						<Button
							variant='secondary'
							onClick={handleDecline}
							disabled={loadingAction !== null}>
							<FaTimes className='w-4 h-4' />
						</Button>
					</div>
				);

			case "sent-request-actions":
				return (
					<Button
						className='flex items-center gap-2'
						variant='secondary'
						onClick={handleCancel}
						loading={loadingAction === "cancel"}
						disabled={loadingAction !== null}>
						<FaTimes className='w-4 h-4 mt-0.5' />
						Cancel Request
					</Button>
				);

			case "friend-actions":
				return (
					<div className='flex gap-2'>
						<Button
							className='flex items-center'
							variant='primary'
							onClick={handleMessage}
							loading={loadingMessage}
							loadingText='Opening...'
							disabled={loadingMessage}>
							<FaEnvelope className='w-4 h-4 mr-2' /> Message
						</Button>
						<Button
							variant='secondary'
							onClick={handleRemove}
							disabled={loadingAction !== null}>
							Remove
						</Button>
					</div>
				);

			case "none":
			default:
				return null;
		}
	};

	const containerClasses =
		forceVertical ?
			"flex flex-col gap-3 items-center justify-between p-3 bg-secondary border border-border rounded-lg"
		:	"flex flex-col gap-3 md:flex-row md:gap-0 items-center justify-between p-3 md:p-4 bg-secondary border border-border rounded-lg";

	return (
		<>
			<div className={containerClasses}>
				<div className='flex items-center gap-3'>
					<Avatar user={profile} size='lg' />
					<div>
						<p className='font-medium text-primary'>
							{profile?.name || "Unknown User"}
						</p>
						{subtitle ?
							<p className='text-sm text-secondary'>{subtitle}</p>
						:	profile?.location && (
								<p className='text-sm text-secondary'>{profile.location.address}</p>
							)
						}
					</div>
				</div>
				{renderActions()}
			</div>

			{/* Confirmation Modal */}
			<ConfirmModal
				isOpen={confirmModal !== null}
				onClose={() => setConfirmModal(null)}
				onConfirm={handleConfirmRemove}
				title={
					confirmModal?.type === "decline" ?
						"Decline Friend Request"
					:	"Remove Friend"
				}
				message={
					confirmModal?.type === "decline" ?
						`Are you sure you want to decline the friend request from ${
							confirmModal?.userName || "this user"
						}?`
					:	`Are you sure you want to remove ${
							confirmModal?.userName || "this friend"
						} from your friends list?`
				}
				confirmText={confirmModal?.type === "decline" ? "Decline" : "Remove"}
				cancelText='Cancel'
				confirmVariant='primary'
			/>
		</>
	);
};
