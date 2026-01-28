from fastapi import APIRouter
from api import admin_routes, team_routes, public_routes

api_router = APIRouter()

api_router.include_router(admin_routes.router, prefix="/admin", tags=["admin"])
api_router.include_router(team_routes.router, prefix="/team", tags=["team"])
api_router.include_router(public_routes.router, prefix="/public", tags=["public"])
