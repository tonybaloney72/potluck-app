import { useForm } from "react-hook-form";
import { useNavigate, Link } from "react-router";
import { useAppDispatch, useAppSelector } from "../store/hooks";
import { signUp } from "../store/slices/authSlice";
import { Input } from "../components/common/Input";
import { Button } from "../components/common/Button";

interface RegisterFormData {
	name: string;
	email: string;
	password: string;
	confirmPassword: string;
}

export const RegisterPage = () => {
	const navigate = useNavigate();
	const dispatch = useAppDispatch();
	const { loading, error } = useAppSelector(state => state.auth);

	const {
		register,
		handleSubmit,
		formState: { errors },
		watch,
	} = useForm<RegisterFormData>();

	const password = watch("password");

	const onSubmit = async (data: RegisterFormData) => {
		const { confirmPassword, ...signUpData } = data;
		const result = await dispatch(signUp(signUpData));
		if (signUp.fulfilled.match(result)) {
			navigate("/");
		}
	};

	return (
		<div className='min-h-screen flex items-center justify-center bg-primary'>
			<div className='max-w-md w-full space-y-8 p-8 bg-secondary border border-border rounded-lg shadow'>
				<h1 className='text-3xl font-bold text-center text-text-primary'>
					Sign Up
				</h1>
				<form onSubmit={handleSubmit(onSubmit)} className='space-y-4'>
					<Input
						label='Name'
						type='text'
						{...register("name", {
							required: "Name is required",
							minLength: {
								value: 2,
								message: "Name must be at least 2 characters",
							},
						})}
						error={errors.name?.message}
					/>
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
								value: 6,
								message: "Password must be at least 6 characters",
							},
						})}
						error={errors.password?.message}
					/>
					<Input
						label='Confirm Password'
						type='password'
						{...register("confirmPassword", {
							required: "Please confirm your password",
							validate: value => value === password || "Passwords do not match",
						})}
						error={errors.confirmPassword?.message}
					/>
					<Button type='submit' loading={loading} className='w-full'>
						Sign Up
					</Button>
					{error && <p className='text-sm text-red-500 text-center'>{error}</p>}
				</form>
				<p className='text-center text-sm text-text-secondary'>
					Already have an account?{" "}
					<Link
						to='/login'
						className='text-accent hover:text-accent-secondary hover:underline'>
						Sign in
					</Link>
				</p>
			</div>
		</div>
	);
};
