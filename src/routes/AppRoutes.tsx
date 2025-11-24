import { Routes, Route, Navigate } from "react-router";
import { LoginPage } from "../pages/LoginPage";
import { RegisterPage } from "../pages/RegisterPage";
import { ProfilePage } from "../pages/ProfilePage";
import { ProtectedRoute } from "../components/common/ProtectedRoute";
import { Layout } from "../components/layout/Layout";
import { FriendsPage } from "../pages/FriendsPage";
import { MessagesPage } from "../pages/MessagesPage";
import { MyEventsPage } from "../pages/MyEventsPage";
import { EventDetailPage } from "../pages/EventDetailsPage";
import { CreateEventPage } from "../pages/CreateEventPage";
import { ForgotPassword } from "../pages/ForgotPassword";
import { PasswordReset } from "../pages/PasswordReset";
import { EmailVerificationPage } from "../pages/EmailVerificationPage";

export function AppRoutes() {
	return (
		<Routes>
			<Route
				path='/'
				element={
					<Layout>
						<ProtectedRoute>
							<MyEventsPage />
						</ProtectedRoute>
					</Layout>
				}
			/>
			<Route
				path='/profile'
				element={
					<Layout>
						<ProtectedRoute>
							<ProfilePage />
						</ProtectedRoute>
					</Layout>
				}
			/>
			<Route
				path='/friends'
				element={
					<Layout>
						<ProtectedRoute>
							<FriendsPage />
						</ProtectedRoute>
					</Layout>
				}
			/>
			<Route
				path='/messages'
				element={
					<Layout>
						<ProtectedRoute>
							<MessagesPage />
						</ProtectedRoute>
					</Layout>
				}
			/>
			<Route
				path='/events/:eventId'
				element={
					<Layout>
						<ProtectedRoute>
							<EventDetailPage />
						</ProtectedRoute>
					</Layout>
				}
			/>
			<Route
				path='/create-event'
				element={
					<Layout>
						<ProtectedRoute>
							<CreateEventPage />
						</ProtectedRoute>
					</Layout>
				}
			/>
			<Route path='/login' element={<LoginPage />} />
			<Route path='/register' element={<RegisterPage />} />
			<Route path='/forgot-password' element={<ForgotPassword />} />
			<Route path='/reset-password' element={<PasswordReset />} />
			<Route path='/email-verification' element={<EmailVerificationPage />} />

			<Route path='*' element={<Navigate to='/' replace />} />
		</Routes>
	);
}
