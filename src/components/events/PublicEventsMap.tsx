import { useState, useEffect, useMemo } from "react";
import { useNavigate } from "react-router";
import { MapContainer, TileLayer, Marker, Popup, useMap } from "react-leaflet";
import type { LatLngExpression } from "leaflet";
import { Icon } from "leaflet";
import "leaflet/dist/leaflet.css";
import { useAppDispatch, useAppSelector } from "../../store/hooks";
import { fetchNearbyPublicEvents } from "../../store/slices/eventsSlice";
import {
	getBrowserLocation,
	getStoredBrowserLocation,
} from "../../utils/location";
import { Button } from "../common/Button";
import { Skeleton } from "../common/Skeleton";
import type { Event } from "../../types";

// Fix for default marker icon in react-leaflet
import icon from "leaflet/dist/images/marker-icon.png";
import iconShadow from "leaflet/dist/images/marker-shadow.png";

const EventIcon = new Icon({
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

interface PublicEventsMapProps {
	radiusMiles?: number; // Default 25 miles
}

// Radius options for the selector
const radiusOptions = [
	{ value: 5, label: "5 miles" },
	{ value: 10, label: "10 miles" },
	{ value: 25, label: "25 miles" },
	{ value: 50, label: "50 miles" },
	{ value: 100, label: "100 miles" },
];

// Function to calculate zoom level based on radius (miles)
const getZoomForRadius = (radiusMiles: number): number => {
	if (radiusMiles <= 5) return 13;
	if (radiusMiles <= 10) return 12;
	if (radiusMiles <= 25) return 11;
	if (radiusMiles <= 50) return 10;
	return 9; // 100 miles
};

// Component to update map center and zoom when location or radius changes
function MapCenterUpdater({
	center,
	zoom,
}: {
	center: LatLngExpression;
	zoom: number;
}) {
	const map = useMap();

	useEffect(() => {
		map.setView(center, zoom, {
			animate: true,
			duration: 0.5,
		});
	}, [center, zoom, map]);

	return null;
}

export const PublicEventsMap = ({ radiusMiles = 25 }: PublicEventsMapProps) => {
	const navigate = useNavigate();
	const dispatch = useAppDispatch();
	const { profile } = useAppSelector(state => state.auth);
	const [userLocation, setUserLocation] = useState<LocationData | null>(null);
	const [loadingLocation, setLoadingLocation] = useState(true);
	const [locationError, setLocationError] = useState<string | null>(null);
	const [requestingLocation, setRequestingLocation] = useState(false);
	const [publicEvents, setPublicEvents] = useState<
		(Event & { distance: number })[]
	>([]);
	const [loadingEvents, setLoadingEvents] = useState(false);
	const [selectedRadius, setSelectedRadius] = useState(radiusMiles);

	// Sync selectedRadius with prop if it changes
	useEffect(() => {
		setSelectedRadius(radiusMiles);
	}, [radiusMiles]);

	// Get user location on mount
	useEffect(() => {
		const loadLocation = async () => {
			setLoadingLocation(true);
			setLocationError(null);

			try {
				// 1. Try stored browser location first (if recent)
				const storedLocation = getStoredBrowserLocation();
				if (storedLocation) {
					setUserLocation(storedLocation);
					setLoadingLocation(false);
					return;
				}

				// 2. Try to get browser location
				try {
					const browserLocation = await getBrowserLocation();
					setUserLocation(browserLocation);
					setLoadingLocation(false);
					return;
				} catch (error) {
					// Browser location failed, continue to profile location
					console.error("Browser location not available:", error);
				}

				// 3. Fall back to profile location
				if (profile?.location) {
					setUserLocation({
						lat: profile.location.lat,
						lng: profile.location.lng,
						address: profile.location.address,
					});
					setLoadingLocation(false);
					return;
				}

				// 4. No location available
				setLocationError("No location available");
				setLoadingLocation(false);
			} catch (error) {
				setLocationError(
					error instanceof Error ? error.message : "Failed to get location",
				);
				setLoadingLocation(false);
			}
		};

		loadLocation();
	}, [profile]);

	// Fetch public events when location or radius changes
	useEffect(() => {
		if (!userLocation || loadingLocation) return;

		const loadEvents = async () => {
			setLoadingEvents(true);
			try {
				const result = await dispatch(
					fetchNearbyPublicEvents({
						lat: userLocation.lat,
						lng: userLocation.lng,
						radiusMiles: selectedRadius,
					}),
				);

				if (fetchNearbyPublicEvents.fulfilled.match(result)) {
					setPublicEvents(result.payload);
				}
			} catch (error) {
				console.error("Failed to fetch public events:", error);
			} finally {
				setLoadingEvents(false);
			}
		};

		loadEvents();
	}, [userLocation, loadingLocation, dispatch, selectedRadius]);

	// Handle manual location request
	const handleRequestLocation = async () => {
		setRequestingLocation(true);
		setLocationError(null);

		try {
			const browserLocation = await getBrowserLocation();
			setUserLocation(browserLocation);
		} catch (error) {
			if (error instanceof GeolocationPositionError) {
				if (error.code === error.PERMISSION_DENIED) {
					setLocationError(
						"Location permission denied. Please enable location access in your browser settings.",
					);
				} else if (error.code === error.POSITION_UNAVAILABLE) {
					setLocationError("Location information is unavailable.");
				} else {
					setLocationError("Location request timed out.");
				}
			} else {
				setLocationError("Failed to get your location.");
			}
		} finally {
			setRequestingLocation(false);
		}
	};

	// Format date/time for display
	const formatDateTime = (datetimeString: string) => {
		const date = new Date(datetimeString);
		const dateStr = date.toLocaleDateString("en-US", {
			weekday: "short",
			month: "short",
			day: "numeric",
		});
		const timeStr = date.toLocaleTimeString("en-US", {
			hour: "numeric",
			minute: "2-digit",
			hour12: true,
		});
		return { date: dateStr, time: timeStr };
	};

	// Map center
	const mapCenter: LatLngExpression = useMemo(() => {
		if (userLocation) {
			return [userLocation.lat, userLocation.lng];
		}
		return [40, -98]; // Default center (USA)
	}, [userLocation]);

	// Calculate zoom level based on selected radius
	const mapZoom = useMemo(
		() => getZoomForRadius(selectedRadius),
		[selectedRadius],
	);

	// Loading state
	if (loadingLocation) {
		return (
			<div className='bg-primary rounded-lg p-6 md:p-8'>
				<Skeleton className='h-96 w-full' />
			</div>
		);
	}

	// No location available
	if (!userLocation) {
		return (
			<div className='bg-primary rounded-lg p-6 md:p-8 text-center'>
				<p className='text-tertiary mb-4'>
					{locationError ||
						"Location is required to show nearby events. Please share your location or add it to your profile."}
				</p>
				<div className='flex flex-col sm:flex-row gap-3 justify-center'>
					<Button onClick={handleRequestLocation} loading={requestingLocation}>
						Share Location
					</Button>
					{profile && (
						<Button variant='secondary' onClick={() => navigate("/profile")}>
							Add Location to Profile
						</Button>
					)}
				</div>
			</div>
		);
	}

	// Map with events
	return (
		<div className='bg-primary rounded-lg overflow-hidden'>
			{/* Radius selector */}
			<div className='p-4 border-b border-border flex items-center justify-between gap-4'>
				<label
					htmlFor='radius-select'
					className='text-sm font-medium text-secondary whitespace-nowrap'>
					Search radius:
				</label>
				<select
					id='radius-select'
					value={selectedRadius}
					onChange={e => setSelectedRadius(Number(e.target.value))}
					className='px-3 py-1.5 bg-secondary border border-border rounded-md text-sm text-primary focus:outline-none focus:ring-2 focus:ring-accent focus:border-transparent'>
					{radiusOptions.map(option => (
						<option key={option.value} value={option.value}>
							{option.label}
						</option>
					))}
				</select>
			</div>
			{loadingEvents && (
				<div className='p-4 text-center text-secondary'>
					Loading nearby events...
				</div>
			)}
			{!loadingEvents && publicEvents.length === 0 && (
				<div className='p-6 md:p-8 text-center'>
					<p className='text-tertiary mb-2'>No public events found nearby.</p>
					<p className='text-sm text-secondary'>
						Try expanding your search radius or create your own public event!
					</p>
				</div>
			)}
			<div
				className='map-container rounded-md overflow-hidden border border-border'
				style={{ height: "400px" }}>
				<MapContainer
					center={mapCenter}
					zoom={mapZoom}
					style={{ height: "100%", width: "100%" }}
					scrollWheelZoom={true}
					zoomControl={true}>
					<TileLayer
						url={`https://maps.geoapify.com/v1/tile/osm-bright/{z}/{x}/{y}.png?apiKey=${import.meta.env.VITE_GEOAPIFY_API_KEY}`}
						attribution='Powered by <a href="https://www.geoapify.com/" target="_blank">Geoapify</a> | © OpenStreetMap <a href="https://www.openstreetmap.org/copyright" target="_blank">contributors</a>'
						maxZoom={20}
					/>
					<MapCenterUpdater center={mapCenter} zoom={mapZoom} />
					{/* User location marker */}
					{/* <Marker position={mapCenter} icon={EventIcon}>
						<Popup>
							<div className='text-sm'>
								<p className='font-semibold'>Your Location</p>
								<p className='text-secondary'>{userLocation.address}</p>
							</div>
						</Popup>
					</Marker> */}
					{/* Event markers */}
					{publicEvents.map(event => {
						if (!event.location) return null;

						const { date, time } = formatDateTime(event.event_datetime);

						return (
							<Marker
								key={event.id}
								position={[event.location.lat, event.location.lng]}
								icon={EventIcon}>
								<Popup className='bg-secondary'>
									<div className='text-sm min-w-[200px]'>
										<h3 className='font-semibold text-primary mb-2'>
											{event.title}
										</h3>
										{event.theme && (
											<p className='text-xs text-secondary mb-1'>
												{event.theme}
											</p>
										)}
										<p className='text-secondary mb-2'>
											{date} at {time}
										</p>
										{event.location && (
											<p className='text-secondary mb-2 text-xs'>
												📍 {event.location.address}
											</p>
										)}
										<p className='text-xs text-secondary mb-2'>
											{event.distance.toFixed(1)} miles away
										</p>
										<button
											onClick={() => navigate(`/events/${event.id}`)}
											className='w-full px-3 py-1.5 bg-accent text-bg-secondary hover:bg-accent-secondary rounded-md text-xs font-medium transition-colors'>
											View Event
										</button>
									</div>
								</Popup>
							</Marker>
						);
					})}
				</MapContainer>
			</div>
		</div>
	);
};
