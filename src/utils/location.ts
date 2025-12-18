interface LocationData {
	lat: number;
	lng: number;
	address: string;
	timestamp?: number; // When location was obtained
}

const BROWSER_LOCATION_KEY = "browser_location";
const LOCATION_MAX_AGE = 60 * 60 * 1000; // 1 hour in milliseconds

/**
 * Get browser location from geolocation API
 */
export const getBrowserLocation = (): Promise<LocationData> => {
	return new Promise((resolve, reject) => {
		if (!navigator.geolocation) {
			reject(new Error("Geolocation is not supported by this browser"));
			return;
		}

		navigator.geolocation.getCurrentPosition(
			async position => {
				const { latitude, longitude } = position.coords;

				// Reverse geocode to get address
				try {
					const address = await reverseGeocode(latitude, longitude);
					const location: LocationData = {
						lat: latitude,
						lng: longitude,
						address,
						timestamp: Date.now(),
					};

					// Store in localStorage
					localStorage.setItem(BROWSER_LOCATION_KEY, JSON.stringify(location));
					resolve(location);
				} catch (error) {
					// If geocoding fails, still return coordinates
					const location: LocationData = {
						lat: latitude,
						lng: longitude,
						address: `${latitude.toFixed(4)}, ${longitude.toFixed(4)}`,
						timestamp: Date.now(),
					};
					localStorage.setItem(BROWSER_LOCATION_KEY, JSON.stringify(location));
					resolve(location);
				}
			},
			error => {
				reject(error);
			},
			{
				enableHighAccuracy: true,
				timeout: 10000,
				maximumAge: LOCATION_MAX_AGE,
			},
		);
	});
};

/**
 * Check geolocation permission status
 * Returns: 'granted' | 'denied' | 'prompt' | null (if API not available)
 */
export const checkGeolocationPermission = async (): Promise<
	"granted" | "denied" | "prompt" | null
> => {
	// Check if Permissions API is available
	if (!navigator.permissions) {
		return null; // API not available, can't check
	}

	try {
		const permissionStatus = await navigator.permissions.query({
			name: "geolocation" as PermissionName,
		});
		return permissionStatus.state as "granted" | "denied" | "prompt";
	} catch (error) {
		// Permissions API might not support geolocation query in some browsers
		console.error("Failed to check geolocation permission:", error);
		return null;
	}
};

/**
 * Get stored browser location from localStorage if it's recent
 */
export const getStoredBrowserLocation = (): LocationData | null => {
	try {
		const stored = localStorage.getItem(BROWSER_LOCATION_KEY);
		if (!stored) return null;

		const location: LocationData = JSON.parse(stored);
		if (!location.timestamp) return null;

		// Check if location is still fresh (less than 1 hour old)
		const age = Date.now() - location.timestamp;
		if (age > LOCATION_MAX_AGE) {
			localStorage.removeItem(BROWSER_LOCATION_KEY);
			return null;
		}

		return location;
	} catch {
		return null;
	}
};

/**
 * Reverse geocode coordinates to address
 */
async function reverseGeocode(lat: number, lng: number): Promise<string> {
	const apiKey = import.meta.env.VITE_GEOAPIFY_API_KEY;
	if (!apiKey) {
		throw new Error("Geoapify API key is not configured");
	}

	const url = `https://api.geoapify.com/v1/geocode/reverse?lat=${lat}&lon=${lng}&apiKey=${apiKey}`;

	try {
		const response = await fetch(url);
		if (!response.ok) {
			throw new Error(`Reverse geocoding failed: ${response.statusText}`);
		}

		const data = await response.json();

		if (data.features && data.features.length > 0) {
			return (
				data.features[0].properties.formatted ||
				`${lat.toFixed(4)}, ${lng.toFixed(4)}`
			);
		}

		return `${lat.toFixed(4)}, ${lng.toFixed(4)}`;
	} catch (error) {
		console.error("Reverse geocoding error:", error);
		return `${lat.toFixed(4)}, ${lng.toFixed(4)}`;
	}
}

/**
 * Calculate distance between two coordinates in miles (Haversine formula)
 */
export const calculateDistance = (
	lat1: number,
	lng1: number,
	lat2: number,
	lng2: number,
): number => {
	const R = 3959; // Earth's radius in miles
	const dLat = ((lat2 - lat1) * Math.PI) / 180;
	const dLng = ((lng2 - lng1) * Math.PI) / 180;
	const a =
		Math.sin(dLat / 2) * Math.sin(dLat / 2) +
		Math.cos((lat1 * Math.PI) / 180) *
			Math.cos((lat2 * Math.PI) / 180) *
			Math.sin(dLng / 2) *
			Math.sin(dLng / 2);
	const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
	return R * c;
};
