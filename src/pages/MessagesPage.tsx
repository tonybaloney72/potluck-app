import { useEffect, useState, useMemo, useRef } from "react";
import { useParams, useNavigate } from "react-router";
import { useAppDispatch, useAppSelector } from "../store/hooks";
import { sendMessage, markMessagesAsRead } from "../store/slices/messagesSlice";
import {
	getOrCreateConversation,
	setCurrentConversationId,
} from "../store/slices/conversationsSlice";
import {
	selectAllConversations,
	selectConversationById,
} from "../store/selectors/conversationsSelectors";
import { markConversationNotificationsAsRead } from "../store/slices/notificationsSlice";
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
import { SkeletonMessage, Skeleton } from "../components/common/Skeleton";

interface MessageFormData {
	content: string;
}

export const MessagesPage = () => {
	const dispatch = useAppDispatch();
	const navigate = useNavigate();
	const { conversationId } = useParams<{ conversationId?: string }>();

	const {
		messages: allMessages,
		sending,
		error,
	} = useAppSelector(state => state.messages);
	const conversations = useAppSelector(selectAllConversations);
	const conversationsById = useAppSelector(
		state => state.conversations.conversationsById,
	);
	const { creatingConversation } = useAppSelector(state => state.conversations);
	const { profile, user } = useAppSelector(state => state.auth);
	const [isCreatingNewConversation, setIsCreatingNewConversation] =
		useState(false);
	const [selectedFriends, setSelectedFriends] = useState<SelectedFriend[]>([]);
	const messagesContainerRef = useRef<HTMLDivElement>(null);
	const {
		register,
		handleSubmit,
		reset,
		formState: { errors },
	} = useForm<MessageFormData>({
		mode: "onSubmit",
		reValidateMode: "onSubmit",
	});

	// Get selected conversation from URL params
	const selectedConversation = useAppSelector(state =>
		conversationId ? selectConversationById(state, conversationId) : null,
	);
	const messages = conversationId ? allMessages[conversationId] || [] : [];
	const otherUser =
		selectedConversation ?
			selectedConversation.user1_id === profile?.id ?
				selectedConversation.user2
			:	selectedConversation.user1
		:	null;
	const isOtherUserInactive = otherUser?.active === false;

	// Validate conversation exists - redirect if invalid
	useEffect(() => {
		if (!conversationId) return; // No conversation ID, nothing to validate

		// Wait until conversations are loaded (check if conversationsById has any data)
		if (Object.keys(conversationsById).length === 0) return;

		const conversationExists = !!conversationsById[conversationId];
		if (!conversationExists) {
			// Invalid conversation ID, redirect to messages list
			navigate("/messages", { replace: true });
		}
	}, [conversationId, conversationsById, navigate]);

	// Update Redux state with current conversation ID for realtime hook
	useEffect(() => {
		if (conversationId) {
			dispatch(setCurrentConversationId(conversationId));
		}
		return () => {
			dispatch(setCurrentConversationId(null));
		};
	}, [conversationId, dispatch]);

	// Handle conversation actions when conversation is selected
	useEffect(() => {
		if (conversationId && user) {
			dispatch(markMessagesAsRead(conversationId));
			dispatch(markConversationNotificationsAsRead(conversationId));
		}
	}, [conversationId, user, dispatch]);

	// Hide main header on mobile when viewing conversation
	useEffect(() => {
		if (conversationId) {
			document.body.classList.add("hide-header-mobile");
		} else {
			document.body.classList.remove("hide-header-mobile");
		}

		return () => {
			document.body.classList.remove("hide-header-mobile");
		};
	}, [conversationId]);

	// Auto-scroll to bottom when conversation changes or new message arrives
	useEffect(() => {
		if (messagesContainerRef.current && messages.length > 0) {
			messagesContainerRef.current.scrollTop =
				messagesContainerRef.current.scrollHeight;
		}
	}, [messages, conversationId]);

	const onSubmit = async (data: MessageFormData) => {
		if (!conversationId || !selectedConversation || isOtherUserInactive) return;

		const receiverId =
			selectedConversation.user1_id === profile?.id ?
				selectedConversation.user2_id
			:	selectedConversation.user1_id;

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
				navigate(`/messages/${result.payload.id}`);
				setSelectedFriends([]);
			}
		} finally {
			setIsCreatingNewConversation(false);
		}
	};

	// Handle conversation selection - navigate to URL
	const handleConversationClick = (id: string) => {
		navigate(`/messages/${id}`);
	};

	// Handle back button on mobile
	const handleBackToConversations = () => {
		navigate("/messages");
	};

	// Determine if we should show conversation view
	const showConversationView = !!conversationId && !!selectedConversation;

	return (
		<div className='max-w-6xl mx-auto p-4 md:p-8 h-[calc(100vh-8rem)] flex flex-col md:flex-row gap-4'>
			{/* Conversations List */}
			<div
				className={`w-full md:w-1/3 border-r-0 md:border-r border-border md:pr-4 pr-0 overflow-y-auto flex flex-col gap-4 ${
					showConversationView ? "hidden md:flex" : "flex"
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
						isCreatingNewConversation && creatingConversation ?
							"opacity-50 pointer-events-none"
						:	""
					}
				/>
				<h2 className='text-xl font-semibold text-primary'>Conversations</h2>
				{error && (
					<div className='mb-4 p-3 bg-red-500/10 border border-red-500 rounded-lg'>
						<p className='text-sm text-red-500'>{error}</p>
					</div>
				)}
				{conversations.length === 0 ?
					<EmptyState
						icon={<FaEnvelope className='w-16 h-16' />}
						title='No conversations yet'
						message='Start a conversation with your friends to begin messaging.'
					/>
				:	<div className='md:space-y-2'>
						{conversations.map(conversation => {
							const otherUserInList =
								conversation.user1_id === profile?.id ?
									conversation.user2
								:	conversation.user1;

							return (
								<button
									key={conversation.id}
									onClick={() => handleConversationClick(conversation.id)}
									className={`hover:cursor-pointer w-full text-left p-3 rounded-lg transition-all duration-200 min-h-[44px] ${
										conversationId === conversation.id ?
											"bg-accent text-bg-secondary shadow-sm"
										:	"bg-secondary hover:bg-tertiary hover:shadow-sm text-primary"
									}`}>
									<div className='flex items-center gap-3'>
										{otherUserInList?.avatar_url ?
											<img
												src={otherUserInList.avatar_url}
												alt={otherUserInList.name || "User"}
												className='w-10 h-10 rounded-full object-cover'
											/>
										:	<div className='w-10 h-10 rounded-full bg-tertiary flex items-center justify-center'>
												<FaUser className='w-5 h-5' />
											</div>
										}
										<div className='flex-1 min-w-0'>
											<div className='flex items-center justify-between'>
												<p className='font-medium truncate'>
													{otherUserInList?.name || "Unknown User"}
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
				}
			</div>

			{/* Messages View */}
			<div
				className={`flex-1 flex flex-col ${
					showConversationView ?
						"fixed inset-0 md:static md:inset-auto flex flex-col"
					:	"hidden md:flex"
				}`}>
				{conversationId && !selectedConversation ?
					// Loading state when conversation ID exists but conversation not loaded yet
					<div className='flex-1 flex flex-col'>
						{/* Mobile Header Skeleton */}
						<div className='md:hidden shrink-0 flex items-center gap-3 px-4 py-2 bg-secondary border-b border-border'>
							<Skeleton
								variant='rectangular'
								width={44}
								height={44}
								className='rounded-md'
							/>
							<Skeleton
								variant='rectangular'
								width={32}
								height={32}
								className='rounded-full'
							/>
							<Skeleton variant='text' width={120} height={20} />
						</div>
						{/* Desktop Header Skeleton */}
						<div className='hidden md:flex items-center gap-3 pb-4 border-b border-border'>
							<Skeleton
								variant='rectangular'
								width={40}
								height={40}
								className='rounded-full'
							/>
							<Skeleton variant='text' width={150} height={20} />
						</div>
						{/* Messages Skeleton */}
						<div className='flex-1 overflow-y-auto space-y-4 px-4 md:pr-4 md:pl-0 py-2 md:py-4'>
							{Array.from({ length: 4 }).map((_, i) => (
								<SkeletonMessage key={i} isOwn={i % 2 === 0} />
							))}
						</div>
						{/* Input Skeleton */}
						<div className='flex gap-2 shrink-0 bg-secondary border-t md:border-t-0 border-border p-2 md:p-0'>
							<Skeleton
								variant='rectangular'
								width='100%'
								height={40}
								className='rounded-md'
							/>
							<Skeleton
								variant='rectangular'
								width={44}
								height={44}
								className='rounded-md'
							/>
						</div>
					</div>
				: showConversationView ?
					<>
						{/* Mobile Header - Back arrow and user name on same row */}
						<div className='md:hidden shrink-0 flex items-center gap-3 px-4 py-2 md:py-3 bg-secondary border-b border-border'>
							<button
								onClick={handleBackToConversations}
								className='text-primary hover:text-accent transition-colors min-w-[44px] min-h-[44px] flex items-center justify-center'>
								<FaArrowLeft className='w-5 h-5' />
							</button>
							<div className='flex items-center gap-3 flex-1 min-w-0'>
								{otherUser?.avatar_url ?
									<img
										src={otherUser.avatar_url}
										alt={otherUser.name || "User"}
										className='w-8 h-8 rounded-full object-cover shrink-0'
									/>
								:	<div className='w-8 h-8 rounded-full bg-tertiary flex items-center justify-center shrink-0'>
										<FaUser className='w-4 h-4' />
									</div>
								}
								<p className='font-semibold text-primary truncate'>
									{otherUser?.name || "Unknown User"}
								</p>
							</div>
						</div>

						{/* Desktop Header */}
						<div className='hidden md:flex items-center gap-3 pb-4 border-b border-border'>
							{otherUser?.avatar_url ?
								<img
									src={otherUser.avatar_url}
									alt={otherUser.name || "User"}
									className='w-10 h-10 rounded-full object-cover'
								/>
							:	<div className='w-10 h-10 rounded-full bg-tertiary flex items-center justify-center'>
									<FaUser className='w-5 h-5' />
								</div>
							}
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
												isOwn ?
													"bg-accent text-bg-secondary"
												:	"bg-tertiary text-primary"
											}`}>
											<p className='wrap-break-word'>{message.content}</p>
										</div>
									</div>
								);
							})}
						</div>

						{/* Input Form */}
						{isOtherUserInactive ?
							<div className='flex items-center justify-center gap-2 shrink-0 bg-secondary border-t md:border-t-0 border-border p-2 md:p-0'>
								<p className='text-sm text-secondary text-center'>
									This user's account has been deactivated. You cannot send
									messages.
								</p>
							</div>
						:	<form
								onSubmit={handleSubmit(onSubmit)}
								className='flex items-center gap-2 shrink-0 bg-secondary border-t md:border-t-0 border-border p-2 md:p-0'>
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
						}
					</>
				:	<EmptyState
						icon={<FaComment className='w-16 h-16' />}
						title='No conversation selected'
						message='Select a conversation from the list to start messaging, or start a new conversation using the search above.'
					/>
				}
			</div>
		</div>
	);
};
