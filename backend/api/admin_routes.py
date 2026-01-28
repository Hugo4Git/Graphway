from fastapi import APIRouter, Depends, HTTPException, Body, UploadFile, File
from fastapi.responses import JSONResponse
from typing import List, Tuple, Optional
import json
from pydantic import BaseModel

from utils.auth import get_admin_token
from services.contest_manager import manager
from services.cf_client import cf_client

from domain.models import Node, ContestState

router = APIRouter(dependencies=[Depends(get_admin_token)])

class ConfigUpdate(BaseModel):
    start_time: int
    duration: int
    name: Optional[str] = None

class StateUpdate(BaseModel):
    state: ContestState

class NodeModel(BaseModel):
    id: str
    pid: str
    rating: int
    position: Tuple[int, int]
    neighbors: List[str] = []

class EdgeModel(BaseModel):
    from_id: str
    to_id: str

@router.get("/status")
async def get_admin_status():
    return await manager.get_admin_status()

@router.post("/config")
async def update_config(config: ConfigUpdate):
    await manager.update_config(config.start_time, config.duration, config.name)
    await manager.save_state()
    return {"status": "updated"}

@router.post("/reset")
async def reset_contest():
    await manager.reset_contest()
    return {"status": "reset", "message": "Contest has been reset to default state"}

@router.post("/contest/state")
async def set_contest_state(update: StateUpdate):
    await manager.set_contest_state(update.state)
    await manager.save_state()
    return {"status": "updated", "state": update.state}

@router.get("/graph")
async def get_graph():
    return await manager.get_graph_data()

@router.post("/graph/node")
async def add_update_node(node: NodeModel):
    try:
        new_node = Node(
            id=node.id,
            pid=node.pid,
            rating=node.rating,
            position=node.position,
            neighbors=set(node.neighbors)
        )

        await manager.add_or_update_node(new_node)
        
        await manager.save_state()
        return {"status": "ok"}
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))

@router.delete("/graph/node/{node_id}")
async def delete_node(node_id: str):
    try:
        await manager.delete_node(node_id)
        await manager.save_state()
        return {"status": "deleted"}
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))

@router.post("/graph/edge")
async def add_edge(edge: EdgeModel):
    try:
        await manager.add_edge(edge.from_id, edge.to_id)
        await manager.save_state()
        return {"status": "added"}
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))

@router.delete("/graph/edge")
async def delete_edge(edge: EdgeModel):
    try:
        await manager.delete_edge(edge.from_id, edge.to_id)
        await manager.save_state()
        return {"status": "deleted"}
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))

@router.get("/export")
async def export_contest():
    data = await manager.get_contest_state_data()
    return JSONResponse(
        content=data,
        headers={"Content-Disposition": "attachment; filename=contest_export.json"}
    )

@router.post("/import")
async def import_contest(file: UploadFile = File(...)):
    try:
        content = await file.read()
        data = json.loads(content)
        await manager.load_contest_from_data(data)
        return {"status": "imported", "message": "Contest state loaded successfully"}
    except json.JSONDecodeError:
        raise HTTPException(status_code=400, detail="Invalid JSON file")
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))

import uuid
from domain.models import Team

class TeamCreate(BaseModel):
    name: str
    handles: List[str]

@router.get("/teams")
async def get_teams():
    return await manager.get_all_teams()

@router.post("/teams")
async def add_team(team_data: TeamCreate):
    try:
        new_team = Team(
            id=str(uuid.uuid4()),
            name=team_data.name,
            cf_handles=team_data.handles
        )
        await manager.add_team(new_team)
        await manager.save_state()
        return {
            "id": new_team.id,
            "name": new_team.name,
            "cf_handles": new_team.cf_handles,
            "solved": list(new_team.solved),
            "available": list(new_team.available),
            "access_code": new_team.access_code
        }
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))

@router.delete("/teams/{team_id}")
async def delete_team(team_id: str):
    await manager.remove_team(team_id)
    await manager.save_state()
    return {"status": "deleted"}

class TeamUpdate(BaseModel):
    name: Optional[str] = None
    handles: Optional[List[str]] = None

@router.put("/teams/{team_id}")
async def update_team(team_id: str, team_data: TeamUpdate):
    try:
        await manager.update_team(team_id, name=team_data.name, handles=team_data.handles)
        await manager.save_state()
        return {"status": "updated"}
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))

@router.post("/teams/{team_id}/nodes/{node_id}/solve")
async def force_solve_node(team_id: str, node_id: str):
    try:
        await manager.force_solve_node(team_id, node_id)
        return {"status": "solved"}
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))

@router.post("/teams/{team_id}/nodes/{node_id}/unsolve")
async def force_unsolve_node(team_id: str, node_id: str):
    try:
        await manager.force_unsolve_node(team_id, node_id)
        return {"status": "unsolved"}
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))

@router.get("/teams/{team_id}/state")
async def get_team_state(team_id: str):
    state = await manager.get_team_node_states(team_id)
    if state is None:
        raise HTTPException(status_code=404, detail="Team not found")
    return state

class RandomProblemRequest(BaseModel):
    min_rating: int
    max_rating: int

@router.post("/cf/random")
def get_random_problem(req: RandomProblemRequest):
    # CF Client is sync for now, keeping it sync or wrapped
    problem = cf_client.get_random_problem(min_rating=req.min_rating, max_rating=req.max_rating)
    if not problem:
        raise HTTPException(status_code=404, detail=f"No problems found in range {req.min_rating}-{req.max_rating}")
    
    # Format for frontend convenience
    return {
        "contestId": problem['contestId'],
        "index": problem['index'],
        "name": problem['name'],
        "rating": problem['rating'],
        "pid": f"{problem['contestId']}/{problem['index']}"
    }