import { useEffect, useState } from "react";
import { useAppDispatch, useAppSelector } from "../store/hooks";
import {
	fetchConversations,
	fetchMessages,
	sendMessage,
	markMessagesAsRead,
} from "../store/slices/messagesSlice";
import { fetchFriendships } from "../store/slices/friendsSlice";
import { useForm } from "react-hook-form";
import { Button } from "../components/common/Button";
import { Input } from "../components/common/Input";
import { LoadingSpinner } from "../components/common/LoadingSpinner";
import { FaUser, FaPaperPlane } from "react-icons/fa";
import { areFriends } from "../utils/friendship";
import { FriendSelectorModal } from "../components/messaging/FriendSelectorModal";

interface MessageFormData {
	content: string;
}

export const MessagesPage = () => {
	const dispatch = useAppDispatch();
	const { conversations, loading, error } = useAppSelector(
		state => state.messages,
	);
	const { profile } = useAppSelector(state => state.auth);
	const { friendships } = useAppSelector(state => state.friends);
	const [selectedUserId, setSelectedUserId] = useState<string | null>(null);
	const [hasLoaded, setHasLoaded] = useState(false);
	const [showFriendSelector, setShowFriendSelector] = useState(false);

	const {
		register,
		handleSubmit,
		reset,
		formState: { errors },
	} = useForm<MessageFormData>();

	useEffect(() => {
		// Fetch friendships first (needed for conversation filtering)
		dispatch(fetchFriendships()).then(() => {
			// Then fetch conversations (which will filter by friends)
			dispatch(fetchConversations()).then(() => {
				setHasLoaded(true);
			});
		});
	}, [dispatch]);

	useEffect(() => {
		if (selectedUserId) {
			dispatch(fetchMessages(selectedUserId));
			dispatch(markMessagesAsRead(selectedUserId));
		}
	}, [selectedUserId, dispatch]);

	const onSubmit = async (data: MessageFormData) => {
		if (!selectedUserId) return;
		await dispatch(
			sendMessage({ receiverId: selectedUserId, content: data.content }),
		);
		reset();
	};

	const conversationList = Object.keys(conversations);

	// Show loading only on initial load, not when there are no conversations
	if (loading && !hasLoaded) {
		return <LoadingSpinner fullScreen message='Loading conversations...' />;
	}

	const selectedMessages = selectedUserId
		? conversations[selectedUserId] || []
		: [];

	// Check if selected user is a friend
	const isSelectedUserFriend =
		selectedUserId && profile
			? areFriends(friendships, profile.id, selectedUserId)
			: false;

	return (
		<div className='max-w-6xl mx-auto p-8 h-[calc(100vh-8rem)] flex gap-4'>
			{/* Conversations List */}
			<div className='w-1/3 border-r border-border pr-4 overflow-y-auto'>
				<h2 className='text-xl font-semibold mb-4 text-text-primary'>
					Conversations
				</h2>
				<Button onClick={() => setShowFriendSelector(true)}>
					New Conversation
				</Button>
				<FriendSelectorModal
					isOpen={showFriendSelector}
					onClose={() => setShowFriendSelector(false)}
					onSelectFriend={setSelectedUserId}
				/>
				{error && (
					<div className='mb-4 p-3 bg-red-500/10 border border-red-500 rounded-lg'>
						<p className='text-sm text-red-500'>{error}</p>
					</div>
				)}
				{conversationList.length === 0 ? (
					<div className='text-center py-8'>
						<p className='text-text-secondary mb-2'>No conversations yet.</p>
						<p className='text-sm text-text-tertiary'>
							Start a conversation from your Friends page!
						</p>
					</div>
				) : (
					<div className='space-y-2'>
						{conversationList.map(userId => {
							const messages = conversations[userId];
							const lastMessage = messages[messages.length - 1];
							const otherUser =
								lastMessage.sender_id === profile?.id
									? lastMessage.receiver
									: lastMessage.sender;

							return (
								<button
									key={userId}
									onClick={() => setSelectedUserId(userId)}
									className={`w-full text-left p-3 rounded-lg transition-colors ${
										selectedUserId === userId
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
											<p className='font-medium truncate'>
												{otherUser?.name || "Unknown User"}
											</p>
											<p className='text-sm truncate opacity-75'>
												{lastMessage.content}
											</p>
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
				{selectedUserId ? (
					<>
						<div className='flex-1 overflow-y-auto mb-4 space-y-4'>
							{selectedMessages.map(message => {
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
						{isSelectedUserFriend ? (
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
						) : (
							<div className='p-4 bg-tertiary rounded-lg border border-border'>
								<p className='text-text-secondary text-sm text-center'>
									You can only message your friends. Add this user as a friend
									from the Friends page to start messaging.
								</p>
							</div>
						)}
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
