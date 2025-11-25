import { Navigate } from "react-router";
import { useAppSelector } from "../../store/hooks";
import { SkeletonAppLoader } from "./Skeleton";

interface ProtectedRouteProps {
	children: React.ReactNode;
}

export const ProtectedRoute = ({ children }: ProtectedRouteProps) => {
	const { user, initializing } = useAppSelector(state => state.auth);

	// If we have a user, show content even if still initializing (profile loading)
	// Only show loading if we're initializing AND don't have a user yet
	if (initializing && !user) {
		return <SkeletonAppLoader />;
	}

	// If initialization is complete and no user, redirect to login
	if (!initializing && !user) {
		return <Navigate to='/login' replace />;
	}

	// User exists, show content
	return <>{children}</>;
};
