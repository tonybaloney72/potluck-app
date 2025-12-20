import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "motion/react";
import { Button } from "../components/common/Button";
import { Input } from "../components/common/Input";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { resetPassword, clearError } from "../store/slices/authSlice";
import { useAppDispatch, useAppSelector } from "../store/hooks";
import { useNavigate } from "react-router";

// Zod schema for email validation
const forgotPasswordSchema = z.object({
	email: z.string().min(1, "Email is required").email("Invalid email address"),
});

type ForgotPasswordFormData = z.infer<typeof forgotPasswordSchema>;

export const ForgotPassword = () => {
	const dispatch = useAppDispatch();
	const navigate = useNavigate();
	const { loading, error, user, initializing } = useAppSelector(
		state => state.auth,
	);
	const [isSent, setIsSent] = useState(false);
	const [sentEmail, setSentEmail] = useState<string>("");

	const {
		register,
		handleSubmit,
		formState: { errors },
		reset,
	} = useForm<ForgotPasswordFormData>({
		resolver: zodResolver(forgotPasswordSchema),
	});

	// Clear any previous errors when component mounts
	useEffect(() => {
		dispatch(clearError());
	}, [dispatch]);

	// Redirect to home if already logged in
	useEffect(() => {
		if (user && !initializing) {
			navigate("/", { replace: true });
		}
	}, [user, initializing, navigate]);

	// Don't show form while checking auth status
	if (initializing) {
		return (
			<div className='h-screen flex items-center justify-center bg-primary'>
				<div className='text-lg'>Loading...</div>
			</div>
		);
	}

	const onSubmit = async (data: ForgotPasswordFormData) => {
		const result = await dispatch(resetPassword(data.email));
		if (resetPassword.fulfilled.match(result)) {
			setSentEmail(data.email);
			setIsSent(true);
		}
	};

	const handleSendAnother = () => {
		setIsSent(false);
		setSentEmail("");
		reset();
	};

	return (
		<div className='flex h-full items-center justify-center bg-primary px-2'>
			<AnimatePresence mode='wait'>
				{isSent ?
					<motion.div
						key='success'
						initial={{ opacity: 0, y: 20 }}
						animate={{ opacity: 1, y: 0 }}
						exit={{ opacity: 0, y: -20 }}
						transition={{ duration: 0.3 }}
						className='md:max-w-md w-full sm:w-[400px] px-4 md:px-8 py-8 bg-secondary md:border md:border-border md:rounded-lg md:shadow md:h-auto flex flex-col gap-2 md:gap-4 justify-center items-center'>
						<div className='text-center space-y-4'>
							<div className='w-16 h-16 mx-auto bg-green-500/20 rounded-full flex items-center justify-center mb-4'>
								<span className='text-green-500 text-3xl'>✓</span>
							</div>
							<h2 className='text-3xl font-bold text-primary'>
								Check your email
							</h2>
							<p className='text-sm text-secondary'>
								We've sent a password reset link to{" "}
								<strong className='text-primary'>{sentEmail}</strong>
							</p>
							<p className='text-xs text-secondary mt-2'>
								Didn't receive it? Check your spam folder or try again.
							</p>
							<div className='flex gap-2 mt-6'>
								<Button
									variant='secondary'
									onClick={handleSendAnother}
									className='flex-1'>
									Send Another
								</Button>
								<Button onClick={() => navigate("/login")} className='flex-1'>
									Back to Login
								</Button>
							</div>
						</div>
					</motion.div>
				:	<motion.div
						key='form'
						initial={{ opacity: 0, y: 20 }}
						animate={{ opacity: 1, y: 0 }}
						exit={{ opacity: 0, y: -20 }}
						transition={{ duration: 0.3 }}
						className='md:max-w-md w-full sm:w-[400px] px-4 md:px-8 py-8 bg-secondary md:border md:border-border md:rounded-lg md:shadow md:h-auto flex flex-col gap-2 md:gap-4 justify-center items-center'>
						<h2 className='text-3xl font-bold text-center text-primary'>
							Reset Password
						</h2>
						<p className='text-sm text-secondary mb-4'>
							Enter your email address and we'll send you a link to reset your
							password.
						</p>
						<form
							onSubmit={handleSubmit(onSubmit)}
							className='space-y-4 w-full'>
							<Input
								label='Email'
								type='email'
								{...register("email")}
								error={errors.email?.message}
							/>
							{error && (
								<p className='text-sm text-red-500 text-center'>{error}</p>
							)}
							<div className='flex gap-2'>
								<Button
									type='button'
									variant='secondary'
									onClick={() => {
										navigate("/login");
									}}
									className='flex-1'>
									Cancel
								</Button>
								<Button type='submit' loading={loading} className='flex-1'>
									Send Reset Link
								</Button>
							</div>
						</form>
					</motion.div>
				}
			</AnimatePresence>
		</div>
	);
};
