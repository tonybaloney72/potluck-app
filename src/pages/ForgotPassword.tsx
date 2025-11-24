import { motion, AnimatePresence } from "motion/react";
import { Button } from "../components/common/Button";
import { Input } from "../components/common/Input";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { resetPassword } from "../store/slices/authSlice";
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
	const { loading, error } = useAppSelector(state => state.auth);

	const {
		register,
		handleSubmit,
		formState: { errors },
	} = useForm<ForgotPasswordFormData>({
		resolver: zodResolver(forgotPasswordSchema),
	});

	const onSubmit = async (data: ForgotPasswordFormData) => {
		const result = await dispatch(resetPassword(data.email));
		if (resetPassword.fulfilled.match(result)) {
			// Show success message or navigate
			navigate("/login");
		}
	};

	return (
		<div className='h-screen flex items-center justify-center bg-primary'>
			<AnimatePresence>
				<motion.div
					initial={{ opacity: 0, y: 20 }}
					animate={{ opacity: 1, y: 0 }}
					exit={{ opacity: 0, y: -20 }}
					transition={{ duration: 0.3 }}
					className='max-w-md w-full space-y-8 p-8 bg-secondary border border-border rounded-lg shadow'>
					<h2 className='text-3xl font-bold text-center text-primary'>
						Reset Password
					</h2>
					<p className='text-sm text-secondary mb-4'>
						Enter your email address and we'll send you a link to reset your
						password.
					</p>
					<form onSubmit={handleSubmit(onSubmit)} className='space-y-4'>
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
			</AnimatePresence>
		</div>
	);
};
