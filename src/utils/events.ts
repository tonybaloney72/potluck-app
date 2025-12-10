import type { EventRole } from "../types";
import { supabase } from "../services/supabase";

export const hasManagePermission = (role: EventRole | undefined): boolean => {
	if (!role) return false;
	return role === "host" || role === "co-host";
};

export const canAddContributions = (role: EventRole | undefined): boolean => {
	if (!role) return false;
	return role === "host" || role === "co-host" || role === "contributor";
};

export const canDeleteItem = (
	itemUserId: string,
	currentUserId: string | undefined,
	currentUserRole: EventRole | undefined,
): boolean => {
	if (!currentUserId) return false;
	return itemUserId === currentUserId || hasManagePermission(currentUserRole);
};

export const getEventHostId = async (
	eventId: string,
): Promise<string | null> => {
	const { data, error } = await supabase
		.from("event_participants")
		.select("user_id")
		.eq("event_id", eventId)
		.eq("role", "host")
		.single();

	if (error) {
		console.error("Error fetching event host:", error);
		return null;
	}

	return data?.user_id || null;
};
