import { HashRouter } from "react-router";
import { useAuth } from "./hooks/useAuth";
import { ThemeProvider } from "./context/ThemeContext";
import { AppRoutes } from "./routes/AppRoutes";
import { useNotificationsRealtime } from "./hooks/useNotificationsRealTime";
import { useFriendshipsRealtime } from "./hooks/useFriendshipsRealtime";
import { useEventsRealtime } from "./hooks/useEventsRealtime";

function App() {
	useAuth();
	useNotificationsRealtime();
	useFriendshipsRealtime();
	useEventsRealtime();

	return (
		<ThemeProvider>
			<HashRouter>
				<AppRoutes />
			</HashRouter>
		</ThemeProvider>
	);
}

export default App;
