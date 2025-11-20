import { BrowserRouter } from "react-router";
import { useAuth } from "./hooks/useAuth";
import { ThemeProvider } from "./context/ThemeContext";
import { AppRoutes } from "./routes/AppRoutes";
import { useNotificationsRealtime } from "./hooks/notificationsRealTime";

function App() {
	useAuth();
	useNotificationsRealtime();

	return (
		<ThemeProvider>
			<BrowserRouter>
				<AppRoutes />
			</BrowserRouter>
		</ThemeProvider>
	);
}

export default App;
