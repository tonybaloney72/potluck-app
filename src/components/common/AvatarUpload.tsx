import { useState, useCallback, useEffect } from "react";
import { useDropzone } from "react-dropzone";
import Cropper from "react-easy-crop";
import { useAppDispatch, useAppSelector } from "../../store/hooks";
import { uploadAvatar } from "../../store/slices/authSlice";
import { Avatar } from "./Avatar";
import { Button } from "./Button";
import { ErrorDisplay } from "./ErrorDisplay";
import {
	isValidImageFile,
	isValidFileSize,
	compressImage,
} from "../../utils/imageCompression";
import type { Area } from "react-easy-crop";

interface AvatarUploadProps {
	className?: string;
}

/**
 * Creates a circular cropped image from the original image
 */
const createCircularImage = async (
	imageSrc: string,
	pixelCrop: Area,
): Promise<Blob> => {
	return new Promise((resolve, reject) => {
		const image = new Image();
		image.crossOrigin = "anonymous";
		image.src = imageSrc;

		image.onload = () => {
			const canvas = document.createElement("canvas");
			const ctx = canvas.getContext("2d");

			if (!ctx) {
				reject(new Error("Failed to get canvas context"));
				return;
			}

			// Set canvas size to crop size
			canvas.width = pixelCrop.width;
			canvas.height = pixelCrop.height;

			// Draw the cropped image
			ctx.drawImage(
				image,
				pixelCrop.x,
				pixelCrop.y,
				pixelCrop.width,
				pixelCrop.height,
				0,
				0,
				pixelCrop.width,
				pixelCrop.height,
			);

			// Create circular mask
			const maskCanvas = document.createElement("canvas");
			maskCanvas.width = pixelCrop.width;
			maskCanvas.height = pixelCrop.height;
			const maskCtx = maskCanvas.getContext("2d");

			if (!maskCtx) {
				reject(new Error("Failed to get mask canvas context"));
				return;
			}

			// Draw circular mask
			maskCtx.beginPath();
			maskCtx.arc(
				pixelCrop.width / 2,
				pixelCrop.height / 2,
				Math.min(pixelCrop.width, pixelCrop.height) / 2,
				0,
				2 * Math.PI,
			);
			maskCtx.fillStyle = "white";
			maskCtx.fill();

			// Apply mask to original canvas
			ctx.globalCompositeOperation = "destination-in";
			ctx.drawImage(maskCanvas, 0, 0);

			// Convert to blob
			canvas.toBlob(
				blob => {
					if (blob) {
						resolve(blob);
					} else {
						reject(new Error("Failed to create blob"));
					}
				},
				"image/jpeg",
				0.95,
			);
		};

		image.onerror = () => {
			reject(new Error("Failed to load image"));
		};
	});
};

