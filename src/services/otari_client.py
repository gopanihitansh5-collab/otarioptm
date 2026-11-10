import os
import httpx
from typing import Any, Dict, List, Optional
from fastapi import HTTPException

OTARI_BASE_URL = "https://eu.api.otari.ai/api/v1"


class OTARIClient:
    def __init__(self, api_key: str):
        self.api_key = api_key
        self.client = httpx.AsyncClient(
            base_url=OTARI_BASE_URL,
            headers={"Otari-Key": api_key, "Content-Type": "application/json"},
            timeout=60.0,
        )

    async def fetch_models(self) -> List[Dict[str, Any]]:
        """GET /api/v1/models - Fetch available OTARI models."""
        resp = await self.client.get("/models")
        if resp.status_code == 402:
            raise HTTPException(status_code=402, detail="OTARI payment required - key needs onboarding")
        if resp.status_code != 200:
            raise HTTPException(status_code=resp.status_code, detail=f"OTARI models error: {resp.text}")
        return resp.json()

    async def chat_completions(
        self,
        model: str,
        messages: List[Dict[str, Any]],
        temperature: float = 0.7,
        max_tokens: int = 4000,
        stream: bool = False,
    ) -> Dict[str, Any]:
        """POST /api/v1/chat/completions - Send chat completion to OTARI."""
        resp = await self.client.post(
            "/chat/completions",
            json={
                "model": model,
                "messages": messages,
                "temperature": temperature,
                "max_tokens": max_tokens,
                "stream": stream,
            },
        )
        if resp.status_code == 402:
            raise HTTPException(status_code=402, detail="OTARI budget exceeded - project cap reached")
        if resp.status_code == 429:
            raise HTTPException(status_code=429, detail="OTARI rate limited - retry after backoff")
        if resp.status_code != 200:
            raise HTTPException(status_code=resp.status_code, detail=f"OTARI chat error: {resp.text}")
        return resp.json()

    async def activity_stream(self, model: str, session_id: str):
        """WebSocket /api/v1/activity - Stream activity updates."""
        raise NotImplementedError("WebSocket activity stream - use FastAPI WebSocket endpoint directly")


    async def close(self) -> None:
        """Release the underlying httpx connection pool."""
        await self.client.aclose()


def get_otari_client() -> OTARIClient:
    api_key = os.environ.get("OTARI_API_KEY")
    if not api_key:
        raise ValueError("OTARI_API_KEY environment variable not set")
    return OTARIClient(api_key)