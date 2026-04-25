from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.requests import Request
from fastapi.responses import JSONResponse
from fastapi import WebSocket, WebSocketDisconnect
from datetime import datetime, timezone
import logging
import asyncio

from backend.utils import store
import backend.utils.state as state
from backend.routes import simulations, events, system

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s - %(levelname)s - %(name)s - %(message)s",
)
logger = logging.getLogger("Kernel Shield")

app = FastAPI(
    title="Kernel Shield",
    description="Real-Time Operating System Vulnerability Simulation & Detection Framework",
    version="1.0.0",
)

@app.on_event("startup")
def startup_event():
    try:
        store.init_db()
    except Exception:
        logger.exception("Failed to initialize database on startup")
    try:
        state.async_loop = asyncio.get_running_loop()
        logger.info("Captured async loop %s", state.async_loop)
    except Exception as e:
        state.async_loop = None
        logger.warning("Could not capture async loop: %s", e)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(simulations.router)
app.include_router(events.router)
app.include_router(system.router)

@app.get("/")
def home():
    return {
        "metadata": {"module": "Health Check", "timestamp": datetime.now(timezone.utc).isoformat()},
        "status": "Kernel Shield running",
    }

@app.exception_handler(Exception)
async def global_exception_handler(request: Request, exc: Exception):
    logger.exception("Unhandled error occurred: %s", exc)
    return JSONResponse(
        status_code=500,
        content={
            "error": "Internal Server Error",
            "timestamp": datetime.now(timezone.utc).isoformat(),
        },
    )

@app.websocket("/ws/updates")
async def websocket_endpoint(websocket: WebSocket):
    await state.manager.connect(websocket)
    try:
        while True:
            await websocket.receive_text()
    except WebSocketDisconnect:
        state.manager.disconnect(websocket)
    except Exception:
        state.manager.disconnect(websocket)

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)
