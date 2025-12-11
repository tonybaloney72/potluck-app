import { motion } from "motion/react";
import { useRef, useEffect } from "react";

export interface Tab {
	id: string;
	label: string;
	count?: number;
}

interface TabsProps {
	tabs: Tab[];
	activeTab: string;
	onTabChange: (tabId: string) => void;
	className?: string;
}

export const Tabs = ({
	tabs,
	activeTab,
	onTabChange,
	className = "",
}: TabsProps) => {
	const activeTabRef = useRef<HTMLButtonElement>(null);
	const tabsContainerRef = useRef<HTMLDivElement>(null);

	// Scroll active tab into view on mobile when it changes
	useEffect(() => {
		if (activeTabRef.current && tabsContainerRef.current) {
			const tabElement = activeTabRef.current;
			const container = tabsContainerRef.current;
			const containerRect = container.getBoundingClientRect();
			const tabRect = tabElement.getBoundingClientRect();

			// Check if tab is outside visible area
			if (
				tabRect.left < containerRect.left ||
				tabRect.right > containerRect.right
			) {
				tabElement.scrollIntoView({
					behavior: "smooth",
					block: "nearest",
					inline: "center",
				});
			}
		}
	}, [activeTab]);

	return (
		<div
			ref={tabsContainerRef}
			className={`sticky top-0 z-10 bg-secondary ${className}`}
			role='tablist'
			aria-label='Event categories'>
			<div className='overflow-x-auto scrollbar-hide'>
				<div className='flex gap-1 md:gap-2 min-w-max px-4 md:px-8'>
					{tabs.map(tab => {
						const isActive = activeTab === tab.id;
						return (
							<button
								key={tab.id}
								ref={isActive ? activeTabRef : null}
								onClick={() => onTabChange(tab.id)}
								className={`
									relative px-4 md:px-6 py-2 md:py-2.5 rounded-md font-medium text-sm md:text-base
									transition-colors duration-200 whitespace-nowrap
									min-h-[44px] flex items-center justify-center gap-2
									${
										isActive ? "text-accent" : (
											"text-tertiary hover:text-primary hover:bg-tertiary"
										)
									}
								`}
								aria-selected={isActive}
								aria-controls={`tabpanel-${tab.id}`}
								id={`tab-${tab.id}`}
								role='tab'
								type='button'>
								<span>{tab.label}</span>
								{tab.count !== undefined && tab.count > 0 && (
									<span
										className={`
											px-2 py-0.5 rounded-full text-xs font-semibold
											${isActive ? "bg-accent/20 text-accent" : "bg-tertiary text-primary"}
										`}>
										{tab.count}
									</span>
								)}
								{isActive && (
									<motion.div
										layoutId='activeTabIndicator'
										className='absolute bottom-0 left-0 right-0 h-0.5 bg-accent rounded-full'
										initial={false}
										transition={{
											type: "spring",
											bounce: 0.2,
											duration: 0.3,
										}}
									/>
								)}
							</button>
						);
					})}
				</div>
			</div>
		</div>
	);
};
