export type ThemePreference = "light" | "dark" | "system";

export interface Profile {
	id: string;
	email: string | null;
	name: string | null;
	avatar_url: string | null;
	location: string | null;
	theme_preference: ThemePreference;
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
	friend?: Profile;
}

export interface Message {
	id: string;
	sender_id: string;
	receiver_id: string;
	content: string;
	read: boolean;
	created_at: string;
	sender?: Profile;
	receiver?: Profile;
}
