import { Outlet } from 'react-router-dom';
import BackgroundGraph from '../components/BackgroundGraph';

export default function MainLayout() {
    return (
        <div className="min-h-screen bg-transparent w-full relative">
            <BackgroundGraph />
            <main className="w-full relative z-10">
                <Outlet />
            </main>
        </div>
    );
}
