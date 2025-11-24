import { useForm } from "react-hook-form";
import { useNavigate, Link } from "react-router";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { useAppDispatch, useAppSelector } from "../store/hooks";
import { signUp } from "../store/slices/authSlice";
import { Input } from "../components/common/Input";
import { Button } from "../components/common/Button";
import { motion, AnimatePresence } from "motion/react";

// Zod schema: name cannot contain numbers, same validation as ProfilePage
const registerSchema = z
	.object({
		name: z
			.string()
			.min(2, "Name must be at least 2 characters")
			.regex(
				/^[a-zA-Z\s'-]+$/,
				"Name cannot contain numbers or special characters",
			),
		email: z
			.string()
			.min(1, "Email is required")
			.email("Invalid email address"),
		password: z.string().min(6, "Password must be at least 6 characters"),
		confirmPassword: z.string().min(1, "Please confirm your password"),
	})
	.refine(data => data.password === data.confirmPassword, {
		message: "Passwords do not match",
		path: ["confirmPassword"], // This error will show on confirmPassword field
	});

type RegisterFormData = z.infer<typeof registerSchema>;

export const RegisterPage = () => {
	const navigate = useNavigate();
	const dispatch = useAppDispatch();
	const { loading, error } = useAppSelector(state => state.auth);

	const {
		register,
		handleSubmit,
		formState: { errors },
	} = useForm<RegisterFormData>({
		resolver: zodResolver(registerSchema),
	});

	const onSubmit = async (data: RegisterFormData) => {
		const { confirmPassword, ...signUpData } = data;
		const result = await dispatch(signUp(signUpData));
		if (signUp.fulfilled.match(result)) {
			navigate("/email-verification");
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
					<h1 className='text-3xl font-bold text-center text-primary'>
						Sign Up
					</h1>
					<form onSubmit={handleSubmit(onSubmit)} className='space-y-4'>
						<Input
							label='Name'
							type='text'
							{...register("name")}
							error={errors.name?.message}
						/>
						<Input
							label='Email'
							type='email'
							{...register("email")}
							error={errors.email?.message}
						/>
						<Input
							label='Password'
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
						<Button type='submit' loading={loading} className='w-full'>
							Sign Up
						</Button>
						{error && (
							<p className='text-sm text-red-500 text-center'>{error}</p>
						)}
					</form>
					<p className='text-center text-sm text-secondary'>
						Already have an account?{" "}
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
