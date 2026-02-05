import { useCallback, useEffect, useState } from 'react';
import {
    ReactFlow,
    MiniMap,
    Controls,
    Background,
    useNodesState,
    useEdgesState,
    Panel,
    type Connection,
    type Edge,
    type NodeChange,
    applyNodeChanges,

    MarkerType,
    type Node
} from '@xyflow/react';
import '@xyflow/react/dist/style.css';
import { useContestStore } from '../store/useContestStore';
import CustomNode from '../components/CustomNode';
import { apiClient } from '../api/client';
import { Save, Plus, Trash2, ArrowRight, Dices, ExternalLink } from 'lucide-react';
import FloatingEdge from '../components/FloatingEdge';

const nodeTypes = {
    custom: CustomNode,
};

const edgeTypes = {
    floating: FloatingEdge,
};

export default function AdminGraph() {
    const { nodes: backendNodes, fetchGraph, fetchConfig, contestConfig } = useContestStore();
    const isEditing = contestConfig?.state === 'EDITING';
    const [nodes, setNodes] = useNodesState<Node>([]);
    const [edges, setEdges, onEdgesChange] = useEdgesState<Edge>([]);
    const [selectedNode, setSelectedNode] = useState<string | null>(null);
    const [selectedEdge, setSelectedEdge] = useState<Edge | null>(null);
    const [connectingNodeId, setConnectingNodeId] = useState<string | null>(null);

    const [rfInstance, setRfInstance] = useState<any>(null); // Use existing types if possible, otherwise any for now as import might be missing

    // Sync with backend on mount
    useEffect(() => {
        fetchConfig();
        fetchGraph();
    }, []);

    // Team State Logic
    const [teamId, setTeamId] = useState<string | null>(null);
    const [teamState, setTeamState] = useState<{ name: string, solved: string[], available: string[] } | null>(null);

    useEffect(() => {
        const params = new URLSearchParams(window.location.search);
        const tid = params.get("teamId");
        if (tid) {
            setTeamId(tid);
            fetchTeamState(tid);
        }
    }, []);

    const fetchTeamState = async (tid: string) => {
        try {
            const res = await apiClient.get(`/admin/teams/${tid}/state`);
            setTeamState(res.data);
        } catch (e) {
            console.error("Failed to fetch team state", e);
        }
    };

    // Convert backend nodes to RF nodes/edges
    useEffect(() => {
        if (!backendNodes) return;

        const newNodes = backendNodes.map(n => {
            let state = undefined;
            if (teamId && teamState) {
                if (teamState.solved.includes(n.id)) {
                    state = 'solved';
                } else if (teamState.available.includes(n.id)) {
                    state = 'available';
                } else {
                    state = 'locked';
                }
            }

            return {
                id: n.id,
                type: 'custom',
                position: { x: n.position[0], y: n.position[1] },
                draggable: !teamId && isEditing,
                data: {
                    id: n.id,
                    pid: n.pid,
                    rating: n.rating,
                    neighbors: n.neighbors,
                    state: state
                },
                width: 128,
                height: 128,
            }
        });

        const newEdges: Edge[] = [];
        backendNodes.forEach(n => {
            n.neighbors.forEach(target => {
                newEdges.push({
                    id: `e${n.id}-${target}`,
                    source: n.id,
                    target: target,
                    animated: false,
                    type: 'floating',
                    markerEnd: {
                        type: MarkerType.ArrowClosed,
                        width: 20,
                        height: 20,
                        color: '#64748b',
                    },
                    style: { stroke: '#64748b', strokeWidth: 2 }
                });
            });
        });

        setNodes(newNodes);
        setEdges(newEdges);
    }, [backendNodes, teamState, teamId, isEditing]); // Depend on teamState and isEditing

    const onNodesChange = useCallback(
        async (changes: NodeChange[]) => {
            setNodes((nds) => applyNodeChanges(changes, nds));

            if (teamId || !isEditing) return;

            const positionChanges = changes.filter(c => c.type === 'position' && c.dragging === false);
            for (const c of positionChanges) {
                // @ts-ignore
                const changeId = c.id;
                // @ts-ignore
                const node = nodes.find(n => n.id === changeId);
                if (node) {
                    // Update backend
                    const updatedNode = nodes.find(n => n.id === changeId);
                    if (updatedNode) {
                        try {
                            await apiClient.post('/admin/graph/node', {
                                id: updatedNode.id,
                                pid: updatedNode.data.pid,
                                rating: updatedNode.data.rating,
                                position: [Math.round(updatedNode.position.x), Math.round(updatedNode.position.y)],
                                neighbors: updatedNode.data.neighbors
                            });
                        } catch (e) { console.error("Update failed", e); }
                    }
                }
            }
        },
        [nodes, teamId]
    );



    const onConnect = useCallback(
        async (params: Connection) => {
            if (teamId || !isEditing) return; // Disable structure edits in team mode
            // Add edge backend
            if (params.source && params.target) {
                try {
                    await apiClient.post('/admin/graph/edge', {
                        from_id: params.source,
                        to_id: params.target
                    });
                    fetchGraph(); // Refresh to ensure sync
                } catch (e: any) {
                    const msg = e.response?.data?.detail || e.message;
                    alert("Failed to add edge: " + msg);
                    console.error(e);
                }
            }
        },
        [teamId]
    );

    const onNodeClick = async (_: any, node: any) => {
        if (teamId) {
            setSelectedNode(node.id);
            setSelectedEdge(null);
            return;
        }

        if (connectingNodeId) {
            // Complete connection
            if (connectingNodeId === node.id) {
                // Cancel if clicking same node
                setConnectingNodeId(null);
                return;
            }

            try {
                await apiClient.post('/admin/graph/edge', {
                    from_id: connectingNodeId,
                    to_id: node.id
                });
                fetchGraph();
                setConnectingNodeId(null);
            } catch (e: any) {
                const msg = e.response?.data?.detail || e.message;
                alert("Failed to add edge: " + msg);
            }
        } else {
            setSelectedNode(node.id);
            setSelectedEdge(null);
        }
    };

    const onEdgeClick = (_: any, edge: Edge) => {
        if (teamId) return;
        setSelectedEdge(edge);
        setSelectedNode(null);
    };

    const handlePaneClick = () => {
        setSelectedNode(null);
        setSelectedEdge(null);
        setConnectingNodeId(null);
    }

    const addNewNode = async () => {
        const id = Math.random().toString(36).substring(2, 8);

        // Calculate center position
        let position = [100, 100];
        if (rfInstance) {
            const wrapper = document.getElementById('admin-graph-wrapper');
            if (wrapper) {
                const rect = wrapper.getBoundingClientRect();
                const centerX = rect.width / 2;
                const centerY = rect.height / 2;
                // Project to flow coordinates
                const p = rfInstance.screenToFlowPosition({ x: rect.left + centerX, y: rect.top + centerY });
                position = [Math.round(p.x), Math.round(p.y)];
            }
        }

        // Default data
        try {
            await apiClient.post('/admin/graph/node', {
                id: id,
                pid: "",
                rating: 0,
                position: position,
                neighbors: []
            });
            fetchGraph();
        } catch (e: any) {
            const msg = e.response?.data?.detail || e.message;
            alert("Failed to add node: " + msg);
        }
    };



    const deleteSelected = async () => {
        if (selectedNode) {
            try {
                await apiClient.delete(`/admin/graph/node/${selectedNode}`);
                setSelectedNode(null);
                fetchGraph();
            } catch (e: any) {
                const msg = e.response?.data?.detail || e.message;
                alert("Failed to delete node: " + msg);
            }
        } else if (selectedEdge) {
            try {
                await apiClient.delete('/admin/graph/edge', {
                    data: {
                        from_id: selectedEdge.source,
                        to_id: selectedEdge.target
                    }
                });
                setSelectedEdge(null);
                fetchGraph();
            } catch (e: any) {
                const msg = e.response?.data?.detail || e.message;
                alert("Failed to delete edge: " + msg);
            }
        }
    }

    return (
        <div id="admin-graph-wrapper" className="flex-1 w-full h-full relative">
            {teamId && (
                <div className="absolute top-4 left-1/2 -translate-x-1/2 z-50 bg-amber-100 text-amber-700 border border-amber-500 px-4 py-2 rounded-full backdrop-blur font-bold flex items-center gap-2 shadow-sm">
                    <span>Modify Team: {teamState?.name}</span>
                    <button onClick={() => window.history.back()} className="text-sm underline ml-2">Exit</button>
                </div>
            )}
            {!teamId && !isEditing && (
                <div className="absolute top-4 left-1/2 -translate-x-1/2 z-50 flex flex-col items-center gap-1">
                    <div className="bg-blue-100 text-blue-700 border border-blue-300 px-6 py-2 rounded-full backdrop-blur font-bold flex items-center gap-2 shadow-lg">
                        <span>READ ONLY MODE ({contestConfig?.state || "LOADING..."})</span>
                    </div>
                </div>
            )}
            <ReactFlow
                nodes={nodes}
                edges={edges}
                onNodesChange={onNodesChange}
                onEdgesChange={onEdgesChange}
                onConnect={onConnect}
                onNodeClick={onNodeClick}
                onEdgeClick={onEdgeClick}
                onPaneClick={handlePaneClick}
                nodeTypes={nodeTypes}
                edgeTypes={edgeTypes}
                onInit={setRfInstance}
                minZoom={0.1}
                fitView
                proOptions={{ hideAttribution: true }}
            >
                <Background color="#cbd5e1" gap={16} />
                <Controls />
                <MiniMap style={{ background: '#f8fafc' }} nodeColor="#3b82f6" />

                <Panel position="top-right" className="flex flex-col gap-2 items-end">


                    <div className="flex gap-2">
                        {teamId ? (
                            <div className="text-muted-foreground text-sm bg-black/50 px-2 py-1 rounded">
                                Select node to solve/unsolve
                            </div>
                        ) : connectingNodeId ? (
                            <div className="bg-blue-600 text-white px-4 py-2 rounded-md shadow-lg font-bold animate-pulse">
                                Select target node...
                            </div>
                        ) : (

                            <>
                                {isEditing && (
                                    <button onClick={addNewNode} className="flex items-center gap-2 bg-blue-600 text-white px-4 py-2 rounded-md shadow-lg hover:bg-blue-700">
                                        <Plus size={16} /> Add Node
                                    </button>
                                )}
                                {selectedNode && isEditing && (
                                    <button
                                        onClick={() => setConnectingNodeId(selectedNode)}
                                        className="flex items-center gap-2 bg-blue-600 text-white px-4 py-2 rounded-md shadow-lg hover:bg-blue-700"
                                    >
                                        <ArrowRight size={16} /> Add Edge
                                    </button>
                                )}
                                {(selectedNode || selectedEdge) && isEditing && (
                                    <button onClick={deleteSelected} className="flex items-center gap-2 bg-red-500 text-white px-4 py-2 rounded-md shadow-lg hover:bg-red-600">
                                        <Trash2 size={16} />
                                        {selectedNode ? `Delete Node` : `Delete Edge`}
                                    </button>
                                )}
                            </>
                        )}
                    </div>
                </Panel>
            </ReactFlow>

            {
                selectedNode && (
                    <div className="absolute top-4 left-4 w-80 bg-card/90 backdrop-blur border border-border p-4 rounded-lg shadow-xl">
                        <h3 className="text-lg font-bold mb-4">{teamId ? "Manage Team Submission" : "Edit Node"}</h3>
                        {teamId ? (
                            <TeamNodeControls
                                teamId={teamId}
                                nodeId={selectedNode}
                                onUpdate={() => fetchTeamState(teamId)}
                                isSolved={teamState?.solved.includes(selectedNode)}
                            />
                        ) : (
                            isEditing ? (
                                <NodeEditor
                                    nodeId={selectedNode}
                                    currentPosition={nodes.find(n => n.id === selectedNode)?.position}
                                />
                            ) : (
                                <div className="space-y-4">
                                    <div className="text-muted-foreground text-sm p-2 bg-muted rounded border border-border">
                                        Node details are read-only in this phase.
                                    </div>
                                    {(nodes.find(n => n.id === selectedNode)?.data as any)?.pid && (
                                        <div>
                                            <label className="block text-xs font-mono text-muted-foreground mb-1">Codeforces Problem</label>
                                            <div className="flex gap-2 items-center">
                                                <div className="flex-1 bg-muted px-2 py-1 rounded text-sm font-mono truncate">
                                                    {(nodes.find(n => n.id === selectedNode)?.data as any)?.pid as string}
                                                </div>
                                                <button
                                                    onClick={() => {
                                                        const startPid = (nodes.find(n => n.id === selectedNode)?.data as any)?.pid || "";
                                                        const parts = (startPid as string).split('/');
                                                        if (parts.length >= 2) {
                                                            window.open(`https://codeforces.com/contest/${parts[0]}/problem/${parts.slice(1).join('/')}`, '_blank');
                                                        }
                                                    }}
                                                    className="bg-slate-800 border border-slate-700 hover:bg-slate-700 text-white px-2 py-1 rounded flex items-center justify-center transition-colors"
                                                    title="Open in Codeforces"
                                                >
                                                    <ExternalLink size={16} />
                                                </button>
                                            </div>
                                        </div>
                                    )}
                                </div>
                            )
                        )}
                    </div >
                )
            }
        </div >
    );
}

