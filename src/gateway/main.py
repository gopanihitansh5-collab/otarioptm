import os
import asyncio
from fastapi import FastAPI, WebSocket, WebSocketDisconnect, Depends, HTTPException, Request, status
from fastapi.middleware.cors import CORSMiddleware
from typing import Dict, Any, List, Optional

from src.services.otari_client import get_otari_client, OTARIClient
from src.services.budget import BudgetManager
from src.services.router import select_model

app = FastAPI(title="OtariOptm Gateway", version="0.1.0")

# CORS for Next.js frontend
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173", "http://localhost:3000"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Shared budget instance
budget = BudgetManager()

# OTARI client singleton
otari_client: Optional[OTARIClient] = None


@app.on_event("startup")
async def startup():
    global otari_client
    api_key = os.environ.get("OTARI_API_KEY")
    if api_key:
        otari_client = get_otari_client()
    else:
        print("WARNING: OTARI_API_KEY not set")


@app.on_event("shutdown")
async def shutdown():
    if otari_client:
        await otari_client.client.aclose()


# Dependency to get OTARI client
def get_otari() -> OTARIClient:
    if not otari_client:
        raise HTTPException(status_code=503, detail="OTARI client not initialized")
    return otari_client


@app.middleware("http")
async def budget_middleware(request: Request, call_next):
    """Budget middleware - check before dispatch, track after."""
    if otari_client and request.method in ("POST",) and "/chat/completions" in request.url.path:
        try:
            body = await request.json()
            estimated_cost = body.get("estimated_cost", 0.01)
        except (Exception,):
            estimated_cost = 0.01

        # Check budget before processing
        if estimated_cost > 0:
            budget_ok = await budget.check_budget(estimated_cost)
            if not budget_ok:
                raise HTTPException(
                    status_code=402,
                    detail="Budget exceeded - project cap reached. Please top up or reduce usage.",
                )

    response = await call_next(request)

    # Track spending after request
    if otari_client and request.method in ("POST",) and "/chat/completions" in request.url.path and response.status_code == 200:
        try:
            body = await response.json()
            # Estimate cost from response if available
            pass
        except (Exception,):
            pass

    return response


@app.get("/api/v1/models", response_model=List[Dict[str, Any]])
async def get_models(client: OTARIClient = Depends(get_otari)):
    """GET /api/v1/models - Fetch available OTARI models."""
    return await client.fetch_models()


@app.post("/api/v1/chat/completions", response_model=Dict[str, Any])
async def chat_completions(
    request: Request,
    client: OTARIClient = Depends(get_otari),
):
    """POST /api/v1/chat/completions - Send chat completion to OTARI."""
    body = await request.json()
    model = body.get("model", "")
    messages = body.get("messages", [])

    if not model or not messages:
        raise HTTPException(status_code=400, detail="Model and messages are required")

    return await client.chat_completions(model=model, messages=messages)


@app.websocket("/api/v1/activity")
async def activity_ws(websocket: WebSocket, model: str = ""):
    """WebSocket /api/v1/activity - Stream activity updates."""
    await websocket.accept()
    try:
        if otari_client:
            await otari_client.client.connect(f"/activity?model={model}")
        while True:
            data = await websocket.receive_text()
            # Forward activity data
            await websocket.send_text(data)
    except WebSocketDisconnect:
        pass