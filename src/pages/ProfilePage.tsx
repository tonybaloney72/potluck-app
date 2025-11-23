import { useForm } from "react-hook-form";
import { useEffect } from "react";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { useAppDispatch, useAppSelector } from "../store/hooks";
import { updateProfile } from "../store/slices/authSlice";
import { Input } from "../components/common/Input";
import { Button } from "../components/common/Button";
import { LoadingSpinner } from "../components/common/LoadingSpinner";

// Zod schema: no numbers allowed in name or location
const profileSchema = z.object({
	name: z
		.string()
		.min(2, "Name must be at least 2 characters")
		.regex(
			/^[a-zA-Z\s'-]+$/,
			"Name cannot contain numbers or special characters",
		),
	location: z.string().regex(
		/^$|^[a-zA-Z\s'-]+$/, // Allow empty string OR letters/spaces/hyphens/apostrophes
		"Location cannot contain numbers or special characters",
	),
});

type ProfileFormData = z.infer<typeof profileSchema>;

export const ProfilePage = () => {
	const { profile } = useAppSelector(state => state.auth);
	const dispatch = useAppDispatch();

	const {
		register,
		handleSubmit,
		formState: { errors, isDirty, isSubmitting },
		reset,
	} = useForm<ProfileFormData>({
		resolver: zodResolver(profileSchema),
		defaultValues: {
			name: profile?.name || "",
			location: profile?.location || "",
		},
	});

	// Initialize form when profile loads (only when profile ID changes)
	// This handles the case where profile loads after component mounts
	useEffect(() => {
		if (!profile) return; // Early return if no profile (defensive check)

		// Only reset if profile ID actually changed (new profile loaded)
		// This prevents unnecessary resets when profile data updates but ID stays same
		reset(
			{
				name: profile.name || "",
				location: profile.location || "",
			},
			{
				keepDefaultValues: false, // Update default values so isDirty works correctly
				keepErrors: false,
				keepDirty: false,
				keepIsSubmitted: false,
				keepTouched: false,
				keepIsValid: false,
				keepSubmitCount: false,
			},
		);
		// eslint-disable-next-line react-hooks/exhaustive-deps
	}, [profile?.id]); // Only reset when profile ID changes (initial load or user switch)

	const onSubmit = async (data: ProfileFormData) => {
		const result = await dispatch(updateProfile(data));

		// Reset form with saved data to update default values
		// This should make isDirty work correctly for future edits
		if (updateProfile.fulfilled.match(result) && result.payload) {
			reset(
				{
					name: result.payload.name || "",
					location: result.payload.location || "",
				},
				{
					keepDefaultValues: false, // This is key - update defaults so isDirty works
					keepErrors: false,
					keepDirty: false,
					keepIsSubmitted: false,
					keepTouched: false,
					keepIsValid: false,
					keepSubmitCount: false,
				},
			);
		}
	};

	if (!profile)
		return <LoadingSpinner fullScreen message='Loading profile...' />;

	return (
		<div className='max-w-2xl mx-auto p-8'>
			<h1 className=' text-center text-xl sm:text-2xl md:text-3xl font-bold mb-8 text-primary'>
				Profile Settings
			</h1>

			<form onSubmit={handleSubmit(onSubmit)} className='space-y-6'>
				<Input
					label='Name'
					{...register("name")}
					error={errors.name?.message}
				/>
				<Input
					label='Location'
					placeholder='e.g., Los Angeles County'
					{...register("location")}
					error={errors.location?.message}
				/>

				<Button
					variant='primary'
					type='submit'
					loading={isSubmitting ? true : false}
					loadingText='Saving...'
					disabled={!isDirty}>
					Save Changes
				</Button>
			</form>
		</div>
	);
};
