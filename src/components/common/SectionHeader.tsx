import type { ReactNode } from "react";

interface SectionHeaderProps {
	title: string;
	count?: number;
	actionButton?: ReactNode;
}

export const SectionHeader = ({
	title,
	count,
	actionButton,
}: SectionHeaderProps) => {
	return (
		<div className='flex justify-between items-center mb-4'>
			<h2 className='text-2xl font-semibold text-primary'>
				{title}
				{count !== undefined && ` (${count})`}
			</h2>
			{actionButton}
		</div>
	);
};
