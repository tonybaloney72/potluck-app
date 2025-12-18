import { Button } from "./Button";

interface PaginationProps {
	currentPage: number;
	totalPages: number;
	onPageChange: (page: number) => void;
	totalItems: number;
}

export const Pagination = ({
	currentPage,
	totalPages,
	onPageChange,
	totalItems,
}: PaginationProps) => {
	if (totalPages === 0 || totalItems === 0) return null;
	return (
		<div className='flex flex-col items-center gap-2 w-full px-4 md:px-8 py-4 md:py-8 min-w-0'>
			<span>Showing {totalItems} events</span>
			<div className='flex items-center gap-2 w-full justify-between min-w-0'>
				<Button
					variant='secondary'
					disabled={currentPage === 1}
					onClick={() => onPageChange(currentPage - 1)}
					className='text-sm md:text-base'>
					Previous
				</Button>
				<span className='text-sm md:text-base'>
					Page {currentPage} of {totalPages}
				</span>
				<Button
					variant='secondary'
					disabled={currentPage === totalPages}
					onClick={() => onPageChange(currentPage + 1)}
					className='text-sm md:text-base'>
					Next
				</Button>
			</div>
		</div>
	);
};
