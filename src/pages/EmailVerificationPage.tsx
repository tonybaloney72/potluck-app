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
			<div className='h-screen flex items-center justify-center bg-primary'>
				<div className='text-lg'>Loading...</div>
			</div>
		);
	}

	return (
		<div className='h-screen flex items-center justify-center bg-primary'>
			<div className='max-w-md w-full space-y-8 p-8 bg-secondary border border-border rounded-lg shadow'>
				<h1 className='text-3xl font-bold text-center text-primary'>
					Email Verification
				</h1>
				<p className='text-center text-sm text-gray-600'>
					Please check your email for a verification link.
				</p>
			</div>
		</div>
	);
};
