import { useState, useMemo, useEffect, useRef } from "react";
import {
	MapContainer,
	TileLayer,
	Marker,
	useMapEvents,
	useMap,
} from "react-leaflet";
import type { LatLngExpression } from "leaflet";
import { Icon } from "leaflet";
import "leaflet/dist/leaflet.css";
// import "@geoapify/geocoder-autocomplete/styles/minimal.css";

// Fix for default marker icon in react-leaflet
import icon from "leaflet/dist/images/marker-icon.png";
import iconShadow from "leaflet/dist/images/marker-shadow.png";

const DefaultIcon = new Icon({
	iconUrl: icon,
	shadowUrl: iconShadow,
	iconSize: [25, 41],
	iconAnchor: [12, 41],
	popupAnchor: [1, -34],
	shadowSize: [41, 41],
});

interface LocationData {
	lat: number;
	lng: number;
	address: string;
}

interface MapProps {
	onLocationSelect?: (location: LocationData) => void;
	initialLocation?: { lat: number; lng: number };
	selectedLocation?: LocationData | null;
	height?: string;
	label?: string;
	canSearch?: boolean;
}

// Custom hook to handle map clicks
function MapClickHandler({
	onLocationSelect,
}: {
	onLocationSelect?: (location: LocationData) => void;
}) {
	useMapEvents({
		async click(e) {
			if (!onLocationSelect) return;

			const { lat, lng } = e.latlng;

			try {
				const address = await reverseGeocode(lat, lng);
				onLocationSelect({ lat, lng, address });
			} catch (error) {
				console.error("Reverse geocoding error:", error);
				// Fallback to coordinates if geocoding fails
				onLocationSelect({
					lat,
					lng,
					address: `${lat.toFixed(4)}, ${lng.toFixed(4)}`,
				});
			}
		},
	});

	return null;
}

// Component to handle map zoom and center updates
function MapUpdater({
	selectedLocation,
}: {
	selectedLocation?: LocationData | null;
}) {
	const map = useMap();

	useEffect(() => {
		if (selectedLocation) {
			map.setView([selectedLocation.lat, selectedLocation.lng], 15, {
				animate: true,
				duration: 0.5,
			});
		}
	}, [selectedLocation, map]);

	return null;
}

// Reverse geocoding function (coordinates to address)
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

