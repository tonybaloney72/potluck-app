export type ThemePreference = "light" | "dark";

export interface Profile {
	id: string;
	email: string | null;
	name: string | null;
	avatar_url: string | null;
	location: {
		lat: number;
		lng: number;
		address: string;
	} | null;
	theme_preference: ThemePreference;
	has_created_event: boolean;
	has_rsvped_to_event: boolean;
	active: boolean;
	private: boolean;
	deactivated_at: string | null;
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
	| "rsvp"
	| "contributor_approval_request";

export type PublicRoleRestriction =
	| "guests_only"
	| "guests_and_contributors_with_approval"
	| "guests_and_contributors";

export type ApprovalStatus = "pending" | "approved" | "denied";

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

export type EventRole = "host" | "co-host" | "contributor" | "guest";
export type RSVPStatus = "pending" | "going" | "not going" | "maybe";

export type EventStatus = "active" | "completed" | "cancelled";

export interface Event {
	id: string;
	created_by: string;
	title: string;
	description: string | null;
	theme: string | null;
	event_datetime: string; // ISO datetime string
	end_datetime: string | null; // ISO datetime string (optional end time)
	status: EventStatus; // Event status: active, completed, or cancelled
	location: {
		lat: number;
		lng: number;
		address: string;
	} | null;
	is_public: boolean;
	public_role_restriction?: PublicRoleRestriction; // Only relevant for public events
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
	approval_status?: ApprovalStatus | null; // For contributors joining public events
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

export interface PendingContributionRequest {
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
	event?: Event;
}
