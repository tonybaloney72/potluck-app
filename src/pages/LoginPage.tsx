import { useForm } from "react-hook-form";
import { useNavigate, Link, useSearchParams } from "react-router";
import { useAppDispatch, useAppSelector } from "../store/hooks";
import { signIn, clearError } from "../store/slices/authSlice";
import { Input } from "../components/common/Input";
import { Button } from "../components/common/Button";
import { ErrorDisplay } from "../components/common/ErrorDisplay";
import { motion, AnimatePresence } from "motion/react";
import { useEffect } from "react";
import { GUEST_EMAIL } from "../utils/auth";

interface LoginFormData {
	email: string;
	password: string;
}

export const LoginPage = () => {
	const navigate = useNavigate();
	const dispatch = useAppDispatch();
	const [searchParams] = useSearchParams();
	const { loading, error, user, initializing } = useAppSelector(
		state => state.auth,
	);
	const guestPassword = import.meta.env.VITE_GUEST_PASSWORD;
	// Clear any previous errors when component mounts
	useEffect(() => {
		dispatch(clearError());
	}, [dispatch]);

	// Redirect to home if already logged in
	useEffect(() => {
		if (user && !initializing) {
			const returnUrl = searchParams.get("returnUrl");
			if (returnUrl) {
				navigate(decodeURIComponent(returnUrl), { replace: true });
			} else {
				navigate("/", { replace: true });
			}
		}
	}, [user, initializing, navigate, searchParams]);

	const {
		register,
		handleSubmit,
		formState: { errors },
	} = useForm<LoginFormData>();

	// Don't show login form while checking auth status
	if (initializing) {
		return (
			<div className='h-screen flex items-center justify-center bg-primary'>
				<div className='text-lg'>Loading...</div>
			</div>
		);
	}

	const onSubmit = async (data: LoginFormData) => {
		const result = await dispatch(signIn(data));
		if (signIn.fulfilled.match(result)) {
			// Check if account is deactivated
			if (result.payload && !result.payload.isActive) {
				// Redirect to reactivate page
				navigate("/reactivate", { replace: true });
			} else {
				// Get the return URL from query params, default to home
				const returnUrl = searchParams.get("returnUrl") || "/";
				// Decode and navigate to the original destination
				navigate(decodeURIComponent(returnUrl), { replace: true });
			}
		}
	};

	const handleGuestLogin = () => {
		dispatch(
			signIn({
				email: GUEST_EMAIL,
				password: guestPassword,
			}),
		);
	};

	return (
		<div className='h-screen flex items-center justify-center bg-primary'>
			<AnimatePresence>
				<motion.div
					initial={{ opacity: 0, y: 20 }}
					animate={{ opacity: 1, y: 0 }}
					exit={{ opacity: 0, y: -20 }}
					transition={{ duration: 0.3 }}
					className='md:max-w-md w-full space-y-4 md:space-y-8 px-4 md:px-8 py-8 bg-secondary border border-border rounded-lg shadow h-full md:h-auto flex flex-col justify-center items-center md:block'>
					<h1 className='text-3xl font-bold text-center text-primary'>
						Potluck
					</h1>
					<form onSubmit={handleSubmit(onSubmit)} className='space-y-4 w-full'>
						{error && (
							<ErrorDisplay message={error} variant='inline' className='mb-4' />
						)}
						<Input
							label='Email'
							type='email'
							{...register("email", {
								required: "Email is required",
								pattern: {
									value: /^[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}$/i,
									message: "Invalid email address",
								},
							})}
							error={errors.email?.message}
						/>
						<Input
							label='Password'
							type='password'
							{...register("password", {
								required: "Password is required",
								minLength: {
									value: 8,
									message: "Password must be at least 8 characters",
								},
							})}
							error={errors.password?.message}
						/>
						<Button type='submit' loading={loading} className='w-full'>
							Sign In
						</Button>
					</form>
					<div className='text-center'>
						<button
							type='button'
							onClick={handleGuestLogin}
							className='text-sm text-accent hover:text-accent-secondary hover:underline hover:cursor-pointer'>
							Sign in as Guest
						</button>
					</div>
					<div className='text-center'>
						<button
							type='button'
							onClick={() => navigate("/forgot-password")}
							className='text-sm text-accent hover:text-accent-secondary hover:underline hover:cursor-pointer'>
							Forgot Password?
						</button>
					</div>
					<p className='text-center text-sm text-secondary'>
						Don't have an account?{" "}
						<Link
							to='/register'
							className='text-accent hover:text-accent-secondary hover:underline'>
							Sign up
						</Link>
					</p>
				</motion.div>
			</AnimatePresence>
		</div>
	);
};
