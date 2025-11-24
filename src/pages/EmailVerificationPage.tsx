export const EmailVerificationPage = () => {
	return (
		<div className='h-screen flex items-center justify-center bg-primary'>
			<div className='max-w-md w-full space-y-8 p-8 bg-secondary border border-border rounded-lg shadow'>
				<h1 className='text-3xl font-bold text-center text-primary'>
					Email Verification
				</h1>
				<p className='text-center text-sm text-gray-600'>
					Please check your email for a verification link.
				</p>
			</div>
		</div>
	);
};
