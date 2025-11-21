import { BrowserRouter } from "react-router";
import { useAuth } from "./hooks/useAuth";
import { ThemeProvider } from "./context/ThemeContext";
import { AppRoutes } from "./routes/AppRoutes";
import { useNotificationsRealtime } from "./hooks/notificationsRealTime";
import { useFriendshipsRealtime } from "./hooks/useFriendshipsRealtime";

function App() {
	useAuth();
	useNotificationsRealtime();
	useFriendshipsRealtime();

	return (
		<ThemeProvider>
			<BrowserRouter>
				<AppRoutes />
			</BrowserRouter>
		</ThemeProvider>
	);
}

export default App;
