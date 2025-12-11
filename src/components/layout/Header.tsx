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
	FaPlus,
} from "react-icons/fa";
import { LuCookingPot } from "react-icons/lu";
import type { IconType } from "react-icons";
import { useTheme } from "../../context/ThemeContext";
import type { ThemePreference } from "../../types";
import { NotificationDropdown } from "../notifications/NotificationDropdown";
import { Button } from "../common/Button";
import { Avatar } from "../common/Avatar";

// Navigation items configuration
const navItems = [
	{
		to: "/events",
		icon: LuCookingPot,
		label: "My Events",
		ariaLabel: "My Events",
	},
	{
		to: "/friends",
		icon: FaUsers,
		label: "Friends",
		ariaLabel: "Friends",
	},
	{
		to: "/messages",
		icon: FaEnvelope,
		label: "Messages",
		ariaLabel: "Messages",
	},
] as const;

// Desktop navigation link styles
const desktopNavLinkClass =
	"text-primary hover:text-accent hover:bg-tertiary rounded-md transition-all duration-200 p-2 min-w-[44px] min-h-[44px] flex items-center justify-center";

// Mobile navigation link styles
const mobileNavLinkClass =
	"flex items-center gap-3 px-4 py-3 text-primary hover:bg-tertiary rounded-md transition-colors min-h-[44px]";

// Mobile menu button styles
const mobileMenuButtonClass =
	"w-full flex items-center gap-3 px-4 py-3 text-sm text-primary hover:bg-tertiary rounded-md transition-colors min-h-[44px]";

// Icon button styles (for close/toggle buttons)
const iconButtonClass =
	"flex items-center justify-center w-11 h-11 text-primary hover:bg-tertiary rounded-md transition-colors min-w-[44px] min-h-[44px]";

// Dropdown menu item styles
const dropdownMenuItemClass =
	"w-full flex items-center gap-3 px-4 py-3 text-sm text-primary transition-colors duration-50 hover:cursor-pointer min-h-[44px]";

// New Event button component
const NewEventButton = ({
	onClick,
	className = "",
}: {
	onClick: () => void;
	className?: string;
}) => (
	<Button
		onClick={onClick}
		variant='primary'
		className={`flex items-center gap-3 justify-center min-h-[44px] ${className}`}>
		<FaPlus className='w-5 h-5' aria-hidden='true' />
		<span>New Event</span>
	</Button>
);

// Desktop dropdown menu item component
interface DropdownMenuItemProps {
	icon: IconType;
	label: string;
	onClick: () => void;
	ariaLabel?: string;
}

const DropdownMenuItem = ({
	icon: Icon,
	label,
	onClick,
	ariaLabel,
}: DropdownMenuItemProps) => (
	<motion.button
		whileHover={{
			backgroundColor: "var(--bg-tertiary)",
		}}
		whileTap={{ scale: 0.98 }}
		onClick={onClick}
		className={dropdownMenuItemClass}
		role='menuitem'
		aria-label={ariaLabel}
		type='button'>
		<Icon className='w-4 h-4' aria-hidden='true' />
		{label}
	</motion.button>
);

// Mobile menu button component
interface MobileMenuButtonProps {
	icon: IconType;
	label: string;
	onClick: () => void;
	ariaLabel?: string;
}

