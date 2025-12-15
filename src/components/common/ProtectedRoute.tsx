import { Navigate, useLocation } from "react-router";
import { useAppSelector } from "../../store/hooks";
import { SkeletonAppLoader } from "./Skeleton";

interface ProtectedRouteProps {
	children: React.ReactNode;
}

export const ProtectedRoute = ({ children }: ProtectedRouteProps) => {
	const { user, initializing, profile } = useAppSelector(state => state.auth);
	const location = useLocation();

	// If we have a user, show content even if still initializing (profile loading)
	// Only show loading if we're initializing AND don't have a user yet
	if (initializing && !user) {
		return <SkeletonAppLoader />;
	}

	// If initialization is complete and no user, redirect to login with return URL
	if (!initializing && !user) {
		// Save the attempted URL so we can redirect back after login
		// Only add returnUrl if we're not already on the login page and not on home
		if (location.pathname !== "/login") {
			const returnUrl = location.pathname + location.search;
			// Only add returnUrl if it's not just "/"
			if (returnUrl !== "/") {
				return (
					<Navigate
						to={`/login?returnUrl=${encodeURIComponent(returnUrl)}`}
						replace
					/>
				);
			}
		}
		// If already on login or trying to access home, just go to login without returnUrl
		return <Navigate to='/login' replace />;
	}

	// If user exists but profile is loaded and inactive, redirect to reactivate
	// Allow access to reactivate page itself
	if (
		user &&
		profile &&
		!profile.active &&
		location.pathname !== "/reactivate"
	) {
		return <Navigate to='/reactivate' replace />;
	}

	// User exists and is active, show content
	return <>{children}</>;
};
