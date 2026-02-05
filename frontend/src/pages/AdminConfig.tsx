import { useEffect, useState, useRef } from 'react';
import { useContestStore } from '../store/useContestStore';
import { apiClient } from '../api/client';
import { Download, Upload, Trash2, Save } from 'lucide-react';

export default function AdminConfig() {
    const { contestConfig, fetchConfig, fetchGraph } = useContestStore();
    const [name, setName] = useState("");
    const [startTime, setStartTime] = useState("");
    const [durationHours, setDurationHours] = useState(1);
    const [contestState, setContestState] = useState<'EDITING' | 'RUNNING' | 'FINISHED'>('EDITING');
    const [loading, setLoading] = useState(false);

    // File input for import
    const fileInputRef = useRef<HTMLInputElement>(null);

    useEffect(() => {
        fetchConfig();
    }, []);

    useEffect(() => {
        if (contestConfig) {
            setName(contestConfig.name);
            // Convert epoch to local datetime-local string
            const date = new Date(contestConfig.start_time * 1000);

            // Format to YYYY-MM-DDThh:mm in local time
            const year = date.getFullYear();
            const month = String(date.getMonth() + 1).padStart(2, '0');
            const day = String(date.getDate()).padStart(2, '0');
            const hours = String(date.getHours()).padStart(2, '0');
            const minutes = String(date.getMinutes()).padStart(2, '0');

            const str = `${year}-${month}-${day}T${hours}:${minutes}`;
            setStartTime(str);

            setDurationHours(contestConfig.duration / 3600);
            setContestState(contestConfig.state);
        }
    }, [contestConfig]);

    const handleSave = async () => {
        setLoading(true);
        try {
            const epoch = new Date(startTime).getTime() / 1000;
            await apiClient.post('/admin/config', {
                name: name,
                start_time: epoch,
                duration: (durationHours || 0) * 3600
            });
            alert("Saved!");
            fetchConfig();
        } catch (e) {
            alert("Failed to save: " + e);
        }
        setLoading(false);
    };

    const handleStateChange = async (newState: 'EDITING' | 'RUNNING' | 'FINISHED') => {
        if (!confirm(`Are you sure you want to change contest state to ${newState}?`)) return;
        try {
            await apiClient.post('/admin/contest/state', { state: newState });
            setContestState(newState);
            fetchConfig(); // refresh
        } catch (e: any) {
            alert("Failed to change state: " + e.message);
        }
    }

    const handleExport = async () => {
        try {
            const response = await apiClient.get('/admin/export', { responseType: 'blob' });
            const url = window.URL.createObjectURL(new Blob([response.data]));
            const link = document.createElement('a');
            link.href = url;
            link.setAttribute('download', `contest_export_${new Date().toISOString().split('T')[0]}.json`);
            document.body.appendChild(link);
            link.click();
            link.remove();
        } catch (e: any) {
            const msg = e.response?.data?.detail || e.message;
            alert("Export failed: " + msg);
        }
    }

    const handleImportClick = () => {
        fileInputRef.current?.click();
    }

    const handleFileChange = async (event: React.ChangeEvent<HTMLInputElement>) => {
        const file = event.target.files?.[0];
        if (!file) return;

        const formData = new FormData();
        formData.append('file', file);

        try {
            await apiClient.post('/admin/import', formData, {
                headers: {
                    'Content-Type': 'multipart/form-data',
                },
            });
            alert("Contest imported successfully!");
            // Refresh stores
            fetchConfig();
            fetchGraph();
        } catch (e: any) {
            const msg = e.response?.data?.detail || e.message;
            alert("Import failed: " + msg);
        } finally {
            if (fileInputRef.current) {
                fileInputRef.current.value = '';
            }
        }
    }

    const handleReset = async () => {
        if (!confirm("This will erase all contest data including the graph, teams, and progress. This action cannot be undone. Are you sure?")) return;

        try {
            await apiClient.post('/admin/reset');
            alert("Contest reset to default state.");
            fetchConfig();
            fetchGraph();
        } catch (e: any) {
            const msg = e.response?.data?.detail || e.message;
            alert("Reset failed: " + msg);
        }
    }

    if (!contestConfig) return <div>Loading...</div>;

    return (
        <div className="p-6 max-w-6xl mx-auto space-y-6">
            <h2 className="text-3xl font-bold">Contest Configuration</h2>

            {/* Top Row: Settings & Data */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">

                {/* Left Column: Settings */}
                <div className="glass p-6 rounded-lg space-y-4 h-full">
                    <h3 className="text-xl font-semibold border-b border-border pb-2">General Settings</h3>
                    <div>
                        <label className="block text-sm font-medium mb-1 text-muted-foreground">Contest Name</label>
                        <input
                            className="w-full bg-background border border-border rounded px-3 py-2"
                            value={name}
                            onChange={e => setName(e.target.value)}
                        />
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <label className="block text-sm font-medium mb-1 text-muted-foreground">Start Time</label>
                            <input
                                type="datetime-local"
                                className="w-full bg-background border border-border rounded px-3 py-2 text-sm"
                                value={startTime}
                                onChange={e => setStartTime(e.target.value)}
                            />
                        </div>
                        <div>
                            <label className="block text-sm font-medium mb-1 text-muted-foreground">Duration (Hours)</label>
                            <input
                                type="number"
                                min="0"
                                className="w-full bg-background border border-border rounded px-3 py-2"
                                value={durationHours}
                                onChange={e => {
                                    const val = parseFloat(e.target.value);
                                    if (isNaN(val) || val >= 0) {
                                        setDurationHours(val);
                                    }
                                }}
                            />
                        </div>
                    </div>

                    <button
                        onClick={handleSave}
                        disabled={loading}
                        className="w-full flex items-center justify-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-md shadow transition-colors font-bold disabled:opacity-50 mt-auto"
                    >
                        <Save size={18} />
                        {loading ? "Saving..." : "Save Changes"}
                    </button>
                </div>

                {/* Right Column: Data Management */}
                <div className="glass p-6 rounded-lg space-y-4 h-full">
                    <h3 className="text-xl font-semibold border-b border-border pb-2">Data Management</h3>

                    <div className="space-y-4 flex flex-col justify-between h-full pb-2">
                        <div className="space-y-4">
                            <button onClick={handleExport} className="w-full flex items-center justify-center gap-2 bg-muted text-foreground px-4 py-4 rounded-md shadow hover:bg-muted/80 transition-colors border border-border">
                                <Download size={20} /> Export Contest Data (JSON)
                            </button>

                            <div className="relative">
                                <input
                                    type="file"
                                    ref={fileInputRef}
                                    style={{ display: 'none' }}
                                    accept=".json"
                                    onChange={handleFileChange}
                                />
                                <button onClick={handleImportClick} className="w-full flex items-center justify-center gap-2 bg-muted text-foreground px-4 py-4 rounded-md shadow hover:bg-muted/80 transition-colors border border-border">
                                    <Upload size={20} /> Import Contest Data (JSON)
                                </button>
                            </div>

                            <button
                                onClick={handleReset}
                                className="w-full flex items-center justify-center gap-2 bg-red-600/80 text-white px-4 py-4 rounded-md shadow hover:bg-red-600 transition-colors font-bold mt-4"
                            >
                                <Trash2 size={20} /> Create New Contest (Reset)
                            </button>
                        </div>

                    </div>
                </div>
            </div>

            {/* Bottom Row: Phase */}
            <div className="glass p-6 rounded-lg space-y-4">
                <h3 className="text-xl font-semibold border-b border-border pb-2 text-center">Contest Phase</h3>
                <div className="flex gap-4 max-w-2xl mx-auto w-full">
                    <button
                        onClick={() => handleStateChange("EDITING")}
                        disabled={contestState === "EDITING"}
                        className={`flex-1 px-4 py-3 rounded font-bold transition-colors ${contestState === "EDITING" ? "bg-green-100/50 text-green-700 border border-green-500" : "bg-muted hover:bg-muted/80 text-foreground border border-border"}`}
                    >
                        EDITING MODE
                    </button>
                    <button
                        onClick={() => handleStateChange("RUNNING")}
                        disabled={contestState === "RUNNING"}
                        className={`flex-1 px-4 py-3 rounded font-bold transition-colors ${contestState === "RUNNING" || contestState === "FINISHED" ? "bg-green-100/50 text-green-700 border border-green-500" : "bg-muted hover:bg-muted/80 text-foreground border border-border"}`}
                    >
                        RUNNING MODE
                    </button>
                </div>
                <p className="text-sm text-muted-foreground text-center">
                    Current State: <span className="font-bold text-foreground">{contestState}</span>
                    {contestState === "EDITING" && <span className="block text-xs mt-1 text-amber-500">You can edit the contest graph. The graph is not available for participants, regardless of the start time.</span>}
                    {contestState === "RUNNING" && <span className="block text-xs mt-1 text-amber-500">The contest is in running mode. The graph will be available for participants after the start time.</span>}
                    {contestState === "FINISHED" && <span className="block text-xs mt-1 text-amber-500">Contest has finished. The graph is not available for participants.</span>}
                </p>
            </div>
        </div >
    );
}
