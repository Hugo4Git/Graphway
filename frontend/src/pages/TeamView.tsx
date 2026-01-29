import { useEffect, useState, useCallback } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { ReactFlow, Background, useNodesState, useEdgesState, type Edge, type ReactFlowInstance, MarkerType, type Node } from '@xyflow/react';
import '@xyflow/react/dist/style.css';
import { apiClient } from '../api/client';
import type { TeamViewResponse } from '../types';
import CustomNode from '../components/CustomNode';
import FloatingEdge from '../components/FloatingEdge';

const nodeTypes = { custom: CustomNode };
const edgeTypes = { floating: FloatingEdge };

export default function TeamView() {
    const { token } = useParams();
    const navigate = useNavigate();
    const [data, setData] = useState<TeamViewResponse | null>(null);
    const [nodes, setNodes, onNodesChange] = useNodesState<Node>([]);
    const [edges, setEdges, onEdgesChange] = useEdgesState<Edge>([]);
    const [loading, setLoading] = useState(true);
    const [rfInstance, setRfInstance] = useState<ReactFlowInstance | null>(null);
    const [translateExtent, setTranslateExtent] = useState<[[number, number], [number, number]] | undefined>(undefined);
    const [, setTick] = useState(0);

    useEffect(() => {
        const timer = setInterval(() => setTick(t => t + 1), 1000);
        return () => clearInterval(timer);
    }, []);

    const fetchData = useCallback(async () => {
        if (!token) return;
        try {
            const res = await apiClient.get<TeamViewResponse>(`/team/me/${token}`);
            setData(res.data);

            const teamNodes = res.data.nodes;

            // Calculate bounds
            if (teamNodes.length > 0) {
                let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
                teamNodes.forEach(n => {
                    const x = n.position[0];
                    const y = n.position[1];
                    if (x < minX) minX = x;
                    if (y < minY) minY = y;
                    if (x > maxX) maxX = x;
                    if (y > maxY) maxY = y;
                });
                // Add margin (e.g. 500px) and account for node size (approx 200x100)
                const margin = 500;
                const nodeWidth = 200;
                const nodeHeight = 100;

                let extMinX = minX - margin;
                let extMinY = minY - margin;
                let extMaxX = maxX + nodeWidth + margin;
                let extMaxY = maxY + nodeHeight + margin;

                // Enforce target aspect ratio (16:9) to prevent view clipping
                // This ensures the view fits comfortably on a standard screen
                const width = extMaxX - extMinX;
                const height = extMaxY - extMinY;
                const targetRatio = 16 / 9;

                if (width / height < targetRatio) {
                    // Too tall/thin: increase width
                    const targetWidth = height * targetRatio;
                    const diff = targetWidth - width;
                    extMinX -= diff / 2;
                    extMaxX += diff / 2;
                } else if (width / height > targetRatio) {
                    // Too short/wide: increase height
                    const targetHeight = width / targetRatio;
                    const diff = targetHeight - height;
                    extMinY -= diff / 2;
                    extMaxY += diff / 2;
                }

                setTranslateExtent([
                    [extMinX, extMinY],
                    [extMaxX, extMaxY]
                ]);
            }

            const newNodes = teamNodes.map((n) => ({
                id: n.id,
                type: 'custom',
                position: { x: n.position[0], y: n.position[1] },
                data: {
                    id: n.id,
                    pid: n.pid,
                    rating: n.state === 'locked' ? '???' : n.rating,
                    neighbors: n.neighbors,
                    state: n.state // Pass state to CustomNode
                },
                width: 128,
                height: 128,
                // Removed inline style, let CustomNode handle it
                draggable: false,
                connectable: false
            }));

            const newEdges: Edge[] = [];
            teamNodes.forEach((n) => {
                n.neighbors.forEach((target) => {
                    newEdges.push({
                        id: `e${n.id}-${target}`,
                        source: n.id,
                        target: target,
                        animated: n.state === 'solved',
                        type: 'floating', // Use FloatingEdge
                        markerEnd: {
                            type: MarkerType.ArrowClosed,
                            width: 20,
                            height: 20,
                            color: n.state === 'solved' ? '#22c55e' : '#94a3b8',
                        },
                        style: { stroke: n.state === 'solved' ? '#22c55e' : '#94a3b8', strokeWidth: 2 }
                    });
                });
            });

            setNodes(newNodes);
            setEdges(newEdges);

            // Fit view after data load


        } catch (e: any) {
            console.error(e);
            if (e.response?.status === 404) {
                navigate('/');
            }
        }
        setLoading(false);
    }, [token, rfInstance, setNodes, setEdges, navigate]);

    useEffect(() => {
        fetchData();
        const interval = setInterval(fetchData, 10000); // Polling every 10s
        return () => clearInterval(interval);
    }, [fetchData]);

    const onInit = (instance: ReactFlowInstance) => {
        setRfInstance(instance);
        // Initial fit view slightly delayed to ensure nodes are measured
        setTimeout(() => instance.fitView({ padding: 0.2 }), 100);
    };

    if (loading && !data) return <div className="p-10 text-center text-white">Loading Team Data...</div>;

    const onNodeClick = (_: React.MouseEvent, node: any) => {
        if (node.data.state === 'locked' || !node.data.pid) return;

        const [contestId, index] = node.data.pid.split('/');
        if (contestId && index) {
            window.open(`https://codeforces.com/contest/${contestId}/problem/${index}`, '_blank');
        }
    };

    return (
        <div className="w-full h-screen flex flex-col bg-transparent">
            <header className="h-16 px-6 border-b border-white/10 bg-black/40 backdrop-blur-md flex items-center justify-between shrink-0 z-20">
                <div>
                    <h1 className="text-xl font-bold text-white flex items-center gap-3">
                        {data?.team_name || "Team View"}
                        {data?.cf_handles && (
                            <span className="text-sm font-normal text-muted-foreground bg-white/5 px-2 py-0.5 rounded border border-white/10">
                                {data.cf_handles.join(", ")}
                            </span>
                        )}
                    </h1>
                    <p className="text-sm text-muted-foreground">
                        Solved: <span className="text-emerald-400 font-bold">{data?.solved_count || 0}</span>
                        <span className="mx-2 text-white/20">|</span>
                        Score: <span className="text-blue-400 font-bold">{data?.score || 0}</span>
                    </p>
                </div>
                <div className="flex items-center gap-6">
                    <button
                        onClick={() => rfInstance?.fitView({ padding: 0.2 })}
                        className="flex items-center gap-2 px-3 py-1.5 rounded-md bg-white/5 hover:bg-white/10 border border-white/10 text-sm text-white transition-all active:scale-95"
                        title="Center View"
                    >
                        <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10" /><circle cx="12" cy="12" r="3" /></svg>
                        <span>Center</span>
                    </button>
                    <div className="text-right">
                        <div className="text-xs text-muted-foreground">Team Link</div>
                        <code
                            className="bg-black/30 px-2 py-1 rounded text-xs select-all cursor-pointer text-white hover:bg-white/10"
                            onClick={() => navigator.clipboard.writeText(`${window.location.origin}/t/${token}`)}
                            title="Click to copy"
                        >
                            {`${window.location.origin}/t/${token}`}
                        </code>
                    </div>
                </div>
            </header>

            <div className="flex-grow w-full relative" style={{ height: 'calc(100vh - 64px)' }}>
                {(() => {
                    // Check contest status
                    if (data && data.contest) {
                        if (data.contest.state === 'EDITING') {
                            return (
                                <div className="absolute inset-0 flex flex-col items-center justify-center text-white bg-black/80 backdrop-blur-sm z-50">
                                    <h2 className="text-4xl font-bold mb-4">Contest Preparation</h2>
                                    <p className="text-xl text-muted-foreground">The contest is currently being set up.</p>
                                    <p className="text-sm text-muted-foreground mt-4">Please wait for the organizers to start the contest.</p>
                                </div>
                            );
                        }

                        const now = Math.floor(Date.now() / 1000);
                        const startTime = data.contest.start_time;
                        const endTime = startTime + data.contest.duration;

                        if (now < startTime) {
                            const diff = startTime - now;
                            const hours = Math.floor(diff / 3600);
                            const minutes = Math.floor((diff % 3600) / 60);
                            const seconds = diff % 60;
                            const timeString = `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;

                            return (
                                <div className="absolute inset-0 flex flex-col items-center justify-center text-white bg-black/80 backdrop-blur-sm z-50">
                                    <h2 className="text-4xl font-bold mb-8">Contest Has Not Started Yet</h2>
                                    <div className="text-xl text-muted-foreground mb-4">Starting in</div>
                                    <div className="text-8xl font-mono font-bold text-blue-400 tracking-wider">
                                        {timeString}
                                    </div>
                                    <div className="mt-12 text-muted-foreground">
                                        Good luck, {data.team_name}!
                                    </div>
                                </div>
                            );
                        }

                        if (now > endTime) {
                            return (
                                <div className="absolute inset-0 flex flex-col items-center justify-center text-white bg-black/80 backdrop-blur-sm z-50">
                                    <h2 className="text-4xl font-bold mb-8">Contest Has Ended</h2>
                                    <p className="text-xl text-muted-foreground mb-8">Thank you for participating!</p>

                                    <div className="flex gap-4">
                                        <Link to="/leaderboard" className="px-6 py-3 bg-blue-500 hover:bg-blue-600 rounded-lg font-bold transition-colors">
                                            View Final Leaderboard
                                        </Link>
                                    </div>
                                </div>
                            );
                        }
                    }

                    return (
                        <>
                            {nodes.length > 0 && (
                                <ReactFlow
                                    nodes={nodes}
                                    edges={edges}
                                    onNodesChange={onNodesChange}
                                    onEdgesChange={onEdgesChange}
                                    onNodeClick={onNodeClick}
                                    nodeTypes={nodeTypes}
                                    edgeTypes={edgeTypes}
                                    onInit={onInit}
                                    translateExtent={translateExtent}
                                    minZoom={0.1}
                                    fitView
                                    fitViewOptions={{ padding: 0.2 }}
                                    proOptions={{ hideAttribution: true }}
                                    attributionPosition="bottom-right"
                                >
                                    <Background color="#27272a" gap={16} />
                                </ReactFlow>
                            )}
                            {nodes.length === 0 && !loading && (
                                <div className="absolute inset-0 flex items-center justify-center text-muted-foreground">
                                    Nothing to see here.
                                </div>
                            )}
                        </>
                    );
                })()}
            </div>
        </div>
    );
}
