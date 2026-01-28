export interface Node {
    id: string;
    pid: string;
    rating: number;
    position: [number, number];
    neighbors: string[];
    state?: 'locked' | 'available' | 'solved'; // For team view
}

export interface ContestConfig {
    name: string;
    start_time: number;
    duration: number;
    state: 'EDITING' | 'RUNNING' | 'FINISHED';
}

export interface Team {
    id: string;
    name: string;
    cf_handles: string[];
    solved: string[];
    available: string[];
    access_code: string;
}

export interface LeaderboardEntry {
    name: string;
    solved: number;
    score: number;
}

export interface AdminGraphResponse {
    nodes: Node[];
}

export interface TeamViewResponse {
    team_name: string;
    cf_handles: string[];
    solved_count: number;
    score: number;
    nodes: Node[];
    contest: ContestConfig;
}
