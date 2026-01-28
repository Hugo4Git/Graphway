import { useEffect, useState } from 'react';
import { Outlet } from 'react-router-dom';
import { useContestStore } from '../store/useContestStore';

export default function AdminLayout() {
    const { checkAdminAuth, isAdmin } = useContestStore();
    const [loading, setLoading] = useState(true);
    const [tokenInput, setTokenInput] = useState("");
    const [error, setError] = useState("");

    useEffect(() => {
        checkAdminAuth().finally(() => {
            setLoading(false);
        });
    }, []);

    const handleLogin = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        setError("");

        useContestStore.getState().setAdminToken(tokenInput);
        const valid = await checkAdminAuth();

        if (!valid) {
            setError("Invalid Admin Token");
            setLoading(false);
        } else {
            // Success, isAdmin will be true, causing re-render
            setLoading(false);
        }
    };

    if (loading) return (
        <div className="min-h-screen flex items-center justify-center">
            <div className="animate-pulse text-xl font-mono">Verifying Access...</div>
        </div>
    );

    if (!isAdmin) {
        return (
            <div className="min-h-[80vh] flex flex-col items-center justify-center p-4">
                <div className="glass max-w-md w-full p-8 rounded-xl shadow-2xl space-y-6">
                    <h1 className="text-2xl font-bold text-center text-red-400">Restricted Access</h1>
                    <p className="text-center text-muted-foreground">Please enter the administrator token to continue.</p>

                    <form onSubmit={handleLogin} className="space-y-4">
                        <input
                            type="password"
                            className="w-full bg-background/50 border border-border rounded px-4 py-3 focus:ring-2 focus:ring-red-500 outline-none transition-all"
                            placeholder="Admin Token"
                            value={tokenInput}
                            onChange={e => setTokenInput(e.target.value)}
                            autoFocus
                        />
                        {error && <p className="text-red-500 text-sm text-center">{error}</p>}
                        <button className="w-full py-3 bg-red-600 hover:bg-red-500 text-white font-bold rounded transition-colors">
                            Access Admin Panel
                        </button>
                    </form>
                    <div className="text-center">
                        <a href="/" className="text-sm text-muted-foreground hover:text-white transition-colors">Return to Home</a>
                    </div>
                </div>
            </div>
        );
    }

    return (
        <div className="h-screen w-full flex flex-col overflow-hidden">
            <header className="p-4 border-b border-white/10 flex items-center justify-between glass shrink-0 z-50">
                <h1 className="text-xl font-bold">Contest Admin</h1>
                <nav className="flex gap-4">
                    <a href="/admin/config" className="hover:text-blue-400">Configuration</a>
                    <a href="/admin/graph" className="hover:text-blue-400">Graph Editor</a>
                    <a href="/admin/teams" className="hover:text-blue-400">Teams</a>
                    <a href="/admin/leaderboard" className="hover:text-blue-400">Leaderboard</a>
                </nav>
            </header>
            <main className="flex-1 w-full flex flex-col min-h-0 overflow-auto relative">
                <Outlet />
            </main>
        </div>
    );
}
