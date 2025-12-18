import { useState, useEffect, useMemo, useRef } from "react";
import { useNavigate } from "react-router";
import { useAppDispatch, useAppSelector } from "../store/hooks";
import { fetchNearbyPublicEvents } from "../store/slices/eventsSlice";
import {
	getBrowserLocation,
	getStoredBrowserLocation,
	checkGeolocationPermission,
} from "../utils/location";
import { Button } from "../components/common/Button";
import { Skeleton } from "../components/common/Skeleton";
import { EmptyState } from "../components/common/EmptyState";
import { FaSearch } from "react-icons/fa";
import type { Event } from "../types";
import { MapContainer, TileLayer, Marker, Popup, useMap } from "react-leaflet";
import type { LatLngExpression } from "leaflet";
import { Icon } from "leaflet";
import "leaflet/dist/leaflet.css";

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

type EventWithDistance = Event & { distance: number };

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

export const DiscoverPage = () => {
	const navigate = useNavigate();
	const dispatch = useAppDispatch();
	const { profile } = useAppSelector(state => state.auth);

	const [userLocation, setUserLocation] = useState<LocationData | null>(null);
	const [loadingLocation, setLoadingLocation] = useState(true);
	const [_locationError, setLocationError] = useState<string | null>(null);
	// const [_requestingLocation, setRequestingLocation] = useState(false);
	const [publicEvents, setPublicEvents] = useState<EventWithDistance[]>([]);
	const [loadingEvents, setLoadingEvents] = useState(false);
	const [selectedRadius, setSelectedRadius] = useState(25);
	const [displayedCount, setDisplayedCount] = useState(25); // Start with 25 events
	const autocompleteContainerRef = useRef<HTMLDivElement>(null);
	const autocompleteInstanceRef = useRef<any>(null);

	// Get user location on mount (same pattern as PublicEventsMap)
	useEffect(() => {
		const loadLocation = async () => {
			setLoadingLocation(true);
			setLocationError(null);

			try {
				// Check geolocation permission first
				const permission = await checkGeolocationPermission();

				// If permission is denied, skip localStorage and browser, use profile only
				if (permission === "denied") {
					if (profile?.location) {
						setUserLocation({
							lat: profile.location.lat,
							lng: profile.location.lng,
							address: profile.location.address,
						});
						setLoadingLocation(false);
						return;
					}
					setLocationError("No location available");
					setLoadingLocation(false);
					return;
				}

				// Permission is granted or prompt - try localStorage and browser
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
			setDisplayedCount(25); // Reset to first 25 when search changes
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
	// const handleRequestLocation = async () => {
	// 	setRequestingLocation(true);
	// 	setLocationError(null);

	// 	try {
	// 		const browserLocation = await getBrowserLocation();
	// 		setUserLocation(browserLocation);
	// 	} catch (error) {
	// 		if (error instanceof GeolocationPositionError) {
	// 			if (error.code === error.PERMISSION_DENIED) {
	// 				setLocationError(
	// 					"Location permission denied. Please enable location access in your browser settings.",
	// 				);
	// 			} else if (error.code === error.POSITION_UNAVAILABLE) {
	// 				setLocationError("Location information is unavailable.");
	// 			} else {
	// 				setLocationError("Location request timed out.");
	// 			}
	// 		} else {
	// 			setLocationError("Failed to get your location.");
	// 		}
	// 	} finally {
	// 		setRequestingLocation(false);
	// 	}
	// };

	// Handle location selection from address search
	const handleLocationSelect = (location: LocationData) => {
		setUserLocation(location);
		setLocationError(null);
		setDisplayedCount(25); // Reset to first 25 when location changes
	};

	// Initialize Geoapify autocomplete for address search
	useEffect(() => {
		// Only initialize when not loading location (container should be rendered)
		if (loadingLocation || !autocompleteContainerRef.current) return;

		// Prevent multiple initializations
		if (
			autocompleteContainerRef.current.querySelector(
				".geoapify-geocoder-autocomplete-container",
			)
		) {
			return; // Already initialized
		}

		if (autocompleteInstanceRef.current) {
			return;
		}

		const apiKey = import.meta.env.VITE_GEOAPIFY_API_KEY;
		if (!apiKey) {
			console.error("Geoapify API key is not configured");
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
						placeholder: "Search for an address or city...",
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
							"w-full pl-3 py-1.5 bg-secondary border border-border rounded-md text-sm text-primary placeholder:text-tertiary focus:outline-none focus:ring-2 focus:ring-accent";
						// Set initial value if we have a location
						if (userLocation) {
							input.value = userLocation.address;
						}
					}
				}, 100);

				// Handle place selection
				autocomplete.on("select", (value: any) => {
					if (value && value.properties) {
						const { lat, lon } = value.properties;
						const address = value.properties.formatted || value.properties.name;

						handleLocationSelect({
							lat: parseFloat(lat),
							lng: parseFloat(lon),
							address,
						});
					}
				});
			})
			.catch(error => {
				console.error("Failed to initialize Geoapify autocomplete:", error);
			});

		// Cleanup function
		return () => {
			if (autocompleteInstanceRef.current) {
				try {
					autocompleteInstanceRef.current.off("select");
					if (typeof autocompleteInstanceRef.current.destroy === "function") {
						autocompleteInstanceRef.current.destroy();
					}
				} catch (error) {
					// Ignore cleanup errors
				}
				autocompleteInstanceRef.current = null;
			}
			if (autocompleteContainerRef.current) {
				autocompleteContainerRef.current.innerHTML = "";
			}
		};
		// eslint-disable-next-line react-hooks/exhaustive-deps
	}, [loadingLocation]);

	// Update autocomplete input value when location changes
	useEffect(() => {
		if (userLocation && autocompleteInstanceRef.current) {
			const input = autocompleteContainerRef.current?.querySelector(
				"input",
			) as HTMLInputElement;
			if (input) {
				input.value = userLocation.address;
			}
		}
	}, [userLocation]);

	// Handle load more
	const handleLoadMore = () => {
		setDisplayedCount(prev => prev + 25);
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

	// Get events to display (up to displayedCount)
	const displayedEvents = useMemo(() => {
		return publicEvents.slice(0, displayedCount);
	}, [publicEvents, displayedCount]);

	const hasMore = publicEvents.length > displayedCount;

	// Map center
	const mapCenter: LatLngExpression = useMemo(() => {
		if (userLocation) {
			return [userLocation.lat, userLocation.lng];
		}
		return [40, -98]; // Default center (USA)
	}, [userLocation]);

	// Calculate zoom level based on selected radius
	const mapZoom = useMemo(() => {
		if (!userLocation) return 4;
		return getZoomForRadius(selectedRadius);
	}, [userLocation, selectedRadius]);

	return (
		<main id='main-content' className='bg-secondary p-4 md:p-8' role='main'>
			<div className='max-w-7xl mx-auto'>
				{/* Page Header */}
				<div className='mb-6'>
					<h1 className='text-2xl md:text-3xl font-bold text-primary mb-2'>
						Discover Events
					</h1>
					<p className='text-secondary'>
						Search for public events near you. Find gatherings, potlucks, and
						community events in your area.
					</p>
				</div>

				{/* Loading state for location */}
				{loadingLocation && (
					<div className='bg-primary rounded-lg p-6 md:p-8 mb-4'>
						<Skeleton className='h-96 w-full' />
					</div>
				)}

				{/* Map with Events */}
				{!loadingLocation && (
					<div className='bg-primary rounded-lg shadow-md overflow-hidden mb-4'>
						{/* Radius selector and Address Search */}
						<div className='p-4 border-b border-border flex flex-col sm:flex-row items-start sm:items-center gap-4'>
							{/* Address Search */}
							<div className='flex-1 flex items-center gap-2 w-full min-w-0'>
								<label
									htmlFor='address-search'
									className='text-sm font-medium text-secondary whitespace-nowrap hidden sm:block'>
									Search:
								</label>
								<div
									ref={autocompleteContainerRef}
									id='address-search'
									className='autocomplete-container flex-1'
									style={{ position: "relative", minWidth: "200px" }}
								/>
							</div>
							{/* Radius Selector */}
							<div className='flex justify-between items-center gap-2 w-full sm:w-auto'>
								<label
									htmlFor='radius-select'
									className='text-sm font-medium text-secondary whitespace-nowrap'>
									Search Radius:
								</label>
								<select
									id='radius-select'
									value={selectedRadius}
									onChange={e => setSelectedRadius(Number(e.target.value))}
									className='px-1.5 py-1.5 bg-secondary border border-border rounded-md text-sm text-primary focus:outline-none focus:ring-2 focus:ring-accent focus:border-transparent w-32 sm:w-auto'>
									{radiusOptions.map(option => (
										<option key={option.value} value={option.value}>
											{option.label}
										</option>
									))}
								</select>
							</div>
						</div>
						{loadingEvents && (
							<div className='p-4 text-center text-secondary'>
								Loading nearby events...
							</div>
						)}
						{!loadingEvents && publicEvents.length === 0 && (
							<div className='p-6 md:p-8 text-center'>
								<p className='text-tertiary mb-2'>
									No public events found nearby.
								</p>
								<p className='text-sm text-secondary'>
									Try expanding your search radius, sharing your location,
									adding it to your profile, or create your own public event!
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
				)}

				{/* Events List */}
				{userLocation && !loadingLocation && (
					<div className='bg-primary rounded-lg shadow-md p-4 md:p-6'>
						<h2 className='text-xl md:text-2xl font-semibold text-primary mb-4'>
							Nearby Upcoming Events
							{publicEvents.length > 0 && (
								<span className='text-base font-normal text-secondary ml-2'>
									({publicEvents.length} found)
								</span>
							)}
						</h2>

						{loadingEvents ?
							<div className='space-y-4'>
								{Array.from({ length: 3 }).map((_, i) => (
									<Skeleton key={i} className='h-32 w-full' />
								))}
							</div>
						: displayedEvents.length === 0 ?
							<EmptyState
								icon={<FaSearch className='w-16 h-16' />}
								title='No events found'
								message='No public events found within your search radius. Try expanding your search radius or search in a different location.'
							/>
						:	<>
								<div className='max-h-[500px] overflow-y-auto space-y-4 pr-2'>
									{displayedEvents.map(event => {
										const { date, time } = formatDateTime(event.event_datetime);

										return (
											<article
												key={event.id}
												className='bg-secondary rounded-lg p-4 md:p-6 hover:bg-tertiary transition-colors cursor-pointer border border-border'
												onClick={() => navigate(`/events/${event.id}`)}
												role='button'
												tabIndex={0}
												onKeyDown={e => {
													if (e.key === "Enter" || e.key === " ") {
														e.preventDefault();
														navigate(`/events/${event.id}`);
													}
												}}
												aria-label={`View event: ${event.title}`}>
												<div className='flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4'>
													<div className='flex-1 min-w-0'>
														<div className='flex items-start justify-between gap-2 mb-2'>
															<h3 className='text-lg md:text-xl font-semibold text-primary'>
																{event.title}
															</h3>
															<span className='text-sm font-medium text-accent whitespace-nowrap shrink-0'>
																{event.distance.toFixed(1)} mi
															</span>
														</div>
														{event.theme && (
															<span className='inline-block text-xs bg-accent/20 text-primary rounded px-2 py-1 mb-2'>
																{event.theme}
															</span>
														)}
														{event.creator && (
															<p className='text-sm text-tertiary mb-2'>
																Hosted by {event.creator.name}
															</p>
														)}
														{event.description && (
															<p className='text-secondary mb-3 line-clamp-2'>
																{event.description}
															</p>
														)}
														<div className='space-y-1 text-sm text-tertiary'>
															<p>
																<span aria-hidden='true'>📅</span>{" "}
																<time dateTime={event.event_datetime}>
																	{date} at {time}
																</time>
															</p>
															{event.location && (
																<p className='truncate'>
																	<span aria-hidden='true'>📍</span>{" "}
																	<span>{event.location.address}</span>
																</p>
															)}
														</div>
													</div>
												</div>
											</article>
										);
									})}
								</div>

								{/* Load More Button */}
								{hasMore && (
									<div className='mt-6 flex justify-center'>
										<Button
											variant='secondary'
											onClick={handleLoadMore}
											className='min-h-[44px]'>
											Load More ({publicEvents.length - displayedCount} more)
										</Button>
									</div>
								)}
							</>
						}
					</div>
				)}
			</div>
		</main>
	);
};
