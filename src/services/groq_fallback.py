# Groq Fallback Handler for OtariOptm
# If OTARI gateway fails, automatically switch to free Groq models

import httpx
import time
from typing import Optional, Dict, Any, List
from fastapi import HTTPException

# Groq free tier endpoints (as of 2026)
GROQ_BASE_URL = "https://api.groq.com/openai/v1"
GROQ_MODELS = {
    "mixtral-8x7b-32768": "mixtral",
    "llama3-8b-8192": "llama3", 
    "gemma-7b-it": "gemma",
}

class GroqFallback:
    """Handles Groq API fallback when OTARI gateway is unavailable or rate-limited."""
    
    def __init__(self, groq_api_key: str):
        self.api_key = groq_api_key
        self.client = httpx.AsyncClient(
            base_url=GROQ_BASE_URL,
            headers={"Authorization": f"Bearer {groq_api_key}", "Content-Type": "application/json"},
            timeout=60.0,
        )
        self.fallback_latency = 0.0
        self.success_count = 0
        self.failure_count = 0
    
    async def chat_completions(
        self,
        messages: List[Dict[str, Any]],
        model: str = "mixtral-8x7b-32768",
        temperature: float = 0.7,
        max_tokens: int = 1000,
        stream: bool = False,
    ) -> Dict[str, Any]:
        """
        Send request to Groq API with fallback handling.
        Returns response dict or raises HTTPException.
        """
        try:
            start = time.time()
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
            
            latency = time.time() - start
            self.fallback_latency = (self.fallback_latency * 0.9) + (latency * 0.1)
            
            if resp.status_code == 200:
                self.success_count += 1
                return resp.json()
            elif resp.status_code == 429:  # Rate limited
                self.failure_count += 1
                raise HTTPException(
                    status_code=429,
                    detail=f"Groq rate limited. Latency: {self.fallback_latency:.2f}s"
                )
            elif resp.status_code == 402:  # Payment required
                self.failure_count += 1
                raise HTTPException(
                    status_code=402,
                    detail="Groq free tier quota exceeded. Try again later."
                )
            else:
                self.failure_count += 1
                raise HTTPException(
                    status_code=resp.status_code,
                    detail=f"Groq API error: {resp.text}"
                )
                
        except httpx.RequestError as e:
            self.failure_count += 1
            raise HTTPException(
                status_code=503,
                detail=f"Groq connection error: {str(e)}"
            )
    
    async def get_available_models(self) -> List[str]:
        """Return list of available Groq models."""
        return list(GROQ_MODELS.keys())
    
    async def health_check(self) -> bool:
        """Quick health check Groq API accessibility."""
        try:
            resp = await self.client.get("/models")
            return resp.status_code == 200
        except Exception:
            return False


# Singleton instance - will be initialized in main app
groq_fallback: Optional[GroqFallback] = None


def init_groq_fallback(groq_api_key: str):
    """Initialize the global Groq fallback instance."""
    global groq_fallback
    groq_fallback = GroqFallback(groq_api_key)


async def groq_chat(
    messages: List[Dict[str, Any]],
    model: str = "mixtral-8x7b-32768",
    **kwargs,
) -> Dict[str, Any]:
    """Convenience function for Groq chat completions with fallback."""
    if groq_fallback is None:
        raise HTTPException(status_code=503, detail="Groq fallback not initialized")
    return await groq_fallback.chat_completions(messages, model, **kwargs)


async def groq_get_models() -> List[str]:
    """Convenience function to get available Groq models."""
    if groq_fallback is None:
        raise HTTPException(status_code=503, detail="Groq fallback not initialized")
    return await groq_fallback.get_available_models()


async def groq_health() -> bool:
    """Convenience function for Groq health check."""
    if groq_fallback is None:
        raise HTTPException(status_code=503, detail="Groq fallback not initialized")
    return await groq_fallback.health_check()