interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
	label?: string;
	error?: string;
}

export const Input = ({
	label,
	error,
	className = "",
	...props
}: InputProps) => {
	return (
		<div className='w-full'>
			{label && (
				<label className='block text-sm font-medium mb-1'>{label}</label>
			)}
			<input
				className={`w-full px-4 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 ${
					error ? "border-red-500" : "border-gray-300"
				} ${className}`}
				{...props}
			/>
			{error && <p className='mt-1 text-sm text-red-500'>{error}</p>}
		</div>
	);
};
