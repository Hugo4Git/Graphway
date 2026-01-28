from fastapi import APIRouter
from services.contest_manager import manager

router = APIRouter()

@router.get("/leaderboard")
async def get_leaderboard():
    leaderboard = await manager.get_leaderboard_data()
    leaderboard.sort(key=lambda x: (x["score"], x["solved"]), reverse=True)
    return leaderboard
