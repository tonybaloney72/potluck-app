import { useForm } from "react-hook-form";
import { useEffect } from "react";
import { useAppDispatch, useAppSelector } from "../store/hooks";
import { updateProfile } from "../store/slices/authSlice";
import { useTheme } from "../context/ThemeContext";
import { Input } from "../components/common/Input";
import { Button } from "../components/common/Button";
import { LoadingSpinner } from "../components/common/LoadingSpinner";
import type { ThemePreference } from "../types";

interface ProfileFormData {
	name: string;
	location: string;
	theme_preference: ThemePreference;
}

export const ProfilePage = () => {
	const { profile, loading } = useAppSelector(state => state.auth);
	const dispatch = useAppDispatch();
	const { setTheme } = useTheme();

	const {
		register,
		handleSubmit,
		formState: { errors },
		reset,
		watch,
		setValue,
	} = useForm<ProfileFormData>({
		defaultValues: {
			name: profile?.name || "",
			location: profile?.location || "",
			theme_preference: profile?.theme_preference || "light",
		},
	});

	const currentTheme = watch("theme_preference");

	useEffect(() => {
		if (profile) {
			reset({
				name: profile.name || "",
				location: profile.location || "",
				theme_preference: profile.theme_preference || "light",
			});
		}
	}, [profile, reset]);

	const onSubmit = async (data: ProfileFormData) => {
		await dispatch(updateProfile(data));
		// Update theme context after saving
		setTheme(data.theme_preference);
	};

	if (!profile)
		return <LoadingSpinner fullScreen message='Loading profile...' />;

	return (
		<div className='max-w-2xl mx-auto p-8'>
			<h1 className=' text-center text-xl sm:text-2xl md:text-3xl font-bold mb-8 text-text-primary'>
				Profile Settings
			</h1>

			<form onSubmit={handleSubmit(onSubmit)} className='space-y-6'>
				<Input
					label='Name'
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
					label='Location'
					placeholder='e.g., Los Angeles County'
					{...register("location")}
					error={errors.location?.message}
				/>

				<div>
					<label className='block text-sm font-medium mb-2 text-text-primary'>
						Theme Preference
					</label>
					<div className='flex gap-2'>
						<Button
							type='button'
							variant='toggle'
							active={currentTheme === "light"}
							onClick={() => setValue("theme_preference", "light")}>
							Light
						</Button>
						<Button
							type='button'
							variant='toggle'
							active={currentTheme === "dark"}
							onClick={() => setValue("theme_preference", "dark")}>
							Dark
						</Button>
						<Button
							type='button'
							variant='toggle'
							active={currentTheme === "system"}
							onClick={() => setValue("theme_preference", "system")}>
							System
						</Button>
					</div>
					<input type='hidden' {...register("theme_preference")} />
				</div>

				<Button variant='primary' type='submit' loading={loading}>
					Save Changes
				</Button>
			</form>
		</div>
	);
};
