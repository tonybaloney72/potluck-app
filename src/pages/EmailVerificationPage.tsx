import { useEffect } from "react";
import { useNavigate } from "react-router";
import { useAppSelector } from "../store/hooks";

export const EmailVerificationPage = () => {
	const navigate = useNavigate();
	const { user, initializing } = useAppSelector(state => state.auth);

	// Redirect to home if already logged in (and presumably verified)
	useEffect(() => {
		if (user && !initializing) {
			navigate("/", { replace: true });
		}
	}, [user, initializing, navigate]);

	// Don't show page while checking auth status
	if (initializing) {
		return (
			<div className='flex h-full items-center justify-center bg-primary px-2'>
				<div className='text-lg'>Loading...</div>
			</div>
		);
	}

	return (
		<div className='flex h-full items-center justify-center bg-primary px-2'>
			<div className='md:max-w-md w-full sm:w-[400px] px-4 md:px-8 py-8 bg-secondary md:border md:border-border md:rounded-lg md:shadow md:h-auto flex flex-col gap-2 md:gap-4 justify-center items-center'>
				<h1 className='text-3xl font-bold text-center text-primary'>
					Email Verification
				</h1>
				<p className='text-center text-sm text-secondary'>
					Please check your email for a verification link from Supabase.
				</p>
			</div>
		</div>
	);
};
