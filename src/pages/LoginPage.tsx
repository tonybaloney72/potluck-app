import { useForm } from "react-hook-form";
import { useNavigate, Link } from "react-router";
import { useAppDispatch, useAppSelector } from "../store/hooks";
import { signIn } from "../store/slices/authSlice";
import { Input } from "../components/common/Input";
import { Button } from "../components/common/Button";
import { motion, AnimatePresence } from "motion/react";

interface LoginFormData {
	email: string;
	password: string;
}

export const LoginPage = () => {
	const navigate = useNavigate();
	const dispatch = useAppDispatch();
	const { loading, error } = useAppSelector(state => state.auth);

	const {
		register,
		handleSubmit,
		formState: { errors },
	} = useForm<LoginFormData>();

	const onSubmit = async (data: LoginFormData) => {
		const result = await dispatch(signIn(data));
		if (signIn.fulfilled.match(result)) {
			navigate("/");
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
					<h1 className='text-3xl font-bold text-center text-primary'>Login</h1>
					<form onSubmit={handleSubmit(onSubmit)} className='space-y-4'>
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
							error={errors.email?.message || error || undefined}
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