function TeamNodeControls({ teamId, nodeId, onUpdate, isSolved }: { teamId: string, nodeId: string, onUpdate: () => void, isSolved?: boolean }) {
    const [loading, setLoading] = useState(false);

    const handleAction = async (action: 'solve' | 'unsolve') => {
        setLoading(true);
        try {
            await apiClient.post(`/admin/teams/${teamId}/nodes/${nodeId}/${action}`);
            onUpdate();
        } catch (e: any) {
            alert(`Failed to ${action} node: ` + (e.response?.data?.detail || e.message));
        } finally {
            setLoading(false);
        }
    }

    return (
        <div className="flex flex-col gap-4">
            <div className="text-sm">
                Node ID: <code className="bg-muted px-1 rounded">{nodeId}</code>
            </div>
            <div className="text-sm font-bold">
                Status: <span className={isSolved ? "text-green-500" : "text-amber-500"}>{isSolved ? "SOLVED" : "UNSOLVED"}</span>
            </div>

            <div className="flex gap-2 mt-2">
                {!isSolved && (
                    <button
                        onClick={() => handleAction('solve')}
                        disabled={loading}
                        className="flex-1 bg-green-600 hover:bg-green-700 text-white py-2 rounded font-bold"
                    >
                        Mark Solved
                    </button>
                )}
                {isSolved && (
                    <button
                        onClick={() => handleAction('unsolve')}
                        disabled={loading}
                        className="flex-1 bg-red-600 hover:bg-red-700 text-white py-2 rounded font-bold"
                    >
                        Mark Unsolved
                    </button>
                )}
            </div>
        </div>
    )
}

