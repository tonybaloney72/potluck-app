import { useEffect } from "react";
import { useNavigate } from "react-router";
import { useAppDispatch, useAppSelector } from "../store/hooks";
import { reactivateAccount, clearError } from "../store/slices/authSlice";
import { Button } from "../components/common/Button";
import { ErrorDisplay } from "../components/common/ErrorDisplay";
import { motion } from "motion/react";

export const ReactivateAccountPage = () => {
	const navigate = useNavigate();
	const dispatch = useAppDispatch();
	const { loading, error, profile } = useAppSelector(state => state.auth);

	useEffect(() => {
		dispatch(clearError());
	}, [dispatch]);

	// Redirect to home if account is already active
	useEffect(() => {
		if (profile?.active) {
			navigate("/", { replace: true });
		}
	}, [profile?.active, navigate]);

	const handleReactivate = async () => {
		const result = await dispatch(reactivateAccount());
		if (reactivateAccount.fulfilled.match(result)) {
			// Navigate to home after successful reactivation
			navigate("/", { replace: true });
		}
	};

	return (
		<div className='flex h-full items-center justify-center bg-primary px-2'>
			<motion.div
				initial={{ opacity: 0, y: 20 }}
				animate={{ opacity: 1, y: 0 }}
				transition={{ duration: 0.3 }}
				className='md:max-w-md w-full sm:w-[400px] px-4 md:px-8 py-8 bg-secondary md:border md:border-border md:rounded-lg md:shadow md:h-auto flex flex-col gap-2 md:gap-4 justify-center items-center'>
				<div className='text-center space-y-4'>
					<h1 className='text-3xl font-bold text-primary'>
						Account Deactivated
					</h1>
					<p className='text-secondary'>
						Your account has been deactivated. Would you like to reactivate it
						now?
					</p>
				</div>

				{error && (
					<ErrorDisplay message={error} variant='inline' className='mb-4' />
				)}

				<div className='space-y-4'>
					<Button
						type='button'
						variant='primary'
						onClick={handleReactivate}
						loading={loading}
						loadingText='Reactivating...'
						className='w-full'>
						Reactivate Account
					</Button>
					<Button
						type='button'
						variant='secondary'
						onClick={() => {
							dispatch(clearError());
							navigate("/login");
						}}
						disabled={loading}
						className='w-full'>
						Cancel
					</Button>
				</div>
			</motion.div>
		</div>
	);
};
