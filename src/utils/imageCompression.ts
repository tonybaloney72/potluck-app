/**
 * Compresses and resizes an image file to fit within a maximum file size
 * Uses Canvas API for client-side image processing
 */

interface CompressionOptions {
	maxSizeKB?: number; // Maximum file size in KB (default: 200KB)
	maxWidth?: number; // Maximum width in pixels (default: 800px)
	maxHeight?: number; // Maximum height in pixels (default: 800px)
	quality?: number; // JPEG quality 0-1 (default: 0.8)
}

/**
 * Compresses an image file to fit within the specified constraints
 * @param file - The image file to compress
 * @param options - Compression options
 * @returns A Promise that resolves to a compressed Blob
 */
export async function compressImage(
	file: File,
	options: CompressionOptions = {},
): Promise<Blob> {
	const {
		maxSizeKB = 200,
		maxWidth = 800,
		maxHeight = 800,
		quality = 0.8,
	} = options;

	return new Promise((resolve, reject) => {
		const reader = new FileReader();

		reader.onload = e => {
			const img = new Image();

			img.onload = () => {
				// Calculate new dimensions while maintaining aspect ratio
				let width = img.width;
				let height = img.height;

				if (width > maxWidth || height > maxHeight) {
					const aspectRatio = width / height;

					if (width > height) {
						width = Math.min(width, maxWidth);
						height = width / aspectRatio;
					} else {
						height = Math.min(height, maxHeight);
						width = height * aspectRatio;
					}
				}

				// Create canvas and draw resized image
				const canvas = document.createElement("canvas");
				canvas.width = width;
				canvas.height = height;

				const ctx = canvas.getContext("2d");
				if (!ctx) {
					reject(new Error("Failed to get canvas context"));
					return;
				}

				// Draw image with smoothing for better quality
				ctx.imageSmoothingEnabled = true;
				ctx.imageSmoothingQuality = "high";
				ctx.drawImage(img, 0, 0, width, height);

				// Convert to blob and compress iteratively if needed
				// Always use JPEG for better compression (avatars don't need transparency)
				compressToTargetSize(
					canvas,
					"image/jpeg",
					quality,
					maxSizeKB * 1024, // Convert KB to bytes
					resolve,
					reject,
				);
			};

			img.onerror = () => {
				reject(new Error("Failed to load image"));
			};

			img.src = e.target?.result as string;
		};

		reader.onerror = () => {
			reject(new Error("Failed to read file"));
		};

		reader.readAsDataURL(file);
	});
}

/**
 * Compresses a canvas image to target file size by adjusting quality
 */
function compressToTargetSize(
	canvas: HTMLCanvasElement,
	mimeType: string,
	initialQuality: number,
	targetSizeBytes: number,
	resolve: (blob: Blob) => void,
	reject: (error: Error) => void,
	quality: number = initialQuality,
	minQuality: number = 0.1,
): void {
	canvas.toBlob(
		blob => {
			if (!blob) {
				reject(new Error("Failed to create blob"));
				return;
			}

			// If blob is small enough or quality is too low, return it
			if (blob.size <= targetSizeBytes || quality <= minQuality) {
				resolve(blob);
				return;
			}

			// Reduce quality and try again
			const newQuality = Math.max(quality - 0.1, minQuality);
			compressToTargetSize(
				canvas,
				mimeType,
				initialQuality,
				targetSizeBytes,
				resolve,
				reject,
				newQuality,
				minQuality,
			);
		},
		mimeType || "image/jpeg",
		quality,
	);
}

/**
 * Validates that a file is a supported image type
 * Supported formats: JPEG, PNG, GIF, WebP
 * @param file - The file to validate
 * @returns true if the file is a supported image type, false otherwise
 */
export function isValidImageFile(file: File): boolean {
	const supportedTypes = [
		"image/jpeg",
		"image/jpg", // Some browsers use this instead of image/jpeg
		"image/png",
		"image/gif",
		"image/webp",
	];
	return supportedTypes.includes(file.type.toLowerCase());
}

/**
 * Validates that a file is within the maximum size limit
 * @param file - The file to validate
 * @param maxSizeMB - Maximum file size in MB (default: 10MB)
 * @returns true if the file is within the limit, false otherwise
 */
export function isValidFileSize(file: File, maxSizeMB: number = 10): boolean {
	const maxSizeBytes = maxSizeMB * 1024 * 1024;
	return file.size <= maxSizeBytes;
}
