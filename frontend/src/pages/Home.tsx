import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Trophy, Users, ShieldCheck, ArrowRight } from 'lucide-react';

const Home: React.FC = () => {
    const navigate = useNavigate();
    const [token, setToken] = useState('');

    const handleTeamEnter = (e: React.FormEvent) => {
        e.preventDefault();
        if (token.trim()) {
            navigate(`/t/${token.trim()}`);
        }
    };

    return (
        <div className="min-h-[calc(100vh-4rem)] flex flex-col items-center justify-center p-4">
            <div className="max-w-md w-full space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-700">

                {/* Header */}
                <div className="text-center space-y-2">
                    <h1 className="text-4xl font-bold tracking-tight text-white mb-2">
                        Graphway
                    </h1>
                    <p className="text-muted-foreground">
                        Solve problems. Unlock paths.
                    </p>
                </div>

                {/* Action Cards */}
                <div className="grid gap-4 mt-8">

                    {/* Team Entry Option */}
                    <div className="rounded-xl glass p-6 space-y-4">
                        <div className="flex items-center gap-4">
                            <div className="p-3 rounded-lg bg-blue-500/10 text-blue-500">
                                <Users size={24} />
                            </div>
                            <div>
                                <h3 className="font-semibold text-lg">Team Access</h3>
                                <p className="text-sm text-muted-foreground">Enter your team token to continue</p>
                            </div>
                        </div>

                        <form onSubmit={handleTeamEnter} className="flex gap-2">
                            <input
                                type="text"
                                placeholder="Enter team token..."
                                value={token}
                                onChange={(e) => setToken(e.target.value)}
                                autoCapitalize="off"
                                autoComplete="off"
                                autoCorrect="off"
                                spellCheck="false"
                                className="flex-1 bg-background border border-border rounded-lg px-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/50"
                            />
                            <button
                                type="submit"
                                disabled={!token.trim()}
                                className="bg-primary text-primary-foreground px-4 py-2 rounded-lg text-sm font-medium hover:bg-primary/90 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                            >
                                Enter
                            </button>
                        </form>
                    </div>

                    {/* Leaderboard Option */}
                    <button
                        onClick={() => navigate('/leaderboard')}
                        className="group relative overflow-hidden rounded-xl glass p-6 text-left transition-all hover:bg-white/5 hover:shadow-lg hover:shadow-primary/10"
                    >
                        <div className="flex items-center gap-4">
                            <div className="p-3 rounded-lg bg-yellow-500/10 text-yellow-500 group-hover:scale-110 transition-transform">
                                <Trophy size={24} />
                            </div>
                            <div className="flex-1">
                                <h3 className="font-semibold text-lg">Leaderboard</h3>
                                <p className="text-sm text-muted-foreground">Check the current standings</p>
                            </div>
                            <ArrowRight className="text-muted-foreground group-hover:text-primary group-hover:translate-x-1 transition-all" />
                        </div>
                    </button>

                </div>

                {/* Admin Link (Subtle) */}
                <div className="pt-8 flex justify-center">
                    <button
                        onClick={() => navigate('/admin')}
                        className="flex items-center gap-2 text-xs text-muted-foreground/30 hover:text-muted-foreground transition-colors"
                    >
                        <ShieldCheck size={12} />
                        <span>Admin Access</span>
                    </button>
                </div>

            </div>
        </div>
    );
};

export default Home;
