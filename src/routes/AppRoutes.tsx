import { Routes, Route, Navigate } from "react-router";
import { LoginPage } from "../pages/LoginPage";
import { RegisterPage } from "../pages/RegisterPage";
import { ProfilePage } from "../pages/ProfilePage";
import { ProtectedRoute } from "../components/common/ProtectedRoute";
import { Layout } from "../components/layout/Layout";
import { FriendsPage } from "../pages/FriendsPage";
import { MessagesPage } from "../pages/MessagesPage";
import { HomePage } from "../pages/HomePage";
import { MyEventsPage } from "../pages/MyEventsPage";
import { EventDetailPage } from "../pages/EventDetailsPage";
import { CreateEventPage } from "../pages/CreateEventPage";
import { DiscoverPage } from "../pages/DiscoverPage";
import { ForgotPassword } from "../pages/ForgotPassword";
import { PasswordReset } from "../pages/PasswordReset";
import { EmailVerificationPage } from "../pages/EmailVerificationPage";
import { ReactivateAccountPage } from "../pages/ReactivateAccountPage";
import { ViewProfilePage } from "../pages/ViewProfilePage";
import { PageTransition } from "../components/common/PageTransition";
import { PendingRequestsPage } from "../pages/PendingRequestsPage";

export function AppRoutes() {
	return (
		<Routes>
			<Route
				path='/'
				element={
					<Layout>
						<ProtectedRoute>
							<PageTransition>
								<HomePage />
							</PageTransition>
						</ProtectedRoute>
					</Layout>
				}
			/>
			<Route
				path='/events'
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
				path='/profile/:userId'
				element={
					<Layout>
						<ProtectedRoute>
							<PageTransition>
								<ViewProfilePage />
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
				path='/messages/:conversationId'
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
				path='/discover'
				element={
					<Layout>
						<ProtectedRoute>
							<PageTransition>
								<DiscoverPage />
							</PageTransition>
						</ProtectedRoute>
					</Layout>
				}
			/>
			<Route
				path='/login'
				element={
					// <PageTransition>
					<LoginPage />
					// </PageTransition>
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
			<Route
				path='/reactivate'
				element={
					<PageTransition>
						<ReactivateAccountPage />
					</PageTransition>
				}
			/>
			<Route
				path='/pending-requests'
				element={
					<ProtectedRoute>
						<Layout>
							<PendingRequestsPage />
						</Layout>
					</ProtectedRoute>
				}
			/>

			<Route path='*' element={<Navigate to='/' replace />} />
		</Routes>
	);
}
