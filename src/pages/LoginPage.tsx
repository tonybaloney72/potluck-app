import { useState } from "react";
import { useNavigate, Link } from "react-router";
import { useAppDispatch, useAppSelector } from "../store/hooks";
import { signIn } from "../store/slices/authSlice";
import { Input } from "../components/common/Input";
import { Button } from "../components/common/Button";

export const LoginPage = () => {
	const [email, setEmail] = useState("");
	const [password, setPassword] = useState("");
	const navigate = useNavigate();
	const dispatch = useAppDispatch();
	const { loading, error } = useAppSelector(state => state.auth);

	const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
		e.preventDefault();
		const result = await dispatch(signIn({ email, password }));
		if (signIn.fulfilled.match(result)) {
			navigate("/");
		}
	};

	return (
		<div className='min-h-screen flex items-center justify-center bg-gray-50'>
			<div className='max-w-md w-full space-y-8 p-8 bg-white rounded-lg shadow'>
				<h1 className='text-3xl font-bold text-center'>Login</h1>
				<form onSubmit={handleSubmit} className='space-y-4'>
					<Input
						label='Email'
						type='email'
						value={email}
						onChange={e => setEmail(e.target.value)}
						required
						error={error || undefined}
					/>
					<Input
						label='Password'
						type='password'
						value={password}
						onChange={e => setPassword(e.target.value)}
						required
					/>
					<Button type='submit' loading={loading} className='w-full'>
						Sign In
					</Button>
				</form>
				<p className='text-center text-sm text-gray-600'>
					Don't have an account?{" "}
					<Link to='/register' className='text-blue-500 hover:underline'>
						Sign up
					</Link>
				</p>
			</div>
		</div>
	);
};
