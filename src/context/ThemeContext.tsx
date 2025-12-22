import {
	createContext,
	useContext,
	useEffect,
	useState,
	type ReactNode,
} from "react";
import { useAppSelector, useAppDispatch } from "../store/hooks";
import { updateProfile } from "../store/slices/authSlice";
import type { ThemePreference } from "../types";

type Theme = "light" | "dark";

const THEME_STORAGE_KEY = "potluck-theme-preference";

interface ThemeContextType {
	theme: Theme;
	setTheme: (theme: ThemePreference) => void;
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

export const ThemeProvider = ({ children }: { children: ReactNode }) => {
	const { profile } = useAppSelector(state => state.auth);
	const dispatch = useAppDispatch();
	const [theme, setThemeState] = useState<Theme>(() => {
		// Initialize from localStorage or default to 'light'
		const stored = localStorage.getItem(THEME_STORAGE_KEY);
		if (stored === "light" || stored === "dark") {
			return stored;
		}
		return "light";
	});

	// Get theme preference from profile or localStorage fallback
	const preference =
		profile?.theme_preference ||
		(localStorage.getItem(THEME_STORAGE_KEY) as ThemePreference) ||
		"light";

	// Sync theme when preference changes (from profile update)
	useEffect(() => {
		if (preference && (preference === "light" || preference === "dark")) {
			setThemeState(preference);
			document.documentElement.setAttribute("data-theme", preference);
			// Update localStorage to keep it in sync
			localStorage.setItem(THEME_STORAGE_KEY, preference);
		}
	}, [preference]);

	// Apply theme on mount
	useEffect(() => {
		document.documentElement.setAttribute("data-theme", theme);
	}, []);

	const setTheme = async (newTheme: ThemePreference) => {
		// Optimistic update: apply theme immediately
		setThemeState(newTheme);
		document.documentElement.setAttribute("data-theme", newTheme);
		localStorage.setItem(THEME_STORAGE_KEY, newTheme);

		// Sync to database in background (don't await)
		if (profile) {
			dispatch(updateProfile({ theme_preference: newTheme }));
		}
	};

	return (
		<ThemeContext.Provider value={{ theme, setTheme }}>
			{children}
		</ThemeContext.Provider>
	);
};

export const useTheme = () => {
	const context = useContext(ThemeContext);
	if (context === undefined) {
		throw new Error("useTheme must be used within a ThemeProvider");
	}
	return context;
};
