import { useState, useEffect } from 'react';
import { apiClient } from '../api/client';
import { Trash2, UserPlus, Users } from 'lucide-react';

interface Team {
    id: string;
    name: string;
    cf_handles: string[];
    access_code: string;
}

export default function AdminTeams() {
    const [teams, setTeams] = useState<Team[]>([]);
    const [name, setName] = useState("");
    const [handles, setHandles] = useState("");
    const [loading, setLoading] = useState(false);
    const [editingTeamId, setEditingTeamId] = useState<string | null>(null);

    const fetchTeams = async () => {
        try {
            const res = await apiClient.get('/admin/teams');
            setTeams(res.data);
        } catch (e) {
            console.error(e);
        }
    };

    useEffect(() => {
        fetchTeams();
    }, []);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);

        const handleList = handles.split(/[\s,]+/).filter(h => h.length > 0);

        try {
            if (editingTeamId) {
                // Update existing team
                await apiClient.put(`/admin/teams/${editingTeamId}`, {
                    name: name,
                    handles: handleList
                });
                alert("Team updated successfully");
            } else {
                // Create new team
                await apiClient.post('/admin/teams', {
                    name: name,
                    handles: handleList
                });
            }

            resetForm();
            fetchTeams();
        } catch (e: any) {
            let errorMsg = editingTeamId ? "Failed to update team" : "Failed to add team";
            if (e.response && e.response.data && e.response.data.detail) {
                errorMsg = e.response.data.detail;
            } else if (e.message) {
                errorMsg = e.message;
            }
            alert(errorMsg);
        } finally {
            setLoading(false);
        }
    };

    const resetForm = () => {
        setName("");
        setHandles("");
        setEditingTeamId(null);
    }

    const handleEditClick = (team: Team) => {
        setEditingTeamId(team.id);
        setName(team.name);
        setHandles(team.cf_handles.join(", "));
        window.scrollTo({ top: 0, behavior: 'smooth' });
    };

    const handleDeleteTeam = async (id: string) => {
        if (!confirm("Are you sure you want to delete this team?")) return;
        try {
            await apiClient.delete(`/admin/teams/${id}`);
            fetchTeams();
            if (editingTeamId === id) {
                resetForm();
            }
        } catch (e) {
            alert("Failed to delete team: " + e);
        }
    };

    return (
        <div className="p-6 space-y-8 max-w-[100rem] mx-auto">
            <h1 className="text-3xl font-bold flex items-center gap-2">
                <Users /> Team Management
            </h1>

            {/* Add/Edit Team Form */}
            <div className={`p-6 rounded-xl transition-colors ${editingTeamId ? 'bg-amber-500/10 border border-amber-500/30' : 'glass'}`}>
                <h2 className="text-xl font-bold mb-4 flex items-center gap-2">
                    <UserPlus size={20} /> {editingTeamId ? 'Edit Team' : 'Add New Team'}
                </h2>
                <form onSubmit={handleSubmit} className="flex gap-4 items-end flex-wrap">
                    <div className="flex-1 min-w-[200px]">
                        <label className="block text-sm font-medium mb-1">Team Name</label>
                        <input
                            required
                            className="w-full bg-background/50 border border-border rounded px-3 py-2"
                            value={name}
                            onChange={e => setName(e.target.value)}
                            placeholder="Team Name"
                        />
                    </div>
                    <div className="flex-[2] min-w-[300px]">
                        <label className="block text-sm font-medium mb-1">Codeforces Handles (case-sensitive)</label>
                        <input
                            required
                            className="w-full bg-background/50 border border-border rounded px-3 py-2"
                            value={handles}
                            onChange={e => setHandles(e.target.value)}
                            placeholder="handle1, handle2"
                        />
                    </div>
                    <div className="flex gap-2">
                        {editingTeamId && (
                            <button
                                type="button"
                                onClick={resetForm}
                                className="px-6 py-2 rounded hover:bg-muted transition-colors"
                            >
                                Cancel
                            </button>
                        )}
                        <button
                            disabled={loading}
                            className={`px-6 py-2 rounded font-bold transition-all shadow-lg ${editingTeamId
                                ? 'bg-amber-500 text-black hover:bg-amber-400'
                                : 'bg-primary text-primary-foreground hover:opacity-90'
                                }`}
                        >
                            {loading ? (editingTeamId ? "Updating..." : "Adding...") : (editingTeamId ? "Update Team" : "Add Team")}
                        </button>
                    </div>
                </form>
            </div>

            {/* Teams List */}
            <div className="grid gap-4">
                {teams.map(team => (
                    <div key={team.id} className={`glass p-4 rounded-xl flex items-center justify-between gap-6 transition-all ${editingTeamId === team.id ? 'ring-2 ring-amber-500' : ''}`}>
                        <div>
                            <h3 className="text-lg font-bold">{team.name}</h3>
                            <div className="text-sm text-muted-foreground mt-1 flex flex-col gap-1">
                                <div className="flex items-center gap-2">
                                    <span>Link:</span>
                                    <code
                                        className="font-mono bg-muted px-2 py-0.5 rounded text-xs select-all cursor-pointer hover:bg-muted/80"
                                        onClick={() => navigator.clipboard.writeText(`${window.location.origin}/t/${team.access_code}`)}
                                        title="Click to copy"
                                    >
                                        {`${window.location.origin}/t/${team.access_code}`}
                                    </code>
                                </div>
                                <div>
                                    Handles: {team.cf_handles.join(", ")}
                                </div>
                            </div>
                        </div>
                        <div className="flex gap-2">
                            <a
                                href={`/admin/graph?teamId=${team.id}`}
                                className="px-3 py-1 bg-blue-100/50 hover:bg-blue-200/50 text-blue-600 rounded text-sm font-medium transition-colors flex items-center"
                            >
                                Graph
                            </a>
                            <button
                                onClick={() => handleEditClick(team)}
                                className="px-3 py-1 bg-muted hover:bg-muted/80 rounded text-sm font-medium transition-colors"
                            >
                                Edit
                            </button>
                            <button
                                onClick={() => handleDeleteTeam(team.id)}
                                className="p-2 text-destructive hover:bg-destructive/10 rounded transition-colors"
                                title="Delete Team"
                            >
                                <Trash2 size={20} />
                            </button>
                        </div>
                    </div>
                ))}
                {teams.length === 0 && (
                    <p className="text-center text-muted-foreground py-8">No teams registered yet.</p>
                )}
            </div>
        </div>
    );
}

