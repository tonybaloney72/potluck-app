import { configureStore, combineReducers } from "@reduxjs/toolkit";
import authReducer, { signOut } from "./slices/authSlice";
import friendsReducer from "./slices/friendsSlice";
import messagesReducer from "./slices/messagesSlice";
import usersReducer from "./slices/usersSlice";
import conversationsReducer from "./slices/conversationsSlice";
import notificationsReducer from "./slices/notificationsSlice";
import eventsReducer from "./slices/eventsSlice";

const appReducer = combineReducers({
	auth: authReducer,
	friends: friendsReducer,
	messages: messagesReducer,
	users: usersReducer,
	conversations: conversationsReducer,
	notifications: notificationsReducer,
	events: eventsReducer,
});

const rootReducer = (
	state: ReturnType<typeof appReducer> | undefined,
	action: any,
) => {
	// Reset all state when signOut is fulfilled
	if (signOut.fulfilled.match(action)) {
		// Return a new state with all slices reset to their initial state
		return appReducer(undefined, action);
	}
	return appReducer(state, action);
};

export const store = configureStore({
	reducer: rootReducer,
});

export type RootState = ReturnType<typeof store.getState>;
export type AppDispatch = typeof store.dispatch;
