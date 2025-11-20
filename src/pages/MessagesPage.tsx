import { useEffect, useState } from "react";
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
import { useForm } from "react-hook-form";
import { Button } from "../components/common/Button";
import { Input } from "../components/common/Input";
import { LoadingSpinner } from "../components/common/LoadingSpinner";
import { FaUser, FaPaperPlane } from "react-icons/fa";
import { FriendSelectorModal } from "../components/messaging/FriendSelectorModal";
import { BiSolidConversation } from "react-icons/bi";

interface MessageFormData {
	content: string;
}

export const MessagesPage = () => {
	const dispatch = useAppDispatch();
	const location = useLocation();
	const { messages, loading, error } = useAppSelector(state => state.messages);
	const {
		conversations,
		loading: conversationsLoading,
		creatingConversation,
	} = useAppSelector(state => state.conversations);
	const { profile } = useAppSelector(state => state.auth);
	const [selectedConversationId, setSelectedConversationId] = useState<
		string | null
	>(null);
	const [hasLoaded, setHasLoaded] = useState(false);
	const [showFriendSelector, setShowFriendSelector] = useState(false);
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
		if (selectedConversationId) {
			dispatch(fetchMessages(selectedConversationId));
			dispatch(markMessagesAsRead(selectedConversationId));
		}
	}, [selectedConversationId, dispatch]);

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

	const handleSelectFriend = async (friendId: string) => {
		const result = await dispatch(getOrCreateConversation(friendId));
		if (getOrCreateConversation.fulfilled.match(result)) {
			setSelectedConversationId(result.payload.id);
		}
	};

	// Show loading only on initial load when we have no data
	if (
		(conversationsLoading || loading) &&
		!hasLoaded &&
		conversations.length === 0
	) {
		return <LoadingSpinner fullScreen message='Loading conversations...' />;
	}

	const selectedConversation = conversations.find(
		c => c.id === selectedConversationId,
	);
	const otherUser = selectedConversation
		? selectedConversation.user1_id === profile?.id
			? selectedConversation.user2
			: selectedConversation.user1
		: null;

	return (
		<div className='max-w-6xl mx-auto p-8 h-[calc(100vh-8rem)] flex gap-4'>
			{/* Conversations List */}
			<div className='w-1/3 border-r border-border pr-4 overflow-y-auto flex flex-col gap-4'>
				<h2 className='text-xl font-semibold text-text-primary'>
					Conversations
				</h2>
				<Button
					className='flex items-center gap-2'
					variant='secondary'
					onClick={() => setShowFriendSelector(true)}
					loading={creatingConversation}>
					<BiSolidConversation />
					New Conversation
				</Button>
				<FriendSelectorModal
					isOpen={showFriendSelector}
					onClose={() => setShowFriendSelector(false)}
					onSelectFriend={handleSelectFriend}
				/>
				{error && (
					<div className='mb-4 p-3 bg-red-500/10 border border-red-500 rounded-lg'>
						<p className='text-sm text-red-500'>{error}</p>
					</div>
				)}
				{conversations.length === 0 ? (
					<div className='text-center py-8'>
						<p className='text-text-secondary mb-2'>No conversations yet.</p>
						<p className='text-sm text-text-tertiary'>
							Start a conversation from your Friends page!
						</p>
					</div>
				) : (
					<div className='space-y-2'>
						{conversations.map(conversation => {
							const otherUser =
								conversation.user1_id === profile?.id
									? conversation.user2
									: conversation.user1;

							return (
								<button
									key={conversation.id}
									onClick={() => setSelectedConversationId(conversation.id)}
									className={`hover:cursor-pointer w-full text-left p-3 rounded-lg transition-colors ${
										selectedConversationId === conversation.id
											? "bg-accent text-bg-secondary"
											: "bg-secondary hover:bg-tertiary text-text-primary"
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
													<span className='bg-accent text-bg-secondary rounded-full text-xs px-2 py-0.5 ml-2'>
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
			<div className='flex-1 flex flex-col'>
				{selectedConversationId && otherUser ? (
					<>
						<div className='flex-1 overflow-y-auto mb-4 space-y-4'>
							{messages.map(message => {
								const isOwn = message.sender_id === profile?.id;
								return (
									<div
										key={message.id}
										className={`flex ${
											isOwn ? "justify-end" : "justify-start"
										}`}>
										<div
											className={`max-w-xs p-3 rounded-lg ${
												isOwn
													? "bg-accent text-bg-secondary"
													: "bg-tertiary text-text-primary"
											}`}>
											<p>{message.content}</p>
											<p
												className={`text-xs mt-1 ${
													isOwn ? "text-bg-secondary/70" : "text-text-secondary"
												}`}>
												{new Date(message.created_at).toLocaleTimeString()}
											</p>
										</div>
									</div>
								);
							})}
						</div>
						<form onSubmit={handleSubmit(onSubmit)} className='flex gap-2'>
							<Input
								placeholder='Type a message...'
								{...register("content", {
									required: "Message cannot be empty",
								})}
								error={errors.content?.message}
								className='flex-1'
							/>
							<Button type='submit' loading={loading}>
								<FaPaperPlane className='w-4 h-4' />
							</Button>
						</form>
					</>
				) : (
					<div className='flex-1 flex items-center justify-center text-text-secondary'>
						Select a conversation to start messaging
					</div>
				)}
			</div>
		</div>
	);
};