export const AvatarUpload = ({ className = "" }: AvatarUploadProps) => {
	const {
		profile,
		loading: authLoading,
		error: authError,
	} = useAppSelector(state => state.auth);
	const dispatch = useAppDispatch();

	// File selection state
	const [_selectedFile, setSelectedFile] = useState<File | null>(null);
	const [imageSrc, setImageSrc] = useState<string | null>(null);

	// Crop state
	const [crop, setCrop] = useState({ x: 0, y: 0 });
	const [zoom, setZoom] = useState(1);
	const [croppedAreaPixels, setCroppedAreaPixels] = useState<Area | null>(null);
	const [showCrop, setShowCrop] = useState(false);

	// Upload state
	const [uploadError, setUploadError] = useState<string | null>(null);
	const [isUploading, setIsUploading] = useState(false);
	const [previousAvatarUrl, setPreviousAvatarUrl] = useState<string | null>(
		null,
	);

	// Initialize previous avatar URL when profile loads
	useEffect(() => {
		if (profile?.avatar_url) {
			setPreviousAvatarUrl(profile.avatar_url);
		}
	}, [profile?.id]);

	// Clear crop state when avatar successfully uploads
	useEffect(() => {
		const currentAvatarUrl = profile?.avatar_url || null;
		if (
			currentAvatarUrl &&
			currentAvatarUrl !== previousAvatarUrl &&
			showCrop
		) {
			// Upload succeeded, reset everything
			setShowCrop(false);
			setImageSrc(null);
			setSelectedFile(null);
			setCrop({ x: 0, y: 0 });
			setZoom(1);
			setCroppedAreaPixels(null);
			setPreviousAvatarUrl(currentAvatarUrl);
		} else if (currentAvatarUrl !== previousAvatarUrl) {
			setPreviousAvatarUrl(currentAvatarUrl);
		}
	}, [profile?.avatar_url, previousAvatarUrl, showCrop]);

	// Handle file selection and validation
	const processFile = useCallback((file: File) => {
		// Validate file type
		if (!isValidImageFile(file)) {
			setUploadError(
				"Please select a supported image file (JPG, PNG, GIF, or WebP)",
			);
			setSelectedFile(null);
			setImageSrc(null);
			return;
		}

		// Validate file size (allow up to 10MB before compression)
		if (!isValidFileSize(file, 10)) {
			setUploadError("File size must be less than 10MB");
			setSelectedFile(null);
			setImageSrc(null);
			return;
		}

		// Clear any previous errors
		setUploadError(null);
		setSelectedFile(file);

		// Create image source for cropping
		const reader = new FileReader();
		reader.onloadend = () => {
			setImageSrc(reader.result as string);
			setShowCrop(true);
		};
		reader.onerror = () => {
			setUploadError("Failed to read image file");
			setSelectedFile(null);
			setImageSrc(null);
		};
		reader.readAsDataURL(file);
	}, []);

	// Configure dropzone
	const onDrop = useCallback(
		(acceptedFiles: File[]) => {
			if (acceptedFiles.length > 0) {
				processFile(acceptedFiles[0]);
			}
		},
		[processFile],
	);

	const { getRootProps, getInputProps, isDragActive, isDragReject } =
		useDropzone({
			onDrop,
			accept: {
				"image/*": [".jpeg", ".jpg", ".png", ".gif", ".webp"],
			},
			maxFiles: 1,
			disabled: isUploading || authLoading || showCrop,
			noClick: false,
			noKeyboard: false,
		});

	// Handle crop completion
	const onCropComplete = useCallback(
		(_croppedArea: Area, croppedAreaPixels: Area) => {
			setCroppedAreaPixels(croppedAreaPixels);
		},
		[],
	);

	// Handle cancel crop
	const handleCancelCrop = () => {
		setShowCrop(false);
		setImageSrc(null);
		setSelectedFile(null);
		setCrop({ x: 0, y: 0 });
		setZoom(1);
		setCroppedAreaPixels(null);
		setUploadError(null);
	};

	// Handle final upload after cropping
	const handleUpload = async () => {
		if (!imageSrc || !croppedAreaPixels) return;

		setIsUploading(true);
		setUploadError(null);

		try {
			// Create circular cropped image
			const croppedBlob = await createCircularImage(
				imageSrc,
				croppedAreaPixels,
			);

			// Compress the cropped image
			const compressedBlob = await compressImage(
				new File([croppedBlob], "avatar.jpg", { type: "image/jpeg" }),
				{
					maxSizeKB: 200,
					maxWidth: 800,
					maxHeight: 800,
					quality: 0.8,
				},
			);

			// Convert blob to File for upload
			const finalFile = new File([compressedBlob], "avatar.jpg", {
				type: "image/jpeg",
			});

			// Upload
			const result = await dispatch(uploadAvatar(finalFile));
			if (uploadAvatar.fulfilled.match(result)) {
				// Success - state will be cleared by useEffect
			} else if (uploadAvatar.rejected.match(result)) {
				setUploadError(
					result.error.message || "Failed to upload avatar. Please try again.",
				);
			}
		} catch (error) {
			setUploadError(
				error instanceof Error ?
					error.message
				:	"Failed to upload avatar. Please try again.",
			);
		} finally {
			setIsUploading(false);
		}
	};

	// If showing crop interface
	if (showCrop && imageSrc) {
		return (
			<div className={`mb-4 ${className}`}>
				<div className='rounded-lg border-2 border-border bg-tertiary p-4'>
					<h3 className='text-sm font-medium mb-4 text-primary text-center'>
						Crop Your Avatar
					</h3>

					{/* Crop Container */}
					<div className='relative w-full h-64 sm:h-80 mb-4 bg-tertiary rounded-lg overflow-hidden'>
						<Cropper
							image={imageSrc}
							crop={crop}
							zoom={zoom}
							aspect={1}
							cropShape='round'
							onCropChange={setCrop}
							onZoomChange={setZoom}
							onCropComplete={onCropComplete}
							style={{
								containerStyle: {
									width: "100%",
									height: "100%",
									position: "relative",
								},
							}}
						/>
					</div>

					{/* Zoom Control */}
					<div className='mb-4'>
						<label className='block text-xs text-primary/70 mb-2'>Zoom</label>
						<input
							type='range'
							min={1}
							max={3}
							step={0.1}
							value={zoom}
							onChange={e => setZoom(Number(e.target.value))}
							className='w-full'
							aria-label='Zoom level'
						/>
					</div>

					{/* Action Buttons */}
					<div className='flex gap-2'>
						<Button
							type='button'
							variant='primary'
							onClick={handleUpload}
							loading={isUploading}
							loadingText='Uploading...'
							disabled={authLoading}
							className='flex-1'>
							Save Avatar
						</Button>
						<Button
							type='button'
							variant='secondary'
							onClick={handleCancelCrop}
							disabled={isUploading || authLoading}>
							Cancel
						</Button>
					</div>

					{/* Error Display */}
					{uploadError && (
						<div className='mt-4'>
							<ErrorDisplay message={uploadError} variant='inline' />
						</div>
					)}
				</div>
			</div>
		);
	}

	// Default dropzone view
	return (
		<div className={`mb-4 ${className}`}>
			<div
				{...getRootProps()}
				className={`
					rounded-lg border-2 border-dashed transition-all duration-200 p-4
					${
						isDragActive && !isDragReject ? "border-accent bg-accent/10"
						: isDragReject ? "border-red-500 bg-red-50 dark:bg-red-900/20"
						: "border-border hover:border-accent/50 hover:bg-tertiary"
					}
					${isUploading || authLoading ? "opacity-50 cursor-not-allowed" : "cursor-pointer"}
				`}
				style={{
					pointerEvents: isUploading || authLoading ? "none" : "auto",
				}}>
				<input {...getInputProps()} aria-label='Select avatar image' />
				<div className='flex flex-col items-center gap-2'>
					{/* Avatar Display */}
					<div className='shrink-0'>
						<Avatar user={profile} size='lg' />
					</div>

					{/* Dropzone Content */}
					<div className='flex-1 text-center'>
						{isDragActive ?
							<p className='text-primary font-medium'>
								{isDragReject ?
									"Invalid file type. Please drop an image."
								:	"Drop the image here"}
							</p>
						:	<div className='flex flex-col items-center gap-1'>
								<p className='text-primary font-medium'>
									{profile?.avatar_url ?
										"Drag & drop to change avatar, or click to select"
									:	"Drag & drop an image or click to select"}
								</p>
								<p className='text-xs text-primary/70'>
									Supports: JPG, PNG, GIF, WebP (max 10MB)
								</p>
							</div>
						}
					</div>
				</div>
			</div>

			{/* Error Display */}
			{uploadError && (
				<div className='mt-4'>
					<ErrorDisplay message={uploadError} variant='inline' />
				</div>
			)}
			{authError && uploadError !== authError && (
				<div className='mt-4'>
					<ErrorDisplay message={authError} variant='inline' />
				</div>
			)}
		</div>
	);
};
