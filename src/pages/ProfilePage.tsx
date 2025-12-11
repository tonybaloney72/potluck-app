import { useForm } from "react-hook-form";
import { useEffect, useState } from "react";
import { useNavigate } from "react-router";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { useAppDispatch, useAppSelector } from "../store/hooks";
import { updateProfile, clearError } from "../store/slices/authSlice";
import { Input } from "../components/common/Input";
import { Button } from "../components/common/Button";
import { SkeletonProfilePage } from "../components/common/Skeleton";
import { AvatarUpload } from "../components/common/AvatarUpload";
import { Map } from "../components/common/Map";
import { FaArrowLeft } from "react-icons/fa";

// Zod schema: no numbers allowed in name; location is optional object
const profileSchema = z.object({
	name: z
		.string()
		.min(2, "Name must be at least 2 characters")
		.regex(
			/^[a-zA-Z\s'-]+$/,
			"Name cannot contain numbers or special characters",
		),
	location: z
		.object({
			lat: z.number(),
			lng: z.number(),
			address: z.string(),
		})
		.nullable()
		.optional(),
});

type ProfileFormData = z.infer<typeof profileSchema>;

export const ProfilePage = () => {
	const { profile } = useAppSelector(state => state.auth);
	const dispatch = useAppDispatch();
	const navigate = useNavigate();

	const {
		register,
		handleSubmit,
		formState: { errors, isDirty, isSubmitting },
		reset,
		setValue,
	} = useForm<ProfileFormData>({
		resolver: zodResolver(profileSchema),
		defaultValues: {
			name: profile?.name || "",
			location: profile?.location || null,
		},
	});

	// Track selected location separately for Map component
	const [selectedLocation, setSelectedLocation] = useState<{
		lat: number;
		lng: number;
		address: string;
	} | null>(profile?.location || null);

	// Clear errors when component mounts
	useEffect(() => {
		dispatch(clearError());
	}, [dispatch]);

	// Initialize form when profile loads (only when profile ID changes)
	// This handles the case where profile loads after component mounts
	useEffect(() => {
		if (!profile) return; // Early return if no profile (defensive check)

		// Only reset if profile ID actually changed (new profile loaded)
		// This prevents unnecessary resets when profile data updates but ID stays same
		const location = profile.location || null;
		reset(
			{
				name: profile.name || "",
				location,
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
		setSelectedLocation(location);

		// eslint-disable-next-line react-hooks/exhaustive-deps
	}, [profile?.id]); // Only reset when profile ID changes (initial load or user switch)

	const onSubmit = async (data: ProfileFormData) => {
		const result = await dispatch(updateProfile(data));

		// Reset form with saved data to update default values
		// This should make isDirty work correctly for future edits
		if (updateProfile.fulfilled.match(result) && result.payload) {
			const location = result.payload.location || null;
			reset(
				{
					name: result.payload.name || "",
					location,
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
			setSelectedLocation(location);
		}
	};

	if (!profile) {
		return <SkeletonProfilePage />;
	}

	return (
		<main id='main-content' className='bg-secondary p-4 md:p-8' role='main'>
			<div className='max-w-2xl mx-auto flex flex-col'>
				<div className='flex items-center justify-between mb-4 md:mb-8 relative'>
					{/* Back Button */}
					<button
						onClick={() => navigate(-1)}
						className='text-primary hover:text-accent transition-colors min-w-[44px] min-h-[44px] flex items-center justify-center hover:cursor-pointer hover:bg-tertiary rounded-md'
						aria-label='Go back'
						type='button'>
						<FaArrowLeft className='w-5 h-5' />
					</button>

					{/* Centered Title */}
					<h1 className='absolute left-1/2 transform -translate-x-1/2 text-center text-2xl md:text-3xl font-bold text-primary'>
						Profile Settings
					</h1>

					{/* Spacer for balance */}
					<div className='min-w-[44px]' aria-hidden='true' />
				</div>

				{/* Avatar Upload Section */}
				<AvatarUpload />

				<form onSubmit={handleSubmit(onSubmit)} className='space-y-6'>
					<Input
						label='Name'
						{...register("name")}
						error={errors.name?.message}
						helperText='Your display name (letters, spaces, hyphens, and apostrophes only)'
					/>
					<Map
						label='Location'
						onLocationSelect={location => {
							setSelectedLocation(location);
							setValue("location", location, {
								shouldValidate: true,
								shouldDirty: true,
							});
						}}
						selectedLocation={selectedLocation}
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
		</main>
	);
};
