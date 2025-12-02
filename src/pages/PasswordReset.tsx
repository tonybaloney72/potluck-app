import { useForm } from "react-hook-form";
import { useNavigate, Link } from "react-router";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { useAppDispatch, useAppSelector } from "../store/hooks";
import { updatePassword } from "../store/slices/authSlice";
import { Input } from "../components/common/Input";
import { Button } from "../components/common/Button";
import { motion, AnimatePresence } from "motion/react";
import { useEffect, useState } from "react";
import { supabase } from "../services/supabase";

// Zod schema for password reset validation
const passwordResetSchema = z
	.object({
		password: z.string().min(8, "Password must be at least 8 characters"),
		confirmPassword: z.string().min(1, "Please confirm your password"),
	})
	.refine(data => data.password === data.confirmPassword, {
		message: "Passwords do not match",
		path: ["confirmPassword"],
	});

type PasswordResetFormData = z.infer<typeof passwordResetSchema>;

export const PasswordReset = () => {
	const navigate = useNavigate();
	const dispatch = useAppDispatch();
	const { loading, error } = useAppSelector(state => state.auth);
	const [isValidSession, setIsValidSession] = useState<boolean | null>(null);

	// Check if user has a valid recovery session from the password reset link
	useEffect(() => {
		const checkSession = async () => {
			// Check for hash fragments in URL (Supabase recovery tokens)
			const hashParams = new URLSearchParams(window.location.hash.substring(1));
			const hasRecoveryToken =
				hashParams.has("access_token") || hashParams.has("type");

			// Give Supabase a moment to process hash fragments if they exist
			if (hasRecoveryToken) {
				// Wait a bit for Supabase to process the hash
				await new Promise(resolve => setTimeout(resolve, 500));
			}

			const {
				data: { session },
			} = await supabase.auth.getSession();

			// Check if this is a recovery session by looking at the URL or session metadata
			// Recovery sessions should have type=recovery in the hash, or we can check if we're on this page
			const isRecoverySession =
				hasRecoveryToken ||
				hashParams.get("type") === "recovery" ||
				window.location.hash.includes("type=recovery");

			if (session && isRecoverySession) {
				// Valid recovery session - allow password reset
				setIsValidSession(true);
			} else if (session && !isRecoverySession) {
				// Regular session (user already logged in) - redirect to home
				navigate("/");
			} else {
				// No valid session - show error
				setIsValidSession(false);
				setTimeout(() => {
					navigate("/login");
				}, 3000);
			}
		};

		checkSession();
	}, [navigate]);

	const {
		register,
		handleSubmit,
		formState: { errors },
	} = useForm<PasswordResetFormData>({
		resolver: zodResolver(passwordResetSchema),
	});

	const onSubmit = async (data: PasswordResetFormData) => {
		const result = await dispatch(updatePassword(data.password));
		if (updatePassword.fulfilled.match(result)) {
			// Password updated successfully, redirect to login
			navigate("/login");
		}
	};

	// Show loading while checking session
	if (isValidSession === null) {
		return (
			<div className='h-screen flex items-center justify-center bg-primary'>
				<div className='text-lg'>Verifying reset link...</div>
			</div>
		);
	}

	// Show error if no valid session
	if (isValidSession === false) {
		return (
			<div className='h-screen flex items-center justify-center bg-primary'>
				<motion.div
					initial={{ opacity: 0, y: 20 }}
					animate={{ opacity: 1, y: 0 }}
					className='md:max-w-md w-full space-y-4 md:space-y-8 px-4 md:px-8 py-8 bg-secondary border border-border rounded-lg shadow h-full md:h-auto flex flex-col justify-center items-center md:block'>
					<h1 className='text-2xl font-bold text-primary'>
						Invalid or Expired Link
					</h1>
					<p className='text-secondary mb-4'>
						This password reset link is invalid or has expired. Please request a
						new one.
					</p>
					<Link
						to='/login'
						className='inline-block text-accent hover:text-accent-secondary hover:underline'>
						Back to Login
					</Link>
				</motion.div>
			</div>
		);
	}

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
						Reset Password
					</h1>
					<p className='text-sm text-secondary text-center'>
						Enter your new password below.
					</p>
					<form onSubmit={handleSubmit(onSubmit)} className='space-y-4 w-full'>
						<Input
							label='New Password'
							type='password'
							{...register("password")}
							error={errors.password?.message}
						/>
						<Input
							label='Confirm Password'
							type='password'
							{...register("confirmPassword")}
							error={errors.confirmPassword?.message}
						/>
						{error && (
							<p className='text-sm text-red-500 text-center'>{error}</p>
						)}
						<Button type='submit' loading={loading} className='w-full'>
							Update Password
						</Button>
					</form>
					<p className='text-center text-sm text-secondary'>
						Remember your password?{" "}
						<Link
							to='/login'
							className='text-accent hover:text-accent-secondary hover:underline'>
							Sign in
						</Link>
					</p>
				</motion.div>
			</AnimatePresence>
		</div>
	);
};
