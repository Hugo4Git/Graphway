import json
import os
import time
from typing import Optional
import dataclasses
from domain.contest_logic import ContestLogic
from domain.models import Contest, Team, Node, ContestState

AUTOSAVE_FILE = "contests/contest_autosave.json"

import asyncio
import copy

class ContestManager:
    def __init__(self):
        self.logic = ContestLogic()
        self.autosave_path = AUTOSAVE_FILE
        self.lock = asyncio.Lock()

    async def start_contest(self):
        directory = os.path.dirname(self.autosave_path)
        if directory and not os.path.exists(directory):
            os.makedirs(directory, exist_ok=True)
            
        if os.path.exists(self.autosave_path):
            try:
                await self.load_from_file(self.autosave_path)
                print(f"Loaded {self.logic.contest.name} autosave from {self.autosave_path}")
            except Exception as e:
                print(f"Failed to load autosave: {e}")
                await self._init_default()
        else:
            await self._init_default()

    async def reset_contest(self):
        """Resets the contest to a default empty state"""
        async with self.lock:
            self._init_default_sync()
            await self.save_state_internal()

    async def _init_default(self):
        async with self.lock:
            self._init_default_sync()

    def _init_default_sync(self):
        self.logic.contest = Contest(
            name="New Contest",
            nodes={},
            teams=[],
            start_time=int(time.time()) + 3600,
            duration=18000,
            state=ContestState.EDITING
        )
        self.logic.update_graph()

    async def save_state(self):
        """Save current contest state to file (public async wrapper)"""
        async with self.lock:
            await self.save_state_internal()

    async def save_state_internal(self):
        """Internal save, assumes lock is held"""
        data = self._serialize_contest(self.logic.contest)
        with open(self.autosave_path, "w") as f:
            json.dump(data, f, indent=2)

    async def load_from_file(self, path: str):
        with open(path, "r") as f:
            data = json.load(f)
        
        async with self.lock:
            contest = self._deserialize_contest(data)
            self.logic.load_contest(contest)
            await self.save_state_internal()

    async def load_contest_from_data(self, data: dict):
        async with self.lock:
            contest = self._deserialize_contest(data)
            self.logic.load_contest(contest)
            await self.save_state_internal()

    async def get_contest_state_data(self) -> dict:
        async with self.lock:
            return self._serialize_contest(self.logic.contest)

    # Graph operations

    async def set_contest_state(self, state: ContestState):
        async with self.lock:
            self.logic.contest.state = state

    async def add_or_update_node(self, node: Node):
        async with self.lock:
            if self.logic.contest.state != ContestState.EDITING:
                raise ValueError("Cannot modify graph during contest (must be in EDITING state)")
            if node.id in self.logic.contest.nodes:
                self.logic.update_node(node)
            else:
                self.logic.add_node(node)

    async def delete_node(self, node_id: str):
        async with self.lock:
            if self.logic.contest.state != ContestState.EDITING:
                raise ValueError("Cannot modify graph during contest (must be in EDITING state)")
            self.logic.delete_node(node_id)

    async def add_edge(self, from_id: str, to_id: str):
        async with self.lock:
            if self.logic.contest.state != ContestState.EDITING:
                raise ValueError("Cannot modify graph during contest (must be in EDITING state)")
            self.logic.add_edge(from_id, to_id)

    async def delete_edge(self, from_id: str, to_id: str):
        async with self.lock:
            if self.logic.contest.state != ContestState.EDITING:
                raise ValueError("Cannot modify graph during contest (must be in EDITING state)")
            self.logic.delete_edge(from_id, to_id)

    # Contest operations

    async def update_config(self, start_time: int, duration: int, name: str = None):
        async with self.lock:
            self.logic.contest.start_time = start_time
            self.logic.contest.duration = duration
            if name:
                self.logic.rename(name)

    async def add_team(self, team: Team):
        async with self.lock:
            self.logic.add_team(team)

    async def update_team(self, team_id: str, name: str = None, handles: list = None):
        async with self.lock:
            self.logic.update_team(team_id, name, handles)

    async def remove_team(self, team_id: str):
        async with self.lock:
            self.logic.delete_team(team_id)

    async def process_submissions(self, subs):
        """Processes submissions with lock"""
        async with self.lock:
            self.logic.update_state(subs)

    async def force_solve_node(self, team_id: str, node_id: str):
        async with self.lock:
            self.logic.force_solve_node(team_id, node_id)
            await self.save_state_internal()

    async def force_unsolve_node(self, team_id: str, node_id: str):
        async with self.lock:
            self.logic.force_unsolve_node(team_id, node_id)
            await self.save_state_internal()

    # Data access wrappers

    async def get_team_node_states(self, team_id: str):
        async with self.lock:
            team = next((t for t in self.logic.contest.teams if t.id == team_id), None)
            if not team:
                return None
            return {
                "name": team.name,
                "solved": list(team.solved),
                "available": list(team.available)
            }

    async def get_leaderboard_data(self):
        async with self.lock:
            teams = self.logic.contest.teams
            leaderboard = []
            for t in teams:
                score = self.logic.get_team_progress(t.id)
                leaderboard.append({
                    "name": t.name,
                    "solved": len(t.solved),
                    "score": score
                })
            return leaderboard

    async def get_team_view(self, token: str):
        async with self.lock:
            team = next((t for t in self.logic.contest.teams if t.access_code == token), None)
            if not team:
                return None
            
            nodes = []
            for nid, node in self.logic.contest.nodes.items():
                state = "locked"
                if nid in team.solved:
                    state = "solved"
                elif nid in team.available:
                    state = "available"
                    
                nodes.append({
                    "id": nid,
                    "pid": node.pid,
                    "position": node.position,
                    "state": state,
                    "neighbors": list(node.neighbors)
                })
            
            score = self.logic.get_team_progress(team.id)
            return {
                "team_name": team.name,
                "cf_handles": team.cf_handles,
                "solved_count": len(team.solved),
                "score": score,
                "nodes": nodes,
                "contest": {
                    "name": self.logic.contest.name,
                    "start_time": self.logic.contest.start_time,
                    "duration": self.logic.contest.duration,
                    "state": self.logic.contest.state
                }
            }
            
    async def get_admin_status(self):
        async with self.lock:
            contest = self.logic.contest
            return {
                "status": "ok",
                "role": "admin",
                "contest": {
                    "name": contest.name,
                    "start_time": contest.start_time,
                    "duration": contest.duration,
                    "state": contest.state
                }
            }

    async def get_graph_data(self):
        async with self.lock:
            nodes = self.logic.contest.nodes
            return {
                "nodes": [
                    {
                        "id": n.id,
                        "pid": n.pid,
                        "rating": n.rating,
                        "position": n.position,
                        "neighbors": list(n.neighbors)
                    } for n in nodes.values()
                ]
            }

    async def get_all_teams(self):
         async with self.lock:
            # Convert sets to lists for JSON serialization
            return [
                {
                    "id": t.id,
                    "name": t.name,
                    "cf_handles": t.cf_handles,
                    "solved": list(t.solved),
                    "available": list(t.available),
                    "access_code": t.access_code
                }
                for t in self.logic.contest.teams
            ]

    # Internal Helpers for Serialization

    def _serialize_contest(self, contest: Contest) -> dict:
        return contest.model_dump(mode='json')

    def _deserialize_contest(self, data: dict) -> Contest:
        try:
            return Contest.model_validate(data)
        except Exception as e:
            raise ValueError(f"Invalid contest file format: {str(e)}")

# Global Instance
manager = ContestManager()
