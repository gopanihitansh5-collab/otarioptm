"""Exa-powered web search for OtariOptm workflow nodes.

Follows the Exa agent-skills guidance: a search step inside a larger task sends
query + objective only, with `type: auto` and `contents: {highlights: true}`.
No category / numResults / domain filters are decorated on unless a task
explicitly requires them.
"""

import os
from typing import Any, Dict, Optional

import httpx

EXA_BASE_URL = "https://api.exa.ai"

DEFAULT_OBJECTIVE = (
    "Fetch current web context that a downstream LLM step will use to answer "
    "the user's workflow prompt: rank primary sources, documentation and "
    "recent articles first; pull key facts, figures and quotes from them."
)


def _truncate(text: str, limit: int) -> str:
    return text if len(text) <= limit else text[: limit - 1] + "…"


def build_search_payload(query: str, objective: Optional[str] = None) -> Dict[str, Any]:
    """The recommended Exa /search request; nothing decorated."""
    payload: Dict[str, Any] = {
        "query": query,
        "type": "auto",
        "contents": {"highlights": True},
    }
    obj = (objective or DEFAULT_OBJECTIVE).strip()
    if obj:
        payload["objective"] = _truncate(obj, 4096)
    return payload


async def exa_search(query: str, objective: Optional[str] = None) -> Dict[str, Any]:
    """Run an Exa search; returns normalized page context, provider cost, count."""
    api_key = os.environ.get("EXA_API_KEY")
    if not api_key:
        raise RuntimeError("EXA_API_KEY not set")

    payload = build_search_payload(query, objective)
    async with httpx.AsyncClient(timeout=30.0, headers={"x-api-key": api_key}) as client:
        resp = await client.post(f"{EXA_BASE_URL}/search", json=payload)

    if resp.status_code != 200:
        raise RuntimeError(f"Exa error {resp.status_code}: {resp.text[:200]}")

    data = resp.json()
    results = data.get("results") or []
    lines = []
    for i, r in enumerate(results[:5]):
        title = _truncate(str(r.get("title") or "untitled"), 120)
        url = str(r.get("url") or "")
        highlights = r.get("highlights") or []
        snippet = _truncate(str(highlights[0]).replace("\n", " "), 220) if highlights else ""
        lines.append(f"{i + 1}. {title} — {snippet} ({url})")

    cost = float(((data.get("costDollars") or {}).get("total") or 0.0))
    return {
        "results_text": "\n".join(lines) or f"No results for '{query}'",
        "cost": cost,
        "provider": "exa",
        "count": len(results),
    }
