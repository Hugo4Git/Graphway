import uvicorn
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from contextlib import asynccontextmanager
from api.router import api_router
from services.contest_manager import manager
from services.poller import poller
from utils.auth import ADMIN_TOKEN
import asyncio

@asynccontextmanager
async def lifespan(app: FastAPI):
    # Startup
    print(f"Admin Token: {ADMIN_TOKEN}")
    await manager.start_contest()
    asyncio.create_task(poller.start())

    # Yield control to the application
    yield

    # Shutdown
    poller.stop()
    await manager.save_state()

app = FastAPI(lifespan=lifespan)

# Cross origin resource sharing
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Add /api/ endpoints
app.include_router(api_router, prefix="/api")

# Add root endpoint
@app.get("/")
def read_root():
    return {"message": "Graphway Backend"}

# Start uvicorn server
if __name__ == "__main__":
    uvicorn.run("main:app", host="0.0.0.0", port=8000)
