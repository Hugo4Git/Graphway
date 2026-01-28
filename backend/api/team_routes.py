from fastapi import APIRouter, HTTPException, Depends
from pydantic import BaseModel
from typing import List, Optional
from services.contest_manager import manager
from domain.models import Team

router = APIRouter()

@router.get("/me/{token}")
async def get_team_view(token: str):
    view = await manager.get_team_view(token)
    
    if not view:
        raise HTTPException(status_code=404, detail="Team not found")
        
    return view
