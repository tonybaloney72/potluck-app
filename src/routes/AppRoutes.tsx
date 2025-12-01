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
import { PageTransition } from "../components/common/PageTransition";

export function AppRoutes() {
	return (
		<Routes>
			<Route
				path='/'
				element={
					<Layout>
						<ProtectedRoute>
							<PageTransition>
								<MyEventsPage />
							</PageTransition>
						</ProtectedRoute>
					</Layout>
				}
			/>
			<Route
				path='/profile'
				element={
					<Layout>
						<ProtectedRoute>
							<PageTransition>
								<ProfilePage />
							</PageTransition>
						</ProtectedRoute>
					</Layout>
				}
			/>
			<Route
				path='/friends'
				element={
					<Layout>
						<ProtectedRoute>
							<PageTransition>
								<FriendsPage />
							</PageTransition>
						</ProtectedRoute>
					</Layout>
				}
			/>
			<Route
				path='/messages'
				element={
					<Layout>
						<ProtectedRoute>
							<PageTransition>
								<MessagesPage />
							</PageTransition>
						</ProtectedRoute>
					</Layout>
				}
			/>
			<Route
				path='/events/:eventId'
				element={
					<Layout>
						<ProtectedRoute>
							<PageTransition>
								<EventDetailPage />
							</PageTransition>
						</ProtectedRoute>
					</Layout>
				}
			/>
			<Route
				path='/create-event'
				element={
					<Layout>
						<ProtectedRoute>
							<PageTransition>
								<CreateEventPage />
							</PageTransition>
						</ProtectedRoute>
					</Layout>
				}
			/>
			<Route
				path='/login'
				element={
					<PageTransition>
						<LoginPage />
					</PageTransition>
				}
			/>
			<Route
				path='/register'
				element={
					<PageTransition>
						<RegisterPage />
					</PageTransition>
				}
			/>
			<Route
				path='/forgot-password'
				element={
					<PageTransition>
						<ForgotPassword />
					</PageTransition>
				}
			/>
			<Route
				path='/reset-password'
				element={
					<PageTransition>
						<PasswordReset />
					</PageTransition>
				}
			/>
			<Route
				path='/email-verification'
				element={
					<PageTransition>
						<EmailVerificationPage />
					</PageTransition>
				}
			/>

			<Route path='*' element={<Navigate to='/' replace />} />
		</Routes>
	);
}
