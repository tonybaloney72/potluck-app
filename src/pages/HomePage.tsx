import { MyEventsPage } from "./MyEventsPage";

export const HomePage = () => {
	return (
		<div className='p-8 bg-primary'>
			<h1 className='text-2xl font-bold'>Potluck</h1>
			<p>Welcome to the Potluck App!</p>
			<MyEventsPage />
		</div>
	);
};
