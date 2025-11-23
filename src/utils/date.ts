export function formatDateForInput(dateString: string): string {
	const date = new Date(dateString);
	const year = date.getFullYear();
	const month = String(date.getMonth() + 1).padStart(2, "0");
	const day = String(date.getDate()).padStart(2, "0");
	return `${year}-${month}-${day}`;
}

export const formatTime = (timeString: string) => {
	return timeString;
};

// const formatDate = (dateString: string) => {
// 	const date = new Date(dateString);
// 	return date.toLocaleDateString("en-US", {
// 		weekday: "long",
// 		year: "numeric",
// 		month: "long",
// 		day: "numeric",
// 	});
// };

// const formatTime = (timeString: string) => {
// 	const [hours, minutes] = timeString.split(":");
// 	const hour = parseInt(hours);
// 	const ampm = hour >= 12 ? "PM" : "AM";
// 	const displayHour = hour % 12 || 12;
// 	return `${displayHour}:${minutes} ${ampm}`;
// };
