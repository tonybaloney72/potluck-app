import { Routes, Route } from "react-router";
import { HomePage } from "../pages/HomePage";
import { LoginPage } from "../pages/LoginPage";
import { RegisterPage } from "../pages/RegisterPage";
import { ProfilePage } from "../pages/ProfilePage";
import { ProtectedRoute } from "../components/common/ProtectedRoute";
import { Layout } from "../components/layout/Layout";

export function AppRoutes() {
	return (
		<Routes>
			<Route
				path='/'
				element={
					<Layout>
						<ProtectedRoute>
							<HomePage />
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
			<Route path='/login' element={<LoginPage />} />
			<Route path='/register' element={<RegisterPage />} />
		</Routes>
	);
}
