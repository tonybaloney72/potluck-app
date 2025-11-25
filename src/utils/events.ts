import type { EventRole } from "../types";

export const hasManagePermission = (role: EventRole | undefined): boolean => {
	if (!role) return false;
	return role === "host" || role === "co_host";
};

export const canAddContributions = (role: EventRole | undefined): boolean => {
	if (!role) return false;
	return role === "host" || role === "co_host" || role === "contributor";
};

export const canDeleteItem = (
	itemUserId: string,
	currentUserId: string | undefined,
	currentUserRole: EventRole | undefined,
): boolean => {
	if (!currentUserId) return false;
	return itemUserId === currentUserId || hasManagePermission(currentUserRole);
};
