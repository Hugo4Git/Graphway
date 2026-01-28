from pydantic import BaseModel, Field
from enum import Enum
from typing import List, Set, Tuple, Dict
from secrets import token_urlsafe

class Team(BaseModel):
    id: str
    name: str
    cf_handles: List[str] = Field(default_factory=list) # Codeforces handles
    solved: Set[str] = Field(default_factory=set) # ids of unlocked nodes
    available: Set[str] = Field(default_factory=set) # ids of available nodes
    access_code: str = Field(default_factory=lambda: token_urlsafe(8))

class Node(BaseModel):
    id: str
    pid: str # problem id, unique for node
    rating: int # problem difficulty
    position: Tuple[int, int] # (x, y)
    neighbors: Set[str] = Field(default_factory=set)


class ContestState(str, Enum):
    EDITING = "EDITING"
    RUNNING = "RUNNING"
    FINISHED = "FINISHED"

class Contest(BaseModel):
    name: str
    nodes: Dict[str, Node] = Field(default_factory=dict)
    teams: List[Team] = Field(default_factory=list)
    start_time: int = 0
    duration: int = 0
    state: ContestState = ContestState.EDITING