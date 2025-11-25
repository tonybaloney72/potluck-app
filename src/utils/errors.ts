/**
 * Utility functions for error handling and user-friendly error messages
 */

interface SupabaseError {
	message?: string;
	code?: string;
	details?: string;
	hint?: string;
}

/**
 * Extracts a user-friendly error message from various error types
 */
export const getErrorMessage = (error: unknown): string => {
	if (!error) return "An unexpected error occurred";

	// Handle Supabase errors
	if (typeof error === "object" && error !== null) {
		const err = error as SupabaseError;

		// Check for common Supabase error codes
		if (err.code) {
			switch (err.code) {
				case "PGRST116":
					return "The requested item could not be found";
				case "23505":
					return "This item already exists";
				case "23503":
					return "This item is referenced by other data and cannot be removed";
				case "42501":
					return "You don't have permission to perform this action";
				case "42P01":
					return "Database configuration error. Please contact support";
				default:
					// Fall through to message extraction
					break;
			}
		}

		// Use hint if available (often more helpful)
		if (err.hint) {
			return err.hint;
		}

		// Use message if available
		if (err.message) {
			// Check for common error patterns in messages
			if (err.message.includes("JWT")) {
				return "Your session has expired. Please sign in again";
			}
			if (err.message.includes("network") || err.message.includes("fetch")) {
				return "Network error. Please check your connection and try again";
			}
			if (err.message.includes("timeout")) {
				return "Request timed out. Please try again";
			}
			return err.message;
		}

		// Use details if available
		if (err.details) {
			return err.details;
		}
	}

	// Handle Error objects
	if (error instanceof Error) {
		return error.message || "An error occurred";
	}

	// Handle string errors
	if (typeof error === "string") {
		return error;
	}

	return "An unexpected error occurred. Please try again";
};

/**
 * Gets a descriptive error message for specific operations
 */
export const getOperationErrorMessage = (
	operation: string,
	error: unknown,
): string => {
	const baseMessage = getErrorMessage(error);

	// Add context based on operation
	const contextMessages: Record<string, string> = {
		fetchEvents: "Failed to load events",
		fetchEvent: "Failed to load event details",
		createEvent: "Failed to create event",
		updateEvent: "Failed to update event",
		deleteEvent: "Failed to delete event",
		fetchFriends: "Failed to load friends",
		sendFriendRequest: "Failed to send friend request",
		fetchMessages: "Failed to load messages",
		sendMessage: "Failed to send message",
		fetchProfile: "Failed to load profile",
		updateProfile: "Failed to update profile",
		signIn: "Sign in failed",
		signUp: "Sign up failed",
		fetchNotifications: "Failed to load notifications",
	};

	const context = contextMessages[operation] || "Operation failed";

	// If baseMessage already contains context, return it as-is
	// Otherwise, combine context with baseMessage
	if (baseMessage.toLowerCase().includes(context.toLowerCase())) {
		return baseMessage;
	}

	return `${context}: ${baseMessage}`;
};
