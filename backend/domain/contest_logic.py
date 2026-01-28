from typing import Optional, Set
from domain.models import Contest, Team, Node

class ContestLogic:
    def __init__(self):
        self.contest: Contest = None
        self.starting_nodes = set()
        self.pid_to_node = dict()
        self.handles = set()
        self.handle_to_team = dict()

    # Graph modification

    def add_node(self, node: Node):
        self._assert_node_id_free(node.id)
        self._assert_pid_free(node.pid)
        # Create a clean copy with copied neighbors set to avoid reference issues
        clean = node.model_copy(update={"neighbors": set(node.neighbors or set())})
        self.contest.nodes[node.id] = clean
        self.update_graph()

    def update_node(self, node: Node):
        self._assert_node_exists(node.id)
        self._assert_pid_free(node.pid, except_node_id=node.id)
        self.contest.nodes[node.id] = node
        self.update_graph()

    def delete_node(self, node_id: str):
        self._assert_node_exists(node_id)
        if node_id in self.contest.nodes:
            del self.contest.nodes[node_id]
            for node in self.contest.nodes.values():
                if node_id in node.neighbors:
                    node.neighbors.discard(node_id)
            
            for team in self.contest.teams:
                if node_id in team.solved:
                    team.solved.remove(node_id)

        self.update_graph()

    def add_edge(self, from_node_id: str, to_node_id: str):
        self._assert_node_exists(from_node_id)
        self._assert_node_exists(to_node_id)
        self._assert_no_self_loop(from_node_id, to_node_id)
        self.contest.nodes[from_node_id].neighbors.add(to_node_id)
        self.update_graph()

    def delete_edge(self, from_node_id: str, to_node_id: str):
        self._assert_node_exists(from_node_id)
        self._assert_node_exists(to_node_id)
        if to_node_id in self.contest.nodes[from_node_id].neighbors:
            self.contest.nodes[from_node_id].neighbors.discard(to_node_id)
        self.update_graph()

    # Contest modification

    def load_contest(self, contest: Contest) -> None:
        """Load existing contest"""
        self.contest = contest
        self.update_graph()
        self.update_handles()

    def rename(self, name: str):
        self.contest.name = name

    def add_team(self, team: Team) -> None:
        """Add team to the contest"""
        # Remove duplicates
        team.cf_handles = list(dict.fromkeys(team.cf_handles))
        
        if team.name in [t.name for t in self.contest.teams]:
            raise ValueError(f"Team {team.name} already exists.")
        for handle in team.cf_handles:
            if handle in self.handles:
                raise ValueError(f"Handle {handle} is already taken by another team.")
        self.contest.teams.append(team)
        self.update_handles()
        self.recompute_available_for_team(team)

    def update_team(self, team_id: str, name: str = None, handles: list[str] = None) -> None:
        """Update team details"""
        team = next((t for t in self.contest.teams if t.id == team_id), None)
        if not team:
            raise ValueError("Team not found")
        
        if name:
            if name != team.name and name in [t.name for t in self.contest.teams]:
                raise ValueError(f"Team name {name} already exists")
            team.name = name
            
        if handles is not None:
            # Remove duplicates
            handles = list(dict.fromkeys(handles))

            for h in handles:
                if h in self.handles and h not in team.cf_handles:
                    raise ValueError(f"Handle {h} is already taken by another team.")
            
            team.cf_handles = handles
            self.update_handles()

    def delete_team(self, team_id: str) -> None:
        """Remove team from the contest"""
        self.contest.teams = [t for t in self.contest.teams if t.id != team_id]
        self.update_handles()

    # Helpers

    def update_graph(self) -> None:
        """Update graph structures"""
        self.starting_nodes = set()
        self.pid_to_node = dict()
        if not self.contest:
            return
            
        indeg = {nid: 0 for nid in self.contest.nodes.keys()}
        for node in self.contest.nodes.values():
            for nb in node.neighbors:
                if nb in indeg:
                    indeg[nb] += 1
        self.starting_nodes = {nid for nid, d in indeg.items() if d == 0}
        for node in self.contest.nodes.values():
            if(node.pid):
                self.pid_to_node[node.pid] = node
        
        self.recompute_all_available()

    def update_handles(self) -> None:
        """Update structures containing handles"""
        self.handles = set()
        self.handle_to_team = dict()
        if not self.contest:
            return

        for team in self.contest.teams:
            for handle in team.cf_handles:
                self.handles.add(handle)
                self.handle_to_team[handle] = team

    def recompute_available_for_team(self, team: Team) -> None:
        """Recompute available nodes for specific team"""
        unlocked = set(self.starting_nodes)
        for solved_id in team.solved:
            node = self.contest.nodes.get(solved_id)
            if node:
                unlocked |= node.neighbors
        team.available = unlocked - team.solved

    def recompute_all_available(self) -> None:
        """Recompute available nodes for each team"""
        if not self.contest:
            return
        for team in self.contest.teams:
            self.recompute_available_for_team(team)

    def get_team_progress(self, team_id: str):
        """Return the distance to the farthest solved node"""
        if not self.contest or not self.contest.nodes:
            return 0
            
        lowest = 1000000
        for node in self.contest.nodes.values():
            if node.position[0] < lowest:
                lowest = node.position[0]

        best = 0
        for team in self.contest.teams:
            if team.id == team_id:
                if not team.solved:
                    return 0
                for solved_id in team.solved:
                    node = self.contest.nodes.get(solved_id)
                    if node:
                        best = max(best, node.position[0] - lowest)

        return best + 1

    def process_submission(self, sub) -> None:
        """Take any submission and update team solved accordingly"""
        try:
            verdict = sub.get("verdict")
            if verdict != "OK":
                return
            handle = sub["author"]["members"][0]["handle"]
            if handle not in self.handles:
                return

            problem = sub["problem"]
            team = self.handle_to_team[handle]
            pid = f"{problem['contestId']}/{problem['index']}"
            time = int(sub["creationTimeSeconds"])
            node = self.pid_to_node.get(pid)

            if not node:
                return
            if node.id not in team.available:
                return
            if time < self.contest.start_time or time > self.contest.start_time + self.contest.duration:
                return
            
            team.solved.add(node.id)
            self.recompute_available_for_team(team)

        except (KeyError, IndexError, TypeError):
            return


    def update_state(self, submissions) -> None:
        """Iterate through unfiltered submission list and invoke processing on each element"""
        if not self.contest:
            return
        for sub in submissions:
            self.process_submission(sub)

    def force_solve_node(self, team_id: str, node_id: str):
        """Manually mark a node as solved for a team"""
        if not self.contest:
            return
        
        team = next((t for t in self.contest.teams if t.id == team_id), None)
        if not team:
            raise ValueError("Team not found")
            
        self._assert_node_exists(node_id)
        
        # Add to solved
        team.solved.add(node_id)
        self.recompute_available_for_team(team)

    def force_unsolve_node(self, team_id: str, node_id: str):
        """Manually remove a node from solved for a team"""
        if not self.contest:
            return

        team = next((t for t in self.contest.teams if t.id == team_id), None)
        if not team:
            raise ValueError("Team not found")
            
        self._assert_node_exists(node_id)
        
        # Remove from solved
        if node_id in team.solved:
            team.solved.remove(node_id)
            self.recompute_available_for_team(team)

    # --- Internal Assertions ---

    def _assert_node_id_free(self, node_id: str) -> None:
        if node_id in self.contest.nodes:
            raise ValueError(f"Node id '{node_id}' already exists.")

    def _assert_pid_free(self, pid: str, *, except_node_id: Optional[str] = None):
        for nid, nd in self.contest.nodes.items():
            if except_node_id is not None and nid == except_node_id:
                continue
            if pid and nd.pid == pid:
                raise ValueError(f"Problem pid '{pid}' is already used by another node.")

    def _assert_node_exists(self, node_id: str):
        if node_id not in self.contest.nodes:
            raise ValueError(f"Node '{node_id}' does not exist.")

    def _assert_no_self_loop(self, from_id: str, to_id: str):
        if from_id == to_id:
            raise ValueError("Self-loops are not allowed.")
