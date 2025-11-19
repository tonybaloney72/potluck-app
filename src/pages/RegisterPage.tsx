import { useState } from "react";
import { useNavigate, Link } from "react-router";
import { useAppDispatch, useAppSelector } from "../store/hooks";
import { signUp } from "../store/slices/authSlice";
import { Input } from "../components/common/Input";
import { Button } from "../components/common/Button";

export const RegisterPage = () => {
	const [email, setEmail] = useState("");
	const [password, setPassword] = useState("");
	const [name, setName] = useState("");
	const navigate = useNavigate();
	const dispatch = useAppDispatch();
	const { loading, error } = useAppSelector(state => state.auth);

	const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
		e.preventDefault();
		const result = await dispatch(signUp({ email, password, name }));
		if (signUp.fulfilled.match(result)) {
			navigate("/");
		}
	};

	return (
		<div className='min-h-screen flex items-center justify-center bg-gray-50'>
			<div className='max-w-md w-full space-y-8 p-8 bg-white rounded-lg shadow'>
				<h1 className='text-3xl font-bold text-center'>Sign Up</h1>
				<form onSubmit={handleSubmit} className='space-y-4'>
					<Input
						label='Name'
						type='text'
						value={name}
						onChange={e => setName(e.target.value)}
						required
					/>
					<Input
						label='Email'
						type='email'
						value={email}
						onChange={e => setEmail(e.target.value)}
						required
					/>
					<Input
						label='Password'
						type='password'
						value={password}
						onChange={e => setPassword(e.target.value)}
						required
						minLength={6}
					/>
					<Button type='submit' loading={loading} className='w-full'>
						Sign Up
					</Button>
					{error && <p className='text-sm text-red-500 text-center'>{error}</p>}
				</form>
				<p className='text-center text-sm text-gray-600'>
					Already have an account?{" "}
					<Link to='/login' className='text-blue-500 hover:underline'>
						Sign in
					</Link>
				</p>
			</div>
		</div>
	);
};
