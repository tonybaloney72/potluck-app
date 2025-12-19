import { useEffect } from "react";
import { useNavigate } from "react-router";
import { useAppDispatch, useAppSelector } from "../store/hooks";
import {
	fetchPendingRequests,
	fetchUserPendingRequests,
	approvePendingRequest,
	denyPendingRequest,
	rescindPendingRequest,
} from "../store/slices/pendingRequestsSlice";
import { getOrCreateConversation } from "../store/slices/conversationsSlice";
import { Button } from "../components/common/Button";
import { EmptyState } from "../components/common/EmptyState";
import { Skeleton } from "../components/common/Skeleton";
import { ConfirmModal } from "../components/common/ConfirmModal";
import { useState } from "react";
import { FaEnvelope, FaCheck, FaTimes, FaGift, FaUndo } from "react-icons/fa";
import { AnimatedSection } from "../components/common/AnimatedSection";

export const PendingRequestsPage = () => {
	const navigate = useNavigate();
	const dispatch = useAppDispatch();
	const currentUserId = useAppSelector(state => state.auth.user?.id);

	const { pendingRequestsById, requestIds, loading } = useAppSelector(
		state => state.pendingRequests,
	);

	const [approvingId, setApprovingId] = useState<string | null>(null);
	const [denyingId, setDenyingId] = useState<string | null>(null);
	const [rescindingId, setRescindingId] = useState<string | null>(null);
	const [isLoading, setIsLoading] = useState(false);
	const [selectedRequestId, setSelectedRequestId] = useState<string | null>(
		null,
	);
	const [actionType, setActionType] = useState<"deny" | "rescind" | null>(null);

	useEffect(() => {
		// Fetch both host-managed requests and user's own requests
		dispatch(fetchPendingRequests());
		dispatch(fetchUserPendingRequests());
	}, [dispatch]);

	const handleApprove = async (requestId: string) => {
		setApprovingId(requestId);
		try {
			await dispatch(approvePendingRequest({ requestId })).unwrap();
			// Refresh the list
			await dispatch(fetchPendingRequests());
		} catch (error) {
			console.error("Failed to approve request:", error);
		} finally {
			setApprovingId(null);
			setSelectedRequestId(null);
		}
	};

	const handleDeny = async (requestId: string) => {
		setDenyingId(requestId);
		try {
			await dispatch(denyPendingRequest({ requestId })).unwrap();
			// Refresh the list
			await dispatch(fetchPendingRequests());
		} catch (error) {
			console.error("Failed to deny request:", error);
		} finally {
			setDenyingId(null);
			setSelectedRequestId(null);
			setActionType(null);
		}
	};

	const handleRescind = async (requestId: string) => {
		setRescindingId(requestId);
		try {
			await dispatch(rescindPendingRequest({ requestId })).unwrap();
			// Refresh both lists
			await dispatch(fetchPendingRequests());
			await dispatch(fetchUserPendingRequests());
		} catch (error) {
			console.error("Failed to rescind request:", error);
		} finally {
			setRescindingId(null);
			setSelectedRequestId(null);
			setActionType(null);
		}
	};

	const handleMessage = async (userId: string) => {
		setIsLoading(true);
		try {
			const result = (await dispatch(getOrCreateConversation(userId))) as {
				payload: { id: string } | null;
			};
			if (result.payload?.id) {
				navigate(`/messages/${result.payload?.id}`);
			}
		} catch (error) {
			console.error("Failed to create conversation:", error);
			// Show error message to user
		} finally {
			setIsLoading(false);
		}
	};

	// Determine if user is the host or requester for a request
	const isRequester = (request: any) => request.user_id === currentUserId;

	const pendingRequests = requestIds.map(id => pendingRequestsById[id]);

	if (loading) {
		return (
			<main id='main-content' className='bg-secondary p-4 md:p-8' role='main'>
				<div className='max-w-4xl mx-auto'>
					<div className='bg-primary rounded-lg shadow-md p-6'>
						<Skeleton className='h-8 w-64 mb-4' />
						<div className='space-y-4'>
							{Array.from({ length: 3 }).map((_, i) => (
								<Skeleton key={i} className='h-32 w-full' />
							))}
						</div>
					</div>
				</div>
			</main>
		);
	}

	return (
		<main id='main-content' className='bg-secondary p-4 md:p-8' role='main'>
			<div className='max-w-4xl mx-auto'>
				<div className='mb-6'>
					<h1 className='text-2xl md:text-3xl font-bold text-primary mb-2'>
						Pending Contributor Requests
					</h1>
					<p className='text-secondary'>
						Manage requests for your events or view and manage your own pending
						requests.
					</p>
				</div>

				{pendingRequests.length === 0 ?
					<EmptyState
						icon={<FaGift className='w-16 h-16' />}
						title='No pending requests'
						message='You currently have no pending contributor requests. Requests will appear here when users want to join your events as contributors.'
					/>
				:	<div className='space-y-4'>
						{pendingRequests.map((request, index) => (
							<AnimatedSection
								key={request.id}
								delay={index * 0.05}
								className='bg-primary rounded-lg shadow-md p-6'>
								<div className='flex flex-col md:flex-row md:items-start md:justify-between gap-4'>
									<div className='flex-1'>
										<div className='flex items-center gap-3 mb-3'>
											{request.user?.avatar_url ?
												<img
													src={request.user.avatar_url}
													alt={request.user.name || "User"}
													className='w-12 h-12 rounded-full object-cover'
												/>
											:	<div className='w-12 h-12 rounded-full bg-accent flex items-center justify-center text-bg-secondary font-semibold'>
													{request.user?.name?.charAt(0).toUpperCase() || "?"}
												</div>
											}
											<div>
												<h3 className='font-semibold text-primary'>
													{request.user?.name || "Unknown User"}
												</h3>
												<p className='text-sm text-secondary'>
													Event:{" "}
													{(request.event as any)?.title || "Unknown Event"}
												</p>
												{(request.event as any)?.event_datetime && (
													<p className='text-xs text-tertiary'>
														{new Date(
															(request.event as any).event_datetime,
														).toLocaleDateString()}
													</p>
												)}
											</div>
										</div>

										<div className='bg-secondary rounded-lg p-4 mb-3'>
											<h4 className='font-medium text-primary mb-2'>
												Contribution Details:
											</h4>
											<p className='text-primary font-semibold mb-1'>
												{request.item_name}
												{request.quantity && (
													<span className='text-tertiary font-normal ml-2'>
														({request.quantity})
													</span>
												)}
											</p>
											{request.description && (
												<p className='text-sm text-secondary'>
													{request.description}
												</p>
											)}
										</div>

										<div className='text-xs text-tertiary'>
											Requested {new Date(request.created_at).toLocaleString()}
										</div>
									</div>

									<div className='flex flex-col gap-2 md:w-auto w-full'>
										{
											isRequester(request) ?
												// Requester actions: Message host, Rescind request
												<>
													<Button
														variant='secondary'
														onClick={() => {
															// Get host ID from event
															const hostId = (request.event as any)?.created_by;
															if (hostId) handleMessage(hostId);
														}}
														loading={isLoading}
														disabled={rescindingId === request.id || isLoading}
														className='flex items-center justify-center gap-2'>
														<FaEnvelope className='w-4 h-4' />
														Message Host
													</Button>
													<Button
														variant='secondary'
														onClick={() => {
															setSelectedRequestId(request.id);
															setActionType("rescind");
														}}
														loading={rescindingId === request.id}
														disabled={rescindingId === request.id}
														className='flex items-center justify-center gap-2 text-red-500 hover:text-red-600'>
														<FaUndo className='w-4 h-4' />
														Rescind Request
													</Button>
												</>
												// Host actions: Approve, Deny, Message requester
											:	<>
													<Button
														variant='primary'
														onClick={() => handleApprove(request.id)}
														loading={approvingId === request.id}
														disabled={
															approvingId === request.id ||
															denyingId === request.id ||
															rescindingId === request.id
														}
														className='flex items-center justify-center gap-2'>
														<FaCheck className='w-4 h-4' />
														Approve
													</Button>
													<Button
														variant='secondary'
														onClick={() => handleMessage(request.user_id)}
														loading={isLoading}
														disabled={
															approvingId === request.id ||
															denyingId === request.id ||
															rescindingId === request.id ||
															isLoading
														}
														className='flex items-center justify-center gap-2'>
														<FaEnvelope className='w-4 h-4' />
														Message
													</Button>
													<Button
														variant='secondary'
														onClick={() => {
															setSelectedRequestId(request.id);
															setActionType("deny");
														}}
														disabled={
															approvingId === request.id ||
															denyingId === request.id ||
															rescindingId === request.id
														}
														className='flex items-center justify-center gap-2 text-red-500 hover:text-red-600'>
														<FaTimes className='w-4 h-4' />
														Deny
													</Button>
												</>

										}
									</div>
								</div>
							</AnimatedSection>
						))}
					</div>
				}
			</div>

			{/* Confirmation Modals */}
			{selectedRequestId && actionType === "deny" && (
				<ConfirmModal
					isOpen={!!selectedRequestId}
					onClose={() => {
						setSelectedRequestId(null);
						setActionType(null);
					}}
					onConfirm={() => handleDeny(selectedRequestId)}
					title='Deny Contribution Request?'
					message='Are you sure you want to deny this contribution request? The user will be notified.'
					confirmText='Deny Request'
					confirmVariant='secondary'
				/>
			)}
			{selectedRequestId && actionType === "rescind" && (
				<ConfirmModal
					isOpen={!!selectedRequestId}
					onClose={() => {
						setSelectedRequestId(null);
						setActionType(null);
					}}
					onConfirm={() => handleRescind(selectedRequestId)}
					title='Rescind Contribution Request?'
					message='Are you sure you want to rescind your contribution request? This action cannot be undone.'
					confirmText='Rescind Request'
					confirmVariant='secondary'
				/>
			)}
		</main>
	);
};
