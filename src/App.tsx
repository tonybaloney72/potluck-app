import { BrowserRouter } from "react-router";
import { useAuth } from "./hooks/useAuth";
import { useInitialDataLoader } from "./hooks/useInitialDataLoader";
import { ThemeProvider } from "./context/ThemeContext";
import { AppRoutes } from "./routes/AppRoutes";
import { useNotificationsRealtime } from "./hooks/useNotificationsRealTime";
import { useFriendshipsRealtime } from "./hooks/useFriendshipsRealtime";
import { useEventsRealtime } from "./hooks/useEventsRealtime";
import { useMessagesRealtime } from "./hooks/useMessagesRealtime";
import { useConversationsRealtime } from "./hooks/useConversationsRealtime";

function App() {
	useAuth();
	useInitialDataLoader();
	useNotificationsRealtime();
	useFriendshipsRealtime();
	useEventsRealtime();
	useMessagesRealtime();
	useConversationsRealtime();

	return (
		<ThemeProvider>
			<BrowserRouter>
				<AppRoutes />
			</BrowserRouter>
		</ThemeProvider>
	);
}

export default App;
