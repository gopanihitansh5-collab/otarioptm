"""Shared planning context carried across all planning stages.

The task, the catalog, and every earlier stage's validated output stay with
the later stages - this is the "context stays with them" product requirement,
kept as one explicit object instead of hidden globals.
"""

from __future__ import annotations

from dataclasses import dataclass, field
from typing import Any, Dict, List, Optional


@dataclass
class PlanningContext:
    task: str
    catalog_ids: List[str] = field(default_factory=list)
    fast_otari_ids: List[str] = field(default_factory=list)
    plan: Optional[Dict[str, Any]] = None
    assignments: Dict[str, Dict[str, Any]] = field(default_factory=dict)
    enhanced_nodes: List[str] = field(default_factory=list)
    warnings: List[str] = field(default_factory=list)
    stages: Dict[str, Dict[str, Any]] = field(default_factory=dict)

    def chat_node_ids(self) -> List[str]:
        if not self.plan:
            return []
        return [
            str(n["id"])
            for n in self.plan["nodes"]
            if n.get("type") == "chat"
        ]

    def record(self, stage: str, result: Dict[str, Any]) -> None:
        """Attach a stage's provider provenance; extra stage detail merges in."""
        entry: Dict[str, Any] = {
            "provider": result.get("provider"),
            "chain": result.get("chain") or [],
            "cost": result.get("cost", 0.0),
            "costSource": result.get("costSource", "free"),
        }
        if result.get("failures"):
            entry["failures"] = result["failures"]
        self.stages[stage] = entry