const MobileMenuButton = ({
	icon: Icon,
	label,
	onClick,
	ariaLabel,
}: MobileMenuButtonProps) => (
	<button
		onClick={onClick}
		className={mobileMenuButtonClass}
		aria-label={ariaLabel}
		type='button'>
		<Icon className='w-5 h-5' aria-hidden='true' />
		<span>{label}</span>
	</button>
);

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

	const handleCreateEvent = () => {
		setIsMobileMenuOpen(false);
		navigate("/create-event");
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
									<NewEventButton onClick={handleCreateEvent} />
									{navItems.map(item => {
										const Icon = item.icon;
										return (
											<Link
												key={item.to}
												to={item.to}
												className={desktopNavLinkClass}
												aria-label={item.ariaLabel}>
												<Icon className='w-6 h-6' aria-hidden='true' />
											</Link>
										);
									})}
									<NotificationDropdown />
									<div className='flex items-center gap-4'>
										<div className='relative' ref={dropdownRef}>
											<button
												onClick={() => setIsDropdownOpen(!isDropdownOpen)}
												className='flex items-center justify-center w-11 h-11 rounded-full bg-tertiary text-primary hover:bg-border active:scale-95 cursor-pointer transition-all duration-200 min-w-[44px] min-h-[44px] overflow-hidden'
												aria-label={`User menu for ${profile?.name || "user"}`}
												aria-expanded={isDropdownOpen}
												aria-haspopup='menu'
												type='button'>
												{profile ?
													<Avatar
														user={profile}
														size='sm'
														className='w-full h-full object-cover'
													/>
												:	<FaUser className='w-5 h-5' aria-hidden='true' />}
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
																	<Avatar user={profile} size='sm' />
																	<span className='text-sm font-medium text-primary truncate'>
																		{profile.name.split(" ")[0]}
																	</span>
																</div>
															</motion.div>
														)}
														{/* Menu items */}
														<div className='py-1' role='group'>
															<DropdownMenuItem
																icon={FaCog}
																label='Settings'
																onClick={handleSettings}
															/>
															<DropdownMenuItem
																icon={theme === "dark" ? FaSun : FaMoon}
																label={
																	theme === "dark" ? "Light Mode" : "Dark Mode"
																}
																onClick={() =>
																	handleThemeChange(
																		theme === "dark" ? "light" : "dark",
																	)
																}
																ariaLabel={`Switch to ${
																	theme === "dark" ? "light" : "dark"
																} mode`}
															/>
															<DropdownMenuItem
																icon={FaSignOutAlt}
																label='Log Out'
																onClick={handleSignOut}
															/>
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
										className={iconButtonClass}
										aria-label='Toggle mobile menu'
										aria-expanded={isMobileMenuOpen}
										aria-controls='mobile-menu'
										type='button'>
										{isMobileMenuOpen ?
											<FaTimes className='w-6 h-6' aria-hidden='true' />
										:	<FaBars className='w-6 h-6' aria-hidden='true' />}
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
										className={iconButtonClass}
										aria-label='Close menu'
										type='button'>
										<FaTimes className='w-5 h-5' aria-hidden='true' />
									</button>
								</div>

								{/* Navigation Links */}
								<nav className='p-4 space-y-2' aria-label='Mobile navigation'>
									<NewEventButton
										onClick={handleCreateEvent}
										className='w-full'
									/>
									{navItems.map(item => {
										const Icon = item.icon;
										return (
											<Link
												key={item.to}
												to={item.to}
												onClick={handleMobileNavClick}
												className={mobileNavLinkClass}>
												<Icon className='w-5 h-5' aria-hidden='true' />
												<span>{item.label}</span>
											</Link>
										);
									})}
								</nav>

								{/* User Section */}
								<div className='p-4 border-t border-border space-y-2'>
									{profile?.name && (
										<div className='flex items-center gap-3 px-4 py-3 mb-2'>
											<Avatar user={profile} size='md' />
											<span className='text-sm font-medium text-primary truncate'>
												{profile.name}
											</span>
										</div>
									)}
									<MobileMenuButton
										icon={FaCog}
										label='Settings'
										onClick={() => {
											handleSettings();
											setIsMobileMenuOpen(false);
										}}
									/>
									<MobileMenuButton
										icon={theme === "dark" ? FaSun : FaMoon}
										label={theme === "dark" ? "Light Mode" : "Dark Mode"}
										onClick={() => {
											handleThemeChange(theme === "dark" ? "light" : "dark");
										}}
										ariaLabel={`Switch to ${
											theme === "dark" ? "light" : "dark"
										} mode`}
									/>
									<MobileMenuButton
										icon={FaSignOutAlt}
										label='Log Out'
										onClick={() => {
											handleSignOut();
											setIsMobileMenuOpen(false);
										}}
									/>
								</div>
							</div>
						</motion.div>
					</>
				)}
			</AnimatePresence>
		</>
	);
};
