import { useEffect, useState, useMemo, useRef } from "react";
import { useLocation } from "react-router";
import { useAppDispatch, useAppSelector } from "../store/hooks";
import {
	fetchMessages,
	sendMessage,
	markMessagesAsRead,
} from "../store/slices/messagesSlice";
import {
	fetchConversations,
	getOrCreateConversation,
} from "../store/slices/conversationsSlice";
import { markNotificationAsRead } from "../store/slices/notificationsSlice";
import { useForm } from "react-hook-form";
import { Button } from "../components/common/Button";
import { Input } from "../components/common/Input";
import { EmptyState } from "../components/common/EmptyState";
import {
	FaUser,
	FaPaperPlane,
	FaEnvelope,
	FaComment,
	FaArrowLeft,
} from "react-icons/fa";
import {
	FriendSelector,
	type SelectedFriend,
} from "../components/common/FriendSelector";
import { useMessagesRealtime } from "../hooks/useMessagesRealtime";
import { useConversationsRealtime } from "../hooks/useConversationsRealtime";
import { supabase } from "../services/supabase";
import {
	SkeletonConversationItem,
	SkeletonMessage,
	Skeleton,
} from "../components/common/Skeleton";

interface MessageFormData {
	content: string;
}

export const MessagesPage = () => {
	const dispatch = useAppDispatch();
	const location = useLocation();
	const {
		messages: allMessages,
		loading,
		sending,
		error,
	} = useAppSelector(state => state.messages);
	const {
		conversations,
		loading: conversationsLoading,
		creatingConversation,
	} = useAppSelector(state => state.conversations);
	const { profile, user } = useAppSelector(state => state.auth);
	const [selectedConversationId, setSelectedConversationId] = useState<
		string | null
	>(null);
	const messages = selectedConversationId
		? allMessages[selectedConversationId] || []
		: [];

	useMessagesRealtime(selectedConversationId);
	useConversationsRealtime();

	const [hasLoaded, setHasLoaded] = useState(false);
	const [isCreatingNewConversation, setIsCreatingNewConversation] =
		useState(false);
	const [selectedFriends, setSelectedFriends] = useState<SelectedFriend[]>([]);
	const [showMessagesView, setShowMessagesView] = useState(false);
	const messagesEndRef = useRef<HTMLDivElement>(null);
	const messagesContainerRef = useRef<HTMLDivElement>(null);
	const {
		register,
		handleSubmit,
		reset,
		formState: { errors },
	} = useForm<MessageFormData>();

	useEffect(() => {
		dispatch(fetchConversations()).then(() => {
			setHasLoaded(true);
		});
	}, [dispatch]);

	useEffect(() => {
		// Handle navigation from FriendsPage with selectedUserId
		if (location.state?.selectedUserId && hasLoaded) {
			// Get or create conversation with that user
			dispatch(getOrCreateConversation(location.state.selectedUserId)).then(
				result => {
					if (getOrCreateConversation.fulfilled.match(result)) {
						setSelectedConversationId(result.payload.id);
					}
				},
			);
			// Clear the location state after using it
			window.history.replaceState({}, document.title);
		}
	}, [location.state, hasLoaded, dispatch]);

	useEffect(() => {
		if (selectedConversationId && user) {
			// Fetch new conversation's messages
			dispatch(fetchMessages(selectedConversationId));
			dispatch(markMessagesAsRead(selectedConversationId));

			// Mark message notifications as read for this conversation
			// This handles existing notifications when selecting a conversation
			supabase
				.from("notifications")
				.update({ read: true })
				.eq("user_id", user.id)
				.eq("type", "message")
				.eq("related_id", selectedConversationId)
				.eq("read", false)
				.select()
				.then(({ data: notifications }) => {
					// Update Redux state for each notification
					if (notifications) {
						notifications.forEach(notification => {
							dispatch(markNotificationAsRead(notification.id));
						});
					}
				});
		}
	}, [selectedConversationId, dispatch, user]);

	useEffect(() => {
		// Handle navigation from NotificationDropdown with conversationId
		if (location.state?.conversationId && hasLoaded) {
			const conversationId = location.state.conversationId;

			// Check if conversation exists in state
			const conversationExists = conversations.some(
				c => c.id === conversationId,
			);

			if (!conversationExists) {
				// Conversation doesn't exist, fetch conversations first
				dispatch(fetchConversations()).then(() => {
					setSelectedConversationId(conversationId);
					// Clear the location state after using it
					window.history.replaceState({}, document.title);
				});
			} else {
				// Conversation exists, just select it
				setSelectedConversationId(conversationId);
				// Clear the location state after using it
				window.history.replaceState({}, document.title);
			}
		}
	}, [location.state, hasLoaded, conversations, dispatch]);

	const onSubmit = async (data: MessageFormData) => {
		if (!selectedConversationId) return;

		// Get the other user's ID from the selected conversation
		const selectedConversation = conversations.find(
			c => c.id === selectedConversationId,
		);
		if (!selectedConversation) return;

		const receiverId =
			selectedConversation.user1_id === profile?.id
				? selectedConversation.user2_id
				: selectedConversation.user1_id;

		await dispatch(sendMessage({ receiverId, content: data.content }));
		reset();
	};

	// Get existing conversation partner IDs to exclude from selector
	const existingConversationPartnerIds = useMemo(() => {
		if (!profile || !conversations) return [];
		return conversations.map(c =>
			c.user1_id === profile.id ? c.user2_id : c.user1_id,
		);
	}, [conversations, profile]);

	const handleFriendAdded = async (friendId: string) => {
		setIsCreatingNewConversation(true);
		try {
			const result = await dispatch(getOrCreateConversation(friendId));
			if (getOrCreateConversation.fulfilled.match(result)) {
				setSelectedConversationId(result.payload.id);
				// Clear selection after successful conversation creation
				setSelectedFriends([]);
			}
		} finally {
			setIsCreatingNewConversation(false);
		}
	};

	// Hide main header on mobile when in messages view
	useEffect(() => {
		if (showMessagesView && selectedConversationId) {
			document.body.classList.add("hide-header-mobile");
		} else {
			document.body.classList.remove("hide-header-mobile");
		}

		return () => {
			document.body.classList.remove("hide-header-mobile");
		};
	}, [showMessagesView, selectedConversationId]);

	// Auto-scroll to bottom when conversation changes or new message arrives
	useEffect(() => {
		if (messagesContainerRef.current && messages.length > 0) {
			// Scroll immediately without animation
			messagesContainerRef.current.scrollTop =
				messagesContainerRef.current.scrollHeight;
		}
	}, [messages, selectedConversationId]);

	// Show loading only on initial load when we have no data
	if (
		(conversationsLoading || loading) &&
		!hasLoaded &&
		conversations.length === 0
	) {
		return (
			<div className='max-w-6xl mx-auto p-4 md:p-8 h-[calc(100vh-8rem)] flex flex-col md:flex-row gap-4'>
				{/* Conversations List Skeleton */}
				<div className='w-full md:w-1/3 border-r-0 md:border-r border-border md:pr-4 pr-0 overflow-y-auto flex flex-col gap-4'>
					<Skeleton variant='text' width='40%' height={24} />
					<Skeleton
						variant='rectangular'
						width='100%'
						height={36}
						className='rounded-md mb-4'
					/>
					<div className='space-y-2'>
						{Array.from({ length: 5 }).map((_, i) => (
							<SkeletonConversationItem key={i} />
						))}
					</div>
				</div>

				{/* Messages View Skeleton */}
				<div className='hidden md:flex flex-1 flex-col'>
					<div className='flex-1 overflow-y-auto mb-4 space-y-4 pr-4'>
						{Array.from({ length: 4 }).map((_, i) => (
							<SkeletonMessage key={i} isOwn={i % 2 === 0} />
						))}
					</div>
					<div className='flex gap-2'>
						<Skeleton
							variant='rectangular'
							width='100%'
							height={40}
							className='rounded-md'
						/>
						<Skeleton
							variant='rectangular'
							width={40}
							height={40}
							className='rounded-md'
						/>
					</div>
				</div>
			</div>
		);
	}

	const selectedConversation = conversations.find(
		c => c.id === selectedConversationId,
	);
	const otherUser = selectedConversation
		? selectedConversation.user1_id === profile?.id
			? selectedConversation.user2
			: selectedConversation.user1
		: null;

	// On mobile, show messages view when conversation is selected
	// On desktop, always show both side-by-side
	const shouldShowMessagesView = selectedConversationId && otherUser;

	// Handle conversation selection - on mobile, switch to messages view
	const handleConversationClick = (conversationId: string) => {
		setSelectedConversationId(conversationId);
		// On mobile (screens < md breakpoint), show messages view
		// We'll use CSS to handle this, but set state for mobile behavior
		setShowMessagesView(true);
	};

	// Handle back button on mobile
	const handleBackToConversations = () => {
		setShowMessagesView(false);
		setSelectedConversationId(null);
	};

	return (
		<div className='max-w-6xl mx-auto p-4 md:p-8 h-[calc(100vh-8rem)] flex flex-col md:flex-row gap-4'>
			{/* Conversations List */}
			<div
				className={`w-full md:w-1/3 border-r-0 md:border-r border-border md:pr-4 pr-0 overflow-y-auto flex flex-col gap-4 ${
					showMessagesView ? "hidden md:flex" : "flex"
				}`}>
				{/* Friend Selector for starting new conversations */}
				<FriendSelector
					selectedFriends={selectedFriends}
					onSelectionChange={setSelectedFriends}
					onFriendAdded={handleFriendAdded}
					excludeIds={existingConversationPartnerIds}
					hideSelectedChips={true}
					singleSelect={true}
					maxVisibleFriends={5}
					className={
						isCreatingNewConversation && creatingConversation
							? "opacity-50 pointer-events-none"
							: ""
					}
				/>
				<h2 className='text-xl font-semibold text-primary'>Conversations</h2>
				{error && (
					<div className='mb-4 p-3 bg-red-500/10 border border-red-500 rounded-lg'>
						<p className='text-sm text-red-500'>{error}</p>
					</div>
				)}
				{conversations.length === 0 ? (
					<EmptyState
						icon={<FaEnvelope className='w-16 h-16' />}
						title='No conversations yet'
						message='Start a conversation with your friends to begin messaging.'
					/>
				) : (
					<div className='md:space-y-2'>
						{conversations.map(conversation => {
							const otherUser =
								conversation.user1_id === profile?.id
									? conversation.user2
									: conversation.user1;

							return (
								<button
									key={conversation.id}
									onClick={() => handleConversationClick(conversation.id)}
									className={`hover:cursor-pointer w-full text-left p-3 rounded-lg transition-colors min-h-[44px] ${
										selectedConversationId === conversation.id
											? "bg-accent text-bg-secondary"
											: "bg-secondary hover:bg-tertiary text-primary"
									}`}>
									<div className='flex items-center gap-3'>
										{otherUser?.avatar_url ? (
											<img
												src={otherUser.avatar_url}
												alt={otherUser.name || "User"}
												className='w-10 h-10 rounded-full object-cover'
											/>
										) : (
											<div className='w-10 h-10 rounded-full bg-tertiary flex items-center justify-center'>
												<FaUser className='w-5 h-5' />
											</div>
										)}
										<div className='flex-1 min-w-0'>
											<div className='flex items-center justify-between'>
												<p className='font-medium truncate'>
													{otherUser?.name || "Unknown User"}
												</p>
												{(conversation.unread_count ?? 0) > 0 && (
													<span className='bg-accent text-bg-secondary rounded-full text-xs px-2 py-0.5 ml-2 shrink-0'>
														{conversation.unread_count}
													</span>
												)}
											</div>
											{conversation.last_message && (
												<p className='text-sm truncate opacity-75'>
													{conversation.last_message.content}
												</p>
											)}
										</div>
									</div>
								</button>
							);
						})}
					</div>
				)}
			</div>

			{/* Messages View */}
			<div
				className={`flex-1 flex flex-col ${
					showMessagesView
						? "fixed inset-0 md:static md:inset-auto flex flex-col"
						: "hidden md:flex"
				}`}>
				{shouldShowMessagesView ? (
					<>
						{/* Mobile Header - Back arrow and user name on same row */}
						<div className='md:hidden shrink-0 flex items-center gap-3 px-4 py-2 md:py-3 bg-secondary border-b border-border'>
							<button
								onClick={handleBackToConversations}
								className='text-primary hover:text-accent transition-colors min-w-[44px] min-h-[44px] flex items-center justify-center'>
								<FaArrowLeft className='w-5 h-5' />
							</button>
							<div className='flex items-center gap-3 flex-1 min-w-0'>
								{otherUser?.avatar_url ? (
									<img
										src={otherUser.avatar_url}
										alt={otherUser.name || "User"}
										className='w-8 h-8 rounded-full object-cover shrink-0'
									/>
								) : (
									<div className='w-8 h-8 rounded-full bg-tertiary flex items-center justify-center shrink-0'>
										<FaUser className='w-4 h-4' />
									</div>
								)}
								<p className='font-semibold text-primary truncate'>
									{otherUser?.name || "Unknown User"}
								</p>
							</div>
						</div>

						{/* Desktop Header */}
						<div className='hidden md:flex items-center gap-3 pb-4 border-b border-border'>
							{otherUser?.avatar_url ? (
								<img
									src={otherUser.avatar_url}
									alt={otherUser.name || "User"}
									className='w-10 h-10 rounded-full object-cover'
								/>
							) : (
								<div className='w-10 h-10 rounded-full bg-tertiary flex items-center justify-center'>
									<FaUser className='w-5 h-5' />
								</div>
							)}
							<div>
								<p className='font-semibold text-primary'>
									{otherUser?.name || "Unknown User"}
								</p>
							</div>
						</div>

						{/* Messages Container - Only scrollable area */}
						<div
							ref={messagesContainerRef}
							className='flex-1 overflow-y-auto space-y-2 md:space-y-4 scrollbar-thin scrollbar-thumb-accent scrollbar-track-transparent px-4 md:pr-4 md:pl-0 py-2 md:py-4'>
							{messages.map(message => {
								const isOwn = message.sender_id === profile?.id;
								return (
									<div
										key={message.id}
										className={`flex ${
											isOwn ? "justify-end" : "justify-start"
										}`}>
										<div
											className={`max-w-[85%] md:max-w-xs p-2 md:p-3 rounded-lg ${
												isOwn
													? "bg-accent text-bg-secondary"
													: "bg-tertiary text-primary"
											}`}>
											<p className='wrap-break-word'>{message.content}</p>
										</div>
									</div>
								);
							})}
							<div ref={messagesEndRef} />
						</div>

						{/* Input Form */}
						<form
							onSubmit={handleSubmit(onSubmit)}
							className='flex gap-2 shrink-0 bg-secondary border-t md:border-t-0 border-border p-2 md:p-0'>
							<Input
								placeholder='Type a message...'
								autoComplete='off'
								{...register("content", {
									required: "Message cannot be empty",
								})}
								error={errors.content?.message}
								className='flex-1'
							/>
							<Button
								type='submit'
								loading={sending}
								loadingText='Sending...'
								className='min-w-[44px] min-h-[44px] flex items-center justify-center'>
								<FaPaperPlane className='w-4 h-4' />
							</Button>
						</form>
					</>
				) : (
					<EmptyState
						icon={<FaComment className='w-16 h-16' />}
						title='No conversation selected'
						message='Select a conversation from the list to start messaging, or start a new conversation using the search above.'
					/>
				)}
			</div>
		</div>
	);
};
