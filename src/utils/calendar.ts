import type { Event } from "../types";

/**
 * Generate Google Calendar URL
 */
export const generateGoogleCalendarUrl = (event: Event): string => {
	const startDate = new Date(event.event_datetime);
	const endDate = new Date(startDate);
	endDate.setHours(endDate.getHours() + 2); // Default 2-hour duration

	const formatDate = (date: Date): string => {
		return date.toISOString().replace(/[-:]/g, "").split(".")[0] + "Z";
	};

	const params = new URLSearchParams({
		action: "TEMPLATE",
		text: event.title,
		dates: `${formatDate(startDate)}/${formatDate(endDate)}`,
		details: event.description || "",
		location: event.location || "",
	});

	return `https://calendar.google.com/calendar/render?${params.toString()}`;
};

/**
 * Generate Apple Calendar (.ics file) data
 */
export const generateAppleCalendarData = (event: Event): string => {
	const startDate = new Date(event.event_datetime);
	const endDate = new Date(startDate);
	endDate.setHours(endDate.getHours() + 2); // Default 2-hour duration

	const formatDate = (date: Date): string => {
		return date.toISOString().replace(/[-:]/g, "").split(".")[0] + "Z";
	};

	const icsContent = [
		"BEGIN:VCALENDAR",
		"VERSION:2.0",
		"PRODID:-//Potluck App//EN",
		"BEGIN:VEVENT",
		`UID:${event.id}@potluck-app`,
		`DTSTART:${formatDate(startDate)}`,
		`DTEND:${formatDate(endDate)}`,
		`SUMMARY:${event.title}`,
		event.description
			? `DESCRIPTION:${event.description.replace(/\n/g, "\\n")}`
			: "",
		event.location ? `LOCATION:${event.location}` : "",
		"END:VEVENT",
		"END:VCALENDAR",
	]
		.filter(line => line !== "")
		.join("\r\n");

	return icsContent;
};

/**
 * Download .ics file for Apple Calendar
 */
export const downloadAppleCalendar = (event: Event): void => {
	const icsContent = generateAppleCalendarData(event);
	const blob = new Blob([icsContent], { type: "text/calendar;charset=utf-8" });
	const url = URL.createObjectURL(blob);
	const link = document.createElement("a");
	link.href = url;
	link.download = `${event.title.replace(/[^a-z0-9]/gi, "_")}.ics`;
	document.body.appendChild(link);
	link.click();
	document.body.removeChild(link);
	URL.revokeObjectURL(url);
};
