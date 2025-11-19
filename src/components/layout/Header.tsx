import { useState, useEffect, useRef } from "react";
import { Link, useNavigate } from "react-router";
import { motion, AnimatePresence } from "motion/react";
import { useAppSelector, useAppDispatch } from "../../store/hooks";
import { signOut } from "../../store/slices/authSlice";
import { FaUser, FaCog, FaSignOutAlt } from "react-icons/fa";
import { LuCookingPot } from "react-icons/lu";

export const Header = () => {
	const { profile } = useAppSelector(state => state.auth);
	const dispatch = useAppDispatch();
	const navigate = useNavigate();
	const [isDropdownOpen, setIsDropdownOpen] = useState(false);
	const dropdownRef = useRef<HTMLDivElement>(null);

	const handleSignOut = () => {
		dispatch(signOut());
		setIsDropdownOpen(false);
		navigate("/login");
	};

	const handleSettings = () => {
		setIsDropdownOpen(false);
		navigate("/profile");
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
		};

		if (isDropdownOpen) {
			document.addEventListener("mousedown", handleClickOutside);
		}

		return () => {
			document.removeEventListener("mousedown", handleClickOutside);
		};
	}, [isDropdownOpen]);

	return (
		<header className='bg-secondary border-b border-border shadow'>
			<div className='max-w-7xl mx-auto px-4 sm:px-6 lg:px-8'>
				<div className='flex justify-between items-center h-16'>
					<Link
						to='/'
						className='text-xl font-bold text-text-primary flex items-center'>
						Potluck <LuCookingPot className='w-6 h-6 inline-block ml-2' />
					</Link>
					<nav className='flex items-center gap-4'>
						<div className='relative' ref={dropdownRef}>
							<button
								onClick={() => setIsDropdownOpen(!isDropdownOpen)}
								className='flex items-center justify-center w-10 h-10 rounded-full bg-tertiary text-text-primary hover:bg-border cursor-pointer transition-all duration-200 hover:opacity-90 active:opacity-75'
								aria-label='User menu'>
								{profile?.avatar_url ? (
									<img
										src={profile.avatar_url}
										alt='User avatar'
										className='w-full h-full rounded-full object-cover'
									/>
								) : (
									<FaUser className='w-5 h-5' />
								)}
							</button>

							<AnimatePresence>
								{isDropdownOpen && (
									<motion.div
										initial={{ opacity: 0, y: -10, scale: 0.95 }}
										animate={{ opacity: 1, y: 0, scale: 1 }}
										exit={{ opacity: 0, y: -10, scale: 0.95 }}
										transition={{ duration: 0.2, ease: "easeOut" }}
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
															alt='User avatar'
															className='w-8 h-8 rounded-full object-cover'
														/>
													) : (
														<div className='w-8 h-8 rounded-full bg-tertiary flex items-center justify-center'>
															<FaUser className='w-4 h-4 text-text-primary' />
														</div>
													)}
													<span className='text-sm font-medium text-text-primary truncate'>
														{profile.name.split(" ")[0]}
													</span>
												</div>
											</motion.div>
										)}
										{/* Menu items */}
										<div className='py-1'>
											<motion.button
												whileHover={{ backgroundColor: "var(--bg-tertiary)" }}
												whileTap={{ scale: 0.98 }}
												onClick={handleSettings}
												className='w-full flex items-center gap-3 px-4 py-2 text-sm text-text-primary transition-colors duration-50 hover:cursor-pointer'>
												<FaCog className='w-4 h-4' />
												Settings
											</motion.button>
											<motion.button
												whileHover={{ backgroundColor: "var(--bg-tertiary)" }}
												whileTap={{ scale: 0.98 }}
												onClick={handleSignOut}
												className='w-full flex items-center gap-3 px-4 py-2 text-sm text-text-primary transition-colors duration-50 hover:cursor-pointer'>
												<FaSignOutAlt className='w-4 h-4' />
												Log Out
											</motion.button>
										</div>
									</motion.div>
								)}
							</AnimatePresence>
						</div>
					</nav>
				</div>
			</div>
		</header>
	);
};
