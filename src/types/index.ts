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
