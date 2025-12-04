import { Header } from "./Header";
import { AnimatePresence } from "motion/react";
import { useLocation } from "react-router";
import { useEffect, useRef } from "react";

interface LayoutProps {
	children: React.ReactNode;
}

export function Layout({ children }: LayoutProps) {
	const location = useLocation();
	const scrollContainerRef = useRef<HTMLDivElement>(null);

	// Scroll to top when route changes
	useEffect(() => {
		const scrollToTop = () => {
			if (scrollContainerRef.current) {
				// Use instant scroll for immediate positioning
				scrollContainerRef.current.scrollTop = 0;
			}
		};

		// Immediate scroll to prevent any content from pushing it down
		scrollToTop();

		// Also use requestAnimationFrame to ensure it happens after render
		requestAnimationFrame(() => {
			scrollToTop();
			// Additional check after a short delay for async content
			setTimeout(scrollToTop, 50);
			setTimeout(scrollToTop, 200);
		});
	}, [location.pathname]);

	return (
		<div className='h-full flex flex-col'>
			<Header />
			<div ref={scrollContainerRef} className='flex-1 overflow-y-auto'>
				<AnimatePresence mode='wait'>{children}</AnimatePresence>
			</div>
		</div>
	);
}
