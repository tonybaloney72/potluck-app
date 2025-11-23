import { Header } from "./Header";

interface LayoutProps {
	children: React.ReactNode;
}

export function Layout({ children }: LayoutProps) {
	return (
		<div className='h-screen flex flex-col'>
			<Header />
			<main className='flex-1 overflow-y-auto'>{children}</main>
		</div>
	);
}
