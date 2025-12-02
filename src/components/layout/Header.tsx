import { useState, useEffect, useRef } from "react";
import { Link, useNavigate } from "react-router";
import { motion, AnimatePresence } from "motion/react";
import { useAppSelector, useAppDispatch } from "../../store/hooks";
import { signOut } from "../../store/slices/authSlice";
import {
	FaUser,
	FaCog,
	FaSignOutAlt,
	FaEnvelope,
	FaUsers,
	FaMoon,
	FaSun,
	FaBars,
	FaTimes,
} from "react-icons/fa";
import { LuCookingPot } from "react-icons/lu";
import { useTheme } from "../../context/ThemeContext";
import type { ThemePreference } from "../../types";
import { NotificationDropdown } from "../notifications/NotificationDropdown";

export const Header = () => {
	const { profile } = useAppSelector(state => state.auth);
	const dispatch = useAppDispatch();
	const navigate = useNavigate();
	const [isDropdownOpen, setIsDropdownOpen] = useState(false);
	const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
	const dropdownRef = useRef<HTMLDivElement>(null);
	const mobileMenuRef = useRef<HTMLDivElement>(null);
	const { theme, setTheme } = useTheme();

	const handleThemeChange = (newTheme: ThemePreference) => {
		setTheme(newTheme);
	};

	const handleSignOut = () => {
		dispatch(signOut());
		setIsDropdownOpen(false);
		navigate("/login");
	};

	const handleSettings = () => {
		setIsDropdownOpen(false);
		setIsMobileMenuOpen(false);
		navigate("/profile");
	};

	const handleMobileNavClick = () => {
		setIsMobileMenuOpen(false);
	};

	// Close dropdown when clicking outside
	useEffect(() => {
		const handleClickOutside = (event: MouseEvent) => {
			if (
				dropdownRef.current &&
				!dropdownRef.current.contains(event.target as Node)
			) {
				setIsDropdownOpen(false);
			}
			if (
				mobileMenuRef.current &&
				!mobileMenuRef.current.contains(event.target as Node)
			) {
				setIsMobileMenuOpen(false);
			}
		};

		if (isDropdownOpen || isMobileMenuOpen) {
			document.addEventListener("mousedown", handleClickOutside);
		}

		return () => {
			document.removeEventListener("mousedown", handleClickOutside);
		};
	}, [isDropdownOpen, isMobileMenuOpen]);

	// Prevent body scroll when mobile menu is open
	useEffect(() => {
		if (isMobileMenuOpen) {
			document.body.style.overflow = "hidden";
		} else {
			document.body.style.overflow = "";
		}
		return () => {
			document.body.style.overflow = "";
		};
	}, [isMobileMenuOpen]);

	// const posSuccess = (pos: GeolocationPosition) => {
	// 	const lat = pos.coords.latitude;
	// 	const lng = pos.coords.longitude;
	// 	console.log(pos.coords);
	// 	console.log(lat, lng);
	// };

	// const posError = (err: GeolocationPositionError) => {
	// 	console.log(err);
	// };

	// navigator.geolocation.getCurrentPosition(posSuccess, posError);

	return (
		<>
			<header
				className='bg-secondary border-b border-border shadow'
				role='banner'>
				<nav aria-label='Main navigation'>
					<div className='w-full px-4 md:px-8'>
						<div className='max-w-7xl mx-auto'>
							<div className='flex justify-between items-center h-16'>
								<Link
									to='/'
									className='text-xl font-bold text-primary flex items-center'
									aria-label='Potluck - Home'>
									Potluck{" "}
									<LuCookingPot
										className='w-6 h-6 inline-block ml-2'
										aria-hidden='true'
									/>
								</Link>

								{/* Desktop Navigation */}
								<div className='hidden md:flex items-center gap-4'>
									<Link
										to='/friends'
										className='text-primary hover:text-accent hover:bg-tertiary rounded-md transition-all duration-200 p-2 min-w-[44px] min-h-[44px] flex items-center justify-center'
										aria-label='Friends'>
										<FaUsers className='w-6 h-6' aria-hidden='true' />
									</Link>

									<Link
										to='/messages'
										className='text-primary hover:text-accent hover:bg-tertiary rounded-md transition-all duration-200 p-2 min-w-[44px] min-h-[44px] flex items-center justify-center'
										aria-label='Messages'>
										<FaEnvelope className='w-6 h-6' aria-hidden='true' />
									</Link>
									<NotificationDropdown />
									<div className='flex items-center gap-4'>
										<div className='relative' ref={dropdownRef}>
											<button
												onClick={() => setIsDropdownOpen(!isDropdownOpen)}
												className='flex items-center justify-center w-11 h-11 rounded-full bg-tertiary text-primary hover:bg-border active:scale-95 cursor-pointer transition-all duration-200 min-w-[44px] min-h-[44px]'
												aria-label={`User menu for ${profile?.name || "user"}`}
												aria-expanded={isDropdownOpen}
												aria-haspopup='menu'
												type='button'>
												{profile?.avatar_url ? (
													<img
														src={profile.avatar_url}
														alt={`${profile?.name || "User"} avatar`}
														className='w-full h-full rounded-full object-cover'
													/>
												) : (
													<FaUser className='w-5 h-5' aria-hidden='true' />
												)}
											</button>

											<AnimatePresence>
												{isDropdownOpen && (
													<motion.div
														initial={{ opacity: 0, y: -10, scale: 0.95 }}
														animate={{ opacity: 1, y: 0, scale: 1 }}
														exit={{ opacity: 0, y: -10, scale: 0.95 }}
														transition={{ duration: 0.2, ease: "easeOut" }}
														role='menu'
														aria-label='User menu'
														className='absolute right-0 mt-2 w-48 bg-secondary border border-border rounded-md shadow-lg z-50'>
														{/* User info header */}
														{profile?.name && (
															<motion.div
																initial={{ opacity: 0 }}
																animate={{ opacity: 1 }}
																transition={{ delay: 0.1 }}
																className='px-4 py-3 border-b border-border'>
																<div className='flex items-center gap-3'>
																	{profile.avatar_url ? (
																		<img
																			src={profile.avatar_url}
																			alt={`${profile.name} avatar`}
																			className='w-8 h-8 rounded-full object-cover'
																		/>
																	) : (
																		<div className='w-8 h-8 rounded-full bg-tertiary flex items-center justify-center'>
																			<FaUser
																				className='w-4 h-4 text-primary'
																				aria-hidden='true'
																			/>
																		</div>
																	)}
																	<span className='text-sm font-medium text-primary truncate'>
																		{profile.name.split(" ")[0]}
																	</span>
																</div>
															</motion.div>
														)}
														{/* Menu items */}
														<div className='py-1' role='group'>
															<motion.button
																whileHover={{
																	backgroundColor: "var(--bg-tertiary)",
																}}
																whileTap={{ scale: 0.98 }}
																onClick={handleSettings}
																className='w-full flex items-center gap-3 px-4 py-3 text-sm text-primary transition-colors duration-50 hover:cursor-pointer min-h-[44px]'
																role='menuitem'
																type='button'>
																<FaCog className='w-4 h-4' aria-hidden='true' />
																Settings
															</motion.button>
															<motion.button
																whileHover={{
																	backgroundColor: "var(--bg-tertiary)",
																}}
																whileTap={{ scale: 0.98 }}
																onClick={() =>
																	handleThemeChange(
																		theme === "dark" ? "light" : "dark",
																	)
																}
																className='w-full flex items-center gap-3 px-4 py-3 text-sm text-primary transition-colors duration-50 hover:cursor-pointer min-h-[44px]'
																role='menuitem'
																aria-label={`Switch to ${
																	theme === "dark" ? "light" : "dark"
																} mode`}
																type='button'>
																{theme === "dark" ? (
																	<FaSun
																		className='w-4 h-4'
																		aria-hidden='true'
																	/>
																) : (
																	<FaMoon
																		className='w-4 h-4'
																		aria-hidden='true'
																	/>
																)}
																{theme === "dark" ? "Light Mode" : "Dark Mode"}
															</motion.button>
															<motion.button
																whileHover={{
																	backgroundColor: "var(--bg-tertiary)",
																}}
																whileTap={{ scale: 0.98 }}
																onClick={handleSignOut}
																className='w-full flex items-center gap-3 px-4 py-3 text-sm text-primary transition-colors duration-50 hover:cursor-pointer min-h-[44px]'
																role='menuitem'
																type='button'>
																<FaSignOutAlt
																	className='w-4 h-4'
																	aria-hidden='true'
																/>
																Log Out
															</motion.button>
														</div>
													</motion.div>
												)}
											</AnimatePresence>
										</div>
									</div>
								</div>

								{/* Mobile Navigation - Notification & Menu Button */}
								<div className='md:hidden flex items-center gap-2'>
									<NotificationDropdown />
									<button
										onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
										className='flex items-center justify-center w-11 h-11 text-primary hover:bg-tertiary rounded-md transition-colors min-w-[44px] min-h-[44px]'
										aria-label='Toggle mobile menu'
										aria-expanded={isMobileMenuOpen}
										aria-controls='mobile-menu'
										type='button'>
										{isMobileMenuOpen ? (
											<FaTimes className='w-6 h-6' aria-hidden='true' />
										) : (
											<FaBars className='w-6 h-6' aria-hidden='true' />
										)}
									</button>
								</div>
							</div>
						</div>
					</div>
				</nav>
			</header>

			{/* Mobile Menu Overlay */}
			<AnimatePresence>
				{isMobileMenuOpen && (
					<>
						{/* Backdrop */}
						<motion.div
							initial={{ opacity: 0 }}
							animate={{ opacity: 1 }}
							exit={{ opacity: 0 }}
							transition={{ duration: 0.2 }}
							className='fixed inset-0 bg-black/50 z-40 md:hidden'
							onClick={() => setIsMobileMenuOpen(false)}
						/>

						{/* Mobile Menu */}
						<motion.div
							ref={mobileMenuRef}
							id='mobile-menu'
							initial={{ x: "-100%" }}
							animate={{ x: 0 }}
							exit={{ x: "-100%" }}
							transition={{ duration: 0.3, ease: "easeInOut" }}
							role='dialog'
							aria-modal='true'
							aria-label='Mobile navigation menu'
							className='fixed inset-y-0 left-0 w-64 bg-secondary border-r border-border z-50 md:hidden overflow-y-auto'>
							<div className='flex flex-col h-full'>
								{/* Header with close button */}
								<div className='flex items-center justify-between p-4 border-b border-border'>
									<h2 className='text-lg font-semibold text-primary'>Menu</h2>
									<button
										onClick={() => setIsMobileMenuOpen(false)}
										className='flex items-center justify-center w-11 h-11 text-primary hover:bg-tertiary rounded-md transition-colors min-w-[44px] min-h-[44px]'
										aria-label='Close menu'
										type='button'>
										<FaTimes className='w-5 h-5' aria-hidden='true' />
									</button>
								</div>

								{/* Navigation Links */}
								<nav className='p-4 space-y-2' aria-label='Mobile navigation'>
									<Link
										to='/'
										onClick={handleMobileNavClick}
										className='flex items-center gap-3 px-4 py-3 text-primary hover:bg-tertiary rounded-md transition-colors min-h-[44px]'>
										<LuCookingPot className='w-5 h-5' aria-hidden='true' />
										<span>My Events</span>
									</Link>
									<Link
										to='/friends'
										onClick={handleMobileNavClick}
										className='flex items-center gap-3 px-4 py-3 text-primary hover:bg-tertiary rounded-md transition-colors min-h-[44px]'>
										<FaUsers className='w-5 h-5' aria-hidden='true' />
										<span>Friends</span>
									</Link>
									<Link
										to='/messages'
										onClick={handleMobileNavClick}
										className='flex items-center gap-3 px-4 py-3 text-primary hover:bg-tertiary rounded-md transition-colors min-h-[44px]'>
										<FaEnvelope className='w-5 h-5' aria-hidden='true' />
										<span>Messages</span>
									</Link>
								</nav>

								{/* User Section */}
								<div className='p-4 border-t border-border space-y-2'>
									{profile?.name && (
										<div className='flex items-center gap-3 px-4 py-3 mb-2'>
											{profile.avatar_url ? (
												<img
													src={profile.avatar_url}
													alt={`${profile.name} avatar`}
													className='w-10 h-10 rounded-full object-cover'
												/>
											) : (
												<div className='w-10 h-10 rounded-full bg-tertiary flex items-center justify-center'>
													<FaUser
														className='w-5 h-5 text-primary'
														aria-hidden='true'
													/>
												</div>
											)}
											<span className='text-sm font-medium text-primary truncate'>
												{profile.name}
											</span>
										</div>
									)}
									<button
										onClick={() => {
											handleSettings();
											setIsMobileMenuOpen(false);
										}}
										className='w-full flex items-center gap-3 px-4 py-3 text-sm text-primary hover:bg-tertiary rounded-md transition-colors min-h-[44px]'
										type='button'>
										<FaCog className='w-5 h-5' aria-hidden='true' />
										<span>Settings</span>
									</button>
									<button
										onClick={() => {
											handleThemeChange(theme === "dark" ? "light" : "dark");
										}}
										className='w-full flex items-center gap-3 px-4 py-3 text-sm text-primary hover:bg-tertiary rounded-md transition-colors min-h-[44px]'
										aria-label={`Switch to ${
											theme === "dark" ? "light" : "dark"
										} mode`}
										type='button'>
										{theme === "dark" ? (
											<FaSun className='w-5 h-5' aria-hidden='true' />
										) : (
											<FaMoon className='w-5 h-5' aria-hidden='true' />
										)}
										<span>{theme === "dark" ? "Light Mode" : "Dark Mode"}</span>
									</button>
									<button
										onClick={() => {
											handleSignOut();
											setIsMobileMenuOpen(false);
										}}
										className='w-full flex items-center gap-3 px-4 py-3 text-sm text-primary hover:bg-tertiary rounded-md transition-colors min-h-[44px]'
										type='button'>
										<FaSignOutAlt className='w-5 h-5' aria-hidden='true' />
										<span>Log Out</span>
									</button>
								</div>
							</div>
						</motion.div>
					</>
				)}
			</AnimatePresence>
		</>
	);
};
