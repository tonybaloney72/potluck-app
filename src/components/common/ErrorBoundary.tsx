import { Component, type ReactNode, type ErrorInfo } from "react";
import { Button } from "./Button";

interface ErrorBoundaryProps {
	children: ReactNode;
	fallback?: ReactNode;
}

interface ErrorBoundaryState {
	hasError: boolean;
	error: Error | null;
	errorInfo: ErrorInfo | null;
}

export class ErrorBoundary extends Component<
	ErrorBoundaryProps,
	ErrorBoundaryState
> {
	constructor(props: ErrorBoundaryProps) {
		super(props);
		this.state = {
			hasError: false,
			error: null,
			errorInfo: null,
		};
	}

	static getDerivedStateFromError(error: Error): Partial<ErrorBoundaryState> {
		// Update state so the next render will show the fallback UI
		return { hasError: true, error };
	}

	componentDidCatch(error: Error, errorInfo: ErrorInfo) {
		// Log the error to an error reporting service (e.g., Sentry, LogRocket)
		console.error("Error caught by boundary:", error, errorInfo);
		this.setState({
			error,
			errorInfo,
		});

		// You could also send this to an error tracking service:
		// errorReportingService.logError(error, errorInfo);
	}

	handleReset = () => {
		this.setState({
			hasError: false,
			error: null,
			errorInfo: null,
		});
	};

	render() {
		if (this.state.hasError) {
			// Custom fallback UI
			if (this.props.fallback) {
				return this.props.fallback;
			}

			// Default fallback UI
			return (
				<div className='min-h-screen flex items-center justify-center bg-secondary p-4'>
					<div className='max-w-md w-full bg-secondary border border-border rounded-lg shadow-lg p-6'>
						<h1 className='text-2xl font-bold text-text-primary mb-4'>
							Something went wrong
						</h1>
						<p className='text-text-secondary mb-4'>
							We're sorry, but something unexpected happened. Please try
							refreshing the page or contact support if the problem persists.
						</p>

						{/* Show error details in development */}
						{import.meta.env.DEV && this.state.error && (
							<details className='mb-4'>
								<summary className='cursor-pointer text-text-secondary hover:text-text-primary mb-2'>
									Error Details (Development Only)
								</summary>
								<div className='bg-tertiary p-3 rounded text-sm text-text-primary overflow-auto max-h-48'>
									<pre className='whitespace-pre-wrap wrap-break-words'>
										{this.state.error.toString()}
										{this.state.errorInfo?.componentStack}
									</pre>
								</div>
							</details>
						)}

						<div className='flex gap-3'>
							<Button onClick={this.handleReset} variant='primary'>
								Try Again
							</Button>
							<Button
								onClick={() => window.location.reload()}
								variant='secondary'>
								Reload Page
							</Button>
						</div>
					</div>
				</div>
			);
		}

		return this.props.children;
	}
}
