import { useEffect, useState } from 'react';
import { apiClient } from '../api/client';
import type { LeaderboardEntry } from '../types';

import './Leaderboard.css';

export default function Leaderboard() {
    const [data, setData] = useState<LeaderboardEntry[]>([]);
    const [loading, setLoading] = useState(true);

    const fetchLeaderboard = async () => {
        setLoading(true);
        try {
            const res = await apiClient.get('/public/leaderboard');
            setData(res.data);
        } catch (e) { console.error(e); }
        setLoading(false);
    }

    useEffect(() => {
        fetchLeaderboard();
        const interval = setInterval(() => {
            apiClient.get('/public/leaderboard').then(res => setData(res.data));
        }, 10000);

        return () => clearInterval(interval);
    }, []);

    return (
        <div className="leaderboard-container">
            <header className="leaderboard-header">
                <h1 className="leaderboard-title">Leaderboard</h1>
                <div className="leaderboard-subtitle">
                    <div className="live-indicator"></div>
                    <span>Live Updates</span>
                </div>
            </header>

            {data.length > 0 ? (
                <div className="leaderboard-list">
                    <div className="list-header">
                        <div>Rank</div>
                        <div>Team</div>
                        <div className="text-center">Solved</div>
                        <div className="text-right">Progress Score</div>
                    </div>

                    {data.map((entry, idx) => (
                        <div key={entry.name} className="list-item" style={{ animationDelay: `${idx * 0.05}s` }}>
                            <div className="rank-cell">#{idx + 1}</div>
                            <div className="team-cell">
                                {entry.name}
                            </div>
                            <div className="solved-cell">
                                {entry.solved}
                            </div>
                            <div className="score-cell">
                                {entry.score}
                            </div>
                        </div>
                    ))}
                </div>
            ) : (
                <div className="empty-state">
                    {!loading ? "No teams registered yet." : "Loading standings..."}
                </div>
            )}
        </div>
    );
}
