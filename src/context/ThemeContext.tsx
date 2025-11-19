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

interface ThemeContextType {
	theme: Theme;
	setTheme: (theme: ThemePreference) => void;
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

export const ThemeProvider = ({ children }: { children: ReactNode }) => {
	const { profile } = useAppSelector(state => state.auth);
	const dispatch = useAppDispatch();
	const [theme, setThemeState] = useState<Theme>("light");

	// Get theme preference from profile or default to 'light'
	const preference = profile?.theme_preference || "light";

	useEffect(() => {
		const getSystemTheme = (): Theme => {
			return window.matchMedia("(prefers-color-scheme: dark)").matches
				? "dark"
				: "light";
		};

		let currentTheme: Theme;
		if (preference === "system") {
			currentTheme = getSystemTheme();
			// Listen for system theme changes
			const mediaQuery = window.matchMedia("(prefers-color-scheme: dark)");
			const handleChange = (e: MediaQueryListEvent) => {
				const newTheme = e.matches ? "dark" : "light";
				setThemeState(newTheme);
				document.documentElement.setAttribute("data-theme", newTheme);
			};
			mediaQuery.addEventListener("change", handleChange);
			return () => mediaQuery.removeEventListener("change", handleChange);
		} else {
			currentTheme = preference as Theme;
		}

		setThemeState(currentTheme);
		document.documentElement.setAttribute("data-theme", currentTheme);
	}, [preference]);

	const setTheme = async (newTheme: ThemePreference) => {
		if (profile) {
			await dispatch(updateProfile({ theme_preference: newTheme }));
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
