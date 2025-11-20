import { configureStore } from "@reduxjs/toolkit";
import authReducer from "./slices/authSlice";
import friendsReducer from "./slices/friendsSlice";
import messagesReducer from "./slices/messagesSlice";
import usersReducer from "./slices/usersSlice";
import conversationsReducer from "./slices/conversationsSlice";

export const store = configureStore({
	reducer: {
		auth: authReducer,
		friends: friendsReducer,
		messages: messagesReducer,
		users: usersReducer,
		conversations: conversationsReducer,
	},
});

export type RootState = ReturnType<typeof store.getState>;
export type AppDispatch = typeof store.dispatch;
