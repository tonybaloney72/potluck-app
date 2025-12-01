import { Header } from "./Header";

interface LayoutProps {
	children: React.ReactNode;
}

export function Layout({ children }: LayoutProps) {
	return (
		<div className='h-screen flex flex-col'>
			<Header />
			<div className='flex-1 overflow-y-auto'>{children}</div>
		</div>
	);
}