export const Map = ({
	onLocationSelect,
	initialLocation,
	selectedLocation,
	height = "400px",
	label,
	canSearch = true,
}: MapProps) => {
	const autocompleteContainerRef = useRef<HTMLDivElement>(null);
	const autocompleteInstanceRef = useRef<any>(null);
	const [searchError, setSearchError] = useState<string | null>(null);

	// Determine center and zoom based on selected location or initial location
	const center: LatLngExpression = useMemo(() => {
		if (selectedLocation) {
			return [selectedLocation.lat, selectedLocation.lng];
		}
		if (initialLocation) {
			return [initialLocation.lat, initialLocation.lng];
		}
		return [40, -98]; // Default center (USA)
	}, [selectedLocation, initialLocation]);

	const zoom = useMemo(() => {
		return selectedLocation || initialLocation ? 17 : 3;
	}, [selectedLocation, initialLocation]);

	// Initialize Geoapify autocomplete
	useEffect(() => {
		if (!autocompleteContainerRef.current) return;

		// Prevent multiple initializations - check if container already has autocomplete elements
		if (
			autocompleteContainerRef.current.querySelector(
				".geoapify-geocoder-autocomplete-container",
			)
		) {
			return; // Already initialized
		}

		// Also check if we already have an instance
		if (autocompleteInstanceRef.current) {
			return;
		}

		const apiKey = import.meta.env.VITE_GEOAPIFY_API_KEY;
		if (!apiKey) {
			console.error("Geoapify API key is not configured");
			setSearchError("Address search is not configured");
			return;
		}

		// Dynamically import and initialize autocomplete
		import("@geoapify/geocoder-autocomplete")
			.then(({ GeocoderAutocomplete }) => {
				if (!autocompleteContainerRef.current) return;

				// Double-check container is still empty
				if (
					autocompleteContainerRef.current.querySelector(
						".geoapify-geocoder-autocomplete-container",
					)
				) {
					return; // Already initialized by another effect run
				}

				const autocomplete = new GeocoderAutocomplete(
					autocompleteContainerRef.current,
					apiKey,
					{
						placeholder:
							selectedLocation?.address || "Search for an address...",
						debounceDelay: 300,
						filter: {
							countrycode: ["us"],
						},
					},
				);

				autocompleteInstanceRef.current = autocomplete;

				// Style the autocomplete input to match our design system
				setTimeout(() => {
					const input = autocompleteContainerRef.current?.querySelector(
						"input",
					) as HTMLInputElement;
					if (input) {
						input.className =
							"w-full pl-3 py-2 bg-secondary border border-border rounded-md text-primary placeholder:text-tertiary focus:outline-none focus:ring-2 focus:ring-accent";
					}
				}, 100);

				// Handle place selection
				autocomplete.on("select", (value: any) => {
					if (value && value.properties) {
						const { lat, lon } = value.properties;
						const address = value.properties.formatted || value.properties.name;

						if (onLocationSelect) {
							onLocationSelect({
								lat: parseFloat(lat),
								lng: parseFloat(lon),
								address,
							});
						}
						setSearchError(null);
					}
				});

				// Handle suggestions (optional, for debugging)
				autocomplete.on("suggestions", () => {
					setSearchError(null);
				});
			})
			.catch(error => {
				console.error("Failed to initialize Geoapify autocomplete:", error);
				setSearchError("Failed to initialize address search");
			});

		// Cleanup function
		return () => {
			if (autocompleteInstanceRef.current) {
				try {
					autocompleteInstanceRef.current.off("select");
					autocompleteInstanceRef.current.off("suggestions");
					// Try to destroy the instance if method exists
					if (typeof autocompleteInstanceRef.current.destroy === "function") {
						autocompleteInstanceRef.current.destroy();
					}
				} catch (error) {
					// Ignore cleanup errors
				}
				autocompleteInstanceRef.current = null;
			}
			// Clear the container DOM to remove all autocomplete elements
			if (autocompleteContainerRef.current) {
				autocompleteContainerRef.current.innerHTML = "";
			}
		};
		// eslint-disable-next-line react-hooks/exhaustive-deps
	}, []);

	// Update autocomplete input value when location is selected via map click
	useEffect(() => {
		if (selectedLocation && autocompleteInstanceRef.current) {
			// Set the value of the autocomplete input
			const input = autocompleteContainerRef.current?.querySelector(
				"input",
			) as HTMLInputElement;
			if (input) {
				input.value = selectedLocation.address;
			}
		}
	}, [selectedLocation]);

	return (
		<div className='w-full'>
			{/* Label */}
			{label && (
				<label className='block text-sm font-medium text-primary mb-2'>
					{label}
				</label>
			)}

			{/* Geoapify Autocomplete Container */}
			{canSearch && (
				<div className='mb-3'>
					<div
						ref={autocompleteContainerRef}
						className='autocomplete-container'
						style={{ position: "relative" }}
					/>
				</div>
			)}

			{/* Error Message */}
			{searchError && (
				<p className='text-sm text-red-500 mb-2' role='alert'>
					{searchError}
				</p>
			)}

			{/* Map Container */}
			<div
				className='map-container rounded-md overflow-hidden border border-border'
				style={{ height }}>
				<MapContainer
					center={center}
					zoom={zoom}
					style={{ height: "100%", width: "100%" }}
					scrollWheelZoom={canSearch}
					zoomControl={canSearch}
					dragging={canSearch}>
					<TileLayer
						url={`https://maps.geoapify.com/v1/tile/osm-bright/{z}/{x}/{y}.png?apiKey=${import.meta.env.VITE_GEOAPIFY_API_KEY}`}
						attribution='Powered by <a href="https://www.geoapify.com/" target="_blank">Geoapify</a> | © OpenStreetMap <a href="https://www.openstreetmap.org/copyright" target="_blank">contributors</a>'
						maxZoom={20}
					/>
					{(selectedLocation || initialLocation) && (
						<Marker position={center} icon={DefaultIcon} />
					)}
					<MapClickHandler onLocationSelect={onLocationSelect} />
					<MapUpdater selectedLocation={selectedLocation} />
				</MapContainer>
			</div>
		</div>
	);
};