// Subcomponent for editing node details
function NodeEditor({ nodeId, currentPosition }: { nodeId: string, currentPosition?: { x: number, y: number } }) {
    const { nodes, fetchGraph } = useContestStore();
    const node = nodes.find(n => n.id === nodeId);
    const [pid, setPid] = useState(node?.pid || "");
    const [rating, setRating] = useState(node?.rating || 0);

    // New state for random picker
    const [minRating, setMinRating] = useState(800);
    const [maxRating, setMaxRating] = useState(1000);
    const [picking, setPicking] = useState(false);

    useEffect(() => {
        if (node) {
            setPid(node.pid);
            setRating(node.rating);
        }
    }, [node]);

    const handleSave = async () => {
        if (!node) return;
        try {
            // Use currentPosition from props (local state) if available, otherwise fallback to store
            let finalPos: [number, number];
            if (currentPosition) {
                finalPos = [Math.round(currentPosition.x), Math.round(currentPosition.y)];
            } else {
                finalPos = node.position;
            }

            await apiClient.post('/admin/graph/node', {
                id: nodeId,
                pid: pid,
                rating: isNaN(Number(rating)) ? 0 : Number(rating),
                position: finalPos,
                neighbors: node.neighbors
            });
            fetchGraph();
        } catch (e: any) {
            const msg = e.response?.data?.detail || e.message;
            alert("Error saving node: " + msg);
        }
    };

    const handlePickRandom = async () => {
        setPicking(true);
        try {
            const res = await apiClient.post('/admin/cf/random', {
                min_rating: minRating,
                max_rating: maxRating
            });
            const problem = res.data;
            setPid(problem.pid);
            setRating(problem.rating); // Auto-update node rating to match problem
            // alert(`Picked: ${problem.name} (${problem.rating})`);
        } catch (e: any) {
            const msg = e.response?.data?.detail || e.message;
            alert("Failed to pick problem: " + msg);
        }
        setPicking(false);
    };

    const openProblem = () => {
        const parts = pid.split('/');
        // Handle cases like "1234/A" or "1234/A1"
        if (parts.length >= 2) {
            const contestId = parts[0];
            const index = parts.slice(1).join('/'); // In case index has slash, though unlikely for CF, but safer
            window.open(`https://codeforces.com/contest/${contestId}/problem/${index}`, '_blank');
        }
    };

    if (!node) return <div>Node not found</div>;

    return (
        <div className="flex flex-col gap-4">
            <div>
                <label className="block text-xs font-mono text-muted-foreground mb-1">Codeforces Problem ID (Contest/Index)</label>
                <div className="flex gap-2">
                    <input
                        className="w-full bg-background border border-border rounded px-2 py-1"
                        value={pid}
                        onChange={e => setPid(e.target.value)}
                        placeholder="e.g. 1234/A"
                    />
                    <button
                        onClick={openProblem}
                        className="bg-slate-800 border border-slate-700 hover:bg-slate-700 text-white px-2 rounded flex items-center justify-center transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                        title="Open in Codeforces"
                        disabled={!pid || !pid.includes('/')}
                    >
                        <ExternalLink size={16} />
                    </button>
                </div>
            </div>

            <div className="space-y-2 border border-border/50 p-3 rounded-md bg-muted/30">
                <label className="block text-xs font-mono text-muted-foreground font-bold">Pick Random Problem</label>
                <div className="grid grid-cols-2 gap-2">
                    <div>
                        <label className="text-[10px] uppercase text-muted-foreground">Min Rating</label>
                        <input
                            type="number"
                            className="w-full bg-background border border-border rounded px-2 py-1 text-sm"
                            value={minRating}
                            onChange={e => setMinRating(parseInt(e.target.value))}
                            step={100}
                        />
                    </div>
                    <div>
                        <label className="text-[10px] uppercase text-muted-foreground">Max Rating</label>
                        <input
                            type="number"
                            className="w-full bg-background border border-border rounded px-2 py-1 text-sm"
                            value={maxRating}
                            onChange={e => setMaxRating(parseInt(e.target.value))}
                            step={100}
                        />
                    </div>
                </div>
                <button
                    onClick={handlePickRandom}
                    disabled={picking}
                    className="w-full bg-blue-600 hover:bg-blue-500 text-white text-xs py-1.5 rounded flex items-center justify-center gap-2 transition-colors disabled:opacity-50"
                >
                    <Dices size={14} />
                    {picking ? "Picking..." : "Pick Random Problem"}
                </button>
            </div>

            <div>
                <label className="block text-xs font-mono text-muted-foreground mb-1">Rating</label>
                <input
                    type="number"
                    className="w-full bg-background border border-border rounded px-2 py-1"
                    value={isNaN(rating) ? '' : rating}
                    onChange={e => setRating(parseInt(e.target.value))}
                />
            </div>

            <button onClick={handleSave} className="flex items-center justify-center gap-2 bg-green-600 text-white py-2 rounded mt-2 hover:bg-green-700">
                <Save size={16} /> Save Changes
            </button>
        </div>
    )
}
