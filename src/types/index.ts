export type ThemePreference = "light" | "dark" | "system";

export interface Profile {
	id: string;
	email: string | null;
	name: string | null;
	avatar_url: string | null;
	location: string | null;
	theme_preference: ThemePreference;
	has_created_event: boolean;
	has_rsvped_to_event: boolean;
	created_at: string;
	updated_at: string;
}

export interface User {
	id: string;
	email?: string;
	profile?: Profile;
}

export type FriendshipStatus = "pending" | "accepted" | "blocked";

export interface Friendship {
	id: string;
	user_id: string;
	friend_id: string;
	status: FriendshipStatus;
	created_at: string;
	updated_at: string;
	user?: Profile;
	friend?: Profile;
}

export interface Conversation {
	id: string;
	user1_id: string;
	user2_id: string;
	last_message_at: string | null;
	created_at: string;
	updated_at: string;
	// Joined data
	user1?: Profile;
	user2?: Profile;
	last_message?: Message;
	unread_count?: number;
}

export interface Message {
	id: string;
	conversation_id: string;
	sender_id: string;
	content: string;
	read: boolean;
	created_at: string;
	// Joined data
	sender?: Profile;
	conversation?: Conversation;
}

export type NotificationType =
	| "friend_request"
	| "friend_request_accepted"
	| "message"
	| "event_invitation"
	| "event_updated"
	| "event_cancelled"
	| "event_reminder"
	| "rsvp";

export interface Notification {
	id: string;
	user_id: string;
	type: NotificationType;
	title: string;
	message: string;
	related_id: string | null;
	read: boolean;
	created_at: string;
}

export type EventRole = "host" | "co_host" | "contributor" | "guest";
export type RSVPStatus = "pending" | "going" | "not_going" | "maybe";

export interface Event {
	id: string;
	created_by: string;
	title: string;
	description: string | null;
	theme: string | null;
	event_datetime: string; // ISO datetime string
	location: string | null;
	location_url: string | null;
	is_public: boolean;
	created_at: string;
	updated_at: string;
	// Joined data
	creator?: Profile;
	participants?: EventParticipant[];
	contributions?: Contribution[];
	comments?: EventComment[];
}

export interface EventParticipant {
	id: string;
	event_id: string;
	user_id: string;
	role: EventRole;
	rsvp_status: RSVPStatus;
	invited_at: string;
	joined_at: string | null;
	created_at: string;
	updated_at: string;
	// Joined data
	user?: Profile;
}

export interface Contribution {
	id: string;
	event_id: string;
	user_id: string;
	item_name: string;
	quantity: string | null;
	description: string | null;
	created_at: string;
	updated_at: string;
	// Joined data
	user?: Profile;
}

export interface EventComment {
	id: string;
	event_id: string;
	user_id: string;
	content: string;
	created_at: string;
	updated_at: string;
	// Joined data
	user?: Profile;
}
