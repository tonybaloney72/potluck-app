import { useState } from "react";
import { useAppDispatch, useAppSelector } from "../store/hooks";
import { updateProfile } from "../store/slices/authSlice";
import { useTheme } from "../context/ThemeContext";
import { Input } from "../components/common/Input";
import { Button } from "../components/common/Button";
import type { ThemePreference } from "../types";

export const ProfilePage = () => {
	const { profile, loading } = useAppSelector(state => state.auth);
	const dispatch = useAppDispatch();
	const { setTheme } = useTheme();
	const [name, setName] = useState(profile?.name || "");
	const [location, setLocation] = useState(profile?.location || "");

	const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
		e.preventDefault();
		await dispatch(updateProfile({ name, location }));
	};

	const handleThemeChange = (theme: ThemePreference) => {
		setTheme(theme);
	};

	if (!profile) return <div>Loading...</div>;

	return (
		<div className='max-w-2xl mx-auto p-8'>
			<h1 className='text-3xl font-bold mb-8'>Profile Settings</h1>

			<form onSubmit={handleSubmit} className='space-y-6'>
				<Input
					label='Name'
					value={name}
					onChange={e => setName(e.target.value)}
				/>
				<Input
					label='Location'
					value={location}
					onChange={e => setLocation(e.target.value)}
					placeholder='e.g., Los Angeles County'
				/>
			</form>

			<div className='my-8'>
				<h2 className='text-xl font-semibold mb-4'>Theme Preference</h2>
				<div className='flex gap-2'>
					<Button
						variant='toggle'
						active={profile.theme_preference === "light"}
						onClick={() => handleThemeChange("light")}>
						Light
					</Button>
					<Button
						variant='toggle'
						active={profile.theme_preference === "dark"}
						onClick={() => handleThemeChange("dark")}>
						Dark
					</Button>
					<Button
						variant='toggle'
						active={profile.theme_preference === "system"}
						onClick={() => handleThemeChange("system")}>
						System
					</Button>
				</div>
			</div>
			<Button variant='primary' type='submit' loading={loading}>
				Save Changes
			</Button>
		</div>
	);
};
