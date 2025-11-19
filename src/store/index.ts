import { configureStore } from "@reduxjs/toolkit";
import authReducer from "./slices/authSlice";
import friendsReducer from "./slices/friendsSlice";
import messagesReducer from "./slices/messagesSlice";

export const store = configureStore({
	reducer: {
		auth: authReducer,
		friends: friendsReducer,
		messages: messagesReducer,
	},
});

export type RootState = ReturnType<typeof store.getState>;
export type AppDispatch = typeof store.dispatch;
