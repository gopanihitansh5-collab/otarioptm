"""Budget accounting for OtariOptm.

`BudgetManager` owns every dollar the gateway can spend: reservations are
taken BEFORE a provider call and settled exactly once afterwards.

Accounting rules enforced here:

* `reserve` performs the affordability check AND the mutation under one
  lock, so concurrent steps can never jointly oversubscribe the cap.
* A reservation has exactly ONE terminal action:
  - `record` / `settle` charge the reservation and close it,
  - `release` closes it without charging.
  Both are safe no-ops on an unknown or already-closed id, so a double
  release never corrupts the accounting and a leaked reservation never
  silently inflates `spent`.
* `record` clamps the charge to the project cap: `spent` can never exceed
  `cap`. Anything that did not fit is reported through `overage`.
"""

import asyncio
import os
from contextlib import asynccontextmanager
from typing import Any, AsyncIterator, Dict, Optional, Set, Tuple

import yaml

from .ledger import LedgerUnavailable, UpstashLedger

DEFAULT_CONFIG = {
    "otari": {
        "base_url": "https://eu.api.otari.ai/api/v1",
        "auth_token": "${OTARI_API_KEY}",
    },
    "models": {
        "default": "alibaba/qwen-3.5-35b-a3b",
        "fallback": "openai:gpt-4o-mini",
    },
    "budget": {
        "project_cap": 5.00,
        "per_user": 2.00,
    },
    "workflows": {
        "max_steps": 10,
        "max_tokens": 4000,
    },
    "profiles": {
        "code-exec": True,
        "web-search": True,
        "guardrails": True,
    },
    "gateway": {
        "rate_limit": {
            "enabled": True,
            "capacity": 30,        # burst size per IP on mutating endpoints
            "refill_per_sec": 1.0,  # tokens restored per second per IP
            "global_capacity": 120,        # burst size across ALL IPs per instance
            "global_refill_per_sec": 5.0,  # tokens restored per second (global)
        },
    },
}

# How many closed reservations are remembered (for exactly-once accounting).
MAX_TRACKED_SETTLEMENTS = 512


class BudgetManager:
    """Async-safe budget tracking with reservations and spend recording.

    Two modes:

    * Shared mode (a store is configured via KV_REST_API_URL +
      KV_REST_API_TOKEN, or the UPSTASH_REDIS_REST_* pair): every
      check-and-reserve and every settlement is one atomic Lua script in
      the shared store, so the cap holds across ALL serverless instances.
      Store failure at reserve time FAILS CLOSED (the step is blocked
      before any provider call); it never silently degrades to
      per-instance accounting. Settlements are idempotent in the store.
    * Per-instance mode (no store configured): the original in-process
      accounting. It is an abuse brake only - honest labeling in
      `snapshot()["ledger"]` says which mode is active.
    """

    def __init__(self, config_path: str | None = None):
        cfg_path = config_path or os.environ.get("OTARIOPTM_CONFIG", "config/config.yml")
        self.config = self._load_config(cfg_path)
        self.spend: float = 0.0
        self.reservations: Dict[str, float] = {}
        self.history: list[Dict[str, Any]] = []
        # Amount that could not be charged because the cap was reached.
        self.overage: float = 0.0
        self.overage_count: int = 0
        self._lock = asyncio.Lock()
        self._reservation_counter = 0
        # Closed reservations: id -> amount that was charged. Guarantees that a
        # reservation is settled exactly once (a second record/release is a
        # no-op instead of a double charge).
        self._settled: Dict[str, float] = {}
        # Shared ledger (None => per-instance mode).
        self.ledger: Optional[UpstashLedger] = UpstashLedger.from_env()
        # Reservation ids held in the shared store (vs local zero-cost ones).
        self._shared_rids: Set[str] = set()
        self._ledger_error: Optional[str] = None
        # Settlements that failed on a store outage, retried on every later
        # operation. The store-side reservation is never freed on outage, so
        # even a process death here is backstopped by stale conversion to
        # spend at the full estimate - no spend is ever lost.
        self._pending_settlements: Dict[str, float] = {}

    def _load_config(self, config_path: str) -> Dict[str, Any]:
        merged = dict(DEFAULT_CONFIG)
        for section, values in merged.items():
            if isinstance(values, dict):
                merged[section] = dict(values)
        if os.path.exists(config_path):
            with open(config_path, "r", encoding="utf-8") as f:
                user_config = yaml.safe_load(f) or {}
                for section, values in user_config.items():
                    if isinstance(values, dict) and isinstance(merged.get(section), dict):
                        merged[section].update(values)
                    else:
                        merged[section] = values
        return merged

    @property
    def project_cap(self) -> float:
        return float(self.config["budget"]["project_cap"])

    @property
    def committed(self) -> float:
        """Spend + open reservations, the amount that must not be exceeded."""
        return self.spend + sum(self.reservations.values())

    @property
    def remaining(self) -> float:
        return max(0.0, self.project_cap - self.committed)

    @staticmethod
    def _as_float(value: Any) -> float:
        try:
            if value is None:
                return 0.0
            return float(value)
        except (TypeError, ValueError):
            return 0.0

    def _remember_settled(self, reservation_id: str, charged: float) -> None:
        self._settled[reservation_id] = charged
        if len(self._settled) > MAX_TRACKED_SETTLEMENTS:
            for old in list(self._settled)[: len(self._settled) - MAX_TRACKED_SETTLEMENTS]:
                self._settled.pop(old, None)

    async def reserve(self, estimated_cost: float) -> Tuple[bool, Optional[str]]:
        """Atomically reserve budget for a projected cost.

        Returns (ok, reservation_id). Never claims more than is left, so
        concurrent steps cannot jointly overspend the cap. In shared mode
        the check and the mutation are one atomic Lua script in the store;
        a store outage FAILS CLOSED ((False, None) + `_ledger_error` set)
        rather than falling back to per-instance accounting.
        """
        est = self._as_float(estimated_cost)
        if self.ledger is not None:
            await self._flush_pending_settlements()
        if self.ledger is not None and est > 0:
            try:
                ok, rid = await self.ledger.reserve(est, self.project_cap)
            except LedgerUnavailable as exc:
                self._ledger_error = str(exc)
                self.history.append({"reservation_id": None, "requested": round(est, 6),
                                     "charged": 0.0, "over_budget": False,
                                     "ledger_error": str(exc)})
                return False, None
            if ok and rid:
                self._shared_rids.add(rid)
                self._ledger_error = None
            return ok, rid
        async with self._lock:
            self._reservation_counter += 1
            rid = f"res-{self._reservation_counter}"
            if est <= 0:
                self.reservations[rid] = 0.0
                return True, rid
            available = self.project_cap - (self.spend + sum(self.reservations.values()))
            if est > available:
                return False, None
            self.reservations[rid] = est
            return True, rid

    async def release(self, reservation_id: Optional[str]) -> None:
        """Release a reservation without charging it (step skipped/failed).

        Releasing an unknown or already-released id is a safe no-op, so the
        reservation can never be released twice and never raises.
        """
        if not reservation_id:
            return
        if reservation_id in self._shared_rids or reservation_id in self._pending_settlements:
            if self.ledger is not None:
                try:
                    await self.ledger.release(reservation_id)
                    self._shared_rids.discard(reservation_id)
                    self._pending_settlements.pop(reservation_id, None)
                    return
                except LedgerUnavailable as exc:
                    # Safe direction: a failed release leaves the reservation
                    # counted (and stale conversion will assume its full
                    # amount), so it over-counts, never under-charges.
                    self._ledger_error = str(exc)
                    return
            self._shared_rids.discard(reservation_id)
            self._pending_settlements.pop(reservation_id, None)
        async with self._lock:
            if reservation_id in self._settled:
                # Already terminal (recorded): releasing must not undo it.
                return
            self.reservations.pop(reservation_id, None)
            self._remember_settled(reservation_id, 0.0)

    def _record_locked(self, reservation_id: Optional[str], cost: float) -> Tuple[float, bool]:
        """Charge a reservation once. The caller MUST hold the lock.

        Returns (charged, over_budget). The charge is clamped to the project
        cap: `spent` can never exceed `cap`; the clamped-away amount is
        accumulated in `overage`.
        """
        if reservation_id:
            if reservation_id in self._settled:
                # Already terminal: never charge the same reservation twice.
                return self._settled[reservation_id], False
            if reservation_id not in self.reservations:
                # Unknown id: nothing was reserved, so nothing is charged.
                self._remember_settled(reservation_id, 0.0)
                return 0.0, False
            self.reservations.pop(reservation_id, None)

        headroom = max(0.0, self.project_cap - self.spend)
        charged = min(cost, headroom)
        over_budget = charged < cost
        if over_budget:
            self.overage += cost - charged
            self.overage_count += 1
        self.spend += charged
        if reservation_id:
            self._remember_settled(reservation_id, charged)
        self.history.append({
            "reservation_id": reservation_id,
            "requested": round(cost, 6),
            "charged": round(charged, 6),
            "over_budget": over_budget,
        })
        return charged, over_budget

    async def record(self, reservation_id: Optional[str], actual_cost: float) -> float:
        """Convert a reservation into spend at its actual cost, then close it.

        The charge is clamped to the project cap: `spent` can never exceed
        `cap`. The clamped-away amount is accumulated in `overage`.
        Recording an already-settled or unknown id charges nothing.
        """
        cost = max(0.0, self._as_float(actual_cost))
        if reservation_id and reservation_id in self._shared_rids:
            await self.settle(reservation_id, cost)
            return self.spend
        async with self._lock:
            self._record_locked(reservation_id, cost)
            return self.spend

    async def settle(self, reservation_id: Optional[str], actual_cost: float) -> Tuple[float, bool]:
        """Terminal action for a reservation: charge it once, clamped to the cap.

        Returns (charged, over_budget). This is the canonical way to close a
        reservation: it records the spend and closes the reservation in one
        atomic step, so there is never a release-then-record pair and the
        freed amount can not be re-claimed while the actual is recorded.
        Settling the same id twice records the spend only once.
        """
        cost = max(0.0, self._as_float(actual_cost))
        if reservation_id and (reservation_id in self._shared_rids or reservation_id in self._pending_settlements):
            if self.ledger is not None:
                charged, over_budget = await self._settle_shared(reservation_id, cost)
                return charged, over_budget
        async with self._lock:
            return self._record_locked(reservation_id, cost)

    async def _settle_shared(self, reservation_id: str, cost: float) -> Tuple[float, bool]:
        """Settle in the shared store with retry + durable pending queue.

        The store makes settlement idempotent (settled marker), so retries
        can never double-charge. On persistent outage the settlement is
        queued and retried on every later budget operation; the store-side
        reservation stays in place, and the stale reaper converts it to
        spend at the full estimate if the process dies first.
        """
        delays = [0.0, 0.5, 2.0]
        last_exc: Optional[LedgerUnavailable] = None
        for attempt, delay in enumerate(delays):
            if delay:
                await asyncio.sleep(delay)
            try:
                charged, over_budget = await self.ledger.settle(reservation_id, cost, self.project_cap)  # type: ignore[union-attr]
                self._shared_rids.discard(reservation_id)
                self._pending_settlements.pop(reservation_id, None)
                self.spend += charged  # local cache for CSV/export display
                self.overage_count += 1 if over_budget else 0
                self.history.append({"reservation_id": reservation_id,
                                     "requested": round(cost, 6),
                                     "charged": round(charged, 6),
                                     "over_budget": over_budget,
                                     "ledger": "shared",
                                     **({"settled_after_retry": True} if attempt else {})})
                return charged, over_budget
            except LedgerUnavailable as exc:
                last_exc = exc
        # Persistent outage: queue for retry on later operations. Surface
        # loudly; nothing is freed store-side, so this can never under-count.
        self._ledger_error = str(last_exc)
        self._pending_settlements[reservation_id] = cost
        self.history.append({"reservation_id": reservation_id,
                             "requested": round(cost, 6), "charged": 0.0,
                             "over_budget": False, "ledger_error": str(last_exc),
                             "settlement_pending": True})
        return 0.0, False

    async def _flush_pending_settlements(self) -> None:
        """Best-effort retry of outage-queued settlements (idempotent store-side)."""
        if not self._pending_settlements or self.ledger is None:
            return
        for rid, cost in list(self._pending_settlements.items()):
            try:
                charged, over_budget = await self.ledger.settle(rid, cost, self.project_cap)
            except LedgerUnavailable:
                return  # still down; try again on the next operation
            self._shared_rids.discard(rid)
            self._pending_settlements.pop(rid, None)
            self.spend += charged
            self.overage_count += 1 if over_budget else 0
            self.history.append({"reservation_id": rid, "requested": round(cost, 6),
                                 "charged": round(charged, 6), "over_budget": over_budget,
                                 "ledger": "shared", "settled_after_retry": True})

    @asynccontextmanager
    async def hold(self, estimated_cost: float) -> AsyncIterator[Tuple[bool, Optional[str]]]:
        """Reserve budget and guarantee the reservation is settled once.

        Yields (ok, reservation_id). If the body raises, the reservation is
        released in the `finally` block, so a failed execution can never leak
        reserved budget. If the body records the reservation, the release is
        a no-op (the reservation is already closed).
        """
        ok, rid = await self.reserve(estimated_cost)
        try:
            yield ok, rid
        finally:
            if rid:
                await self.release(rid)

    async def get_spent(self) -> float:
        if self.ledger is not None:
            try:
                return float((await self.ledger.snapshot(self.project_cap))["spent"])
            except LedgerUnavailable as exc:
                self._ledger_error = str(exc)
                return self.spend
        async with self._lock:
            return self.spend

    async def get_remaining(self) -> float:
        if self.ledger is not None:
            try:
                return float((await self.ledger.snapshot(self.project_cap))["remaining"])
            except LedgerUnavailable as exc:
                # Fail closed: when the store cannot confirm headroom, act as
                # if none is left so no new spend starts blind.
                self._ledger_error = str(exc)
                return 0.0
        async with self._lock:
            return max(0.0, self.project_cap - (self.spend + sum(self.reservations.values())))

    async def snapshot(self) -> Dict[str, Any]:
        if self.ledger is not None:
            try:
                snap = await self.ledger.snapshot(self.project_cap)
            except LedgerUnavailable as exc:
                self._ledger_error = str(exc)
                return {
                    "cap": self.project_cap,
                    "spent": round(self.spend, 6),
                    "reserved": None,
                    "committed": None,
                    "remaining": 0.0,
                    "overage": round(self.overage, 6),
                    "overageCount": self.overage_count,
                    "ledger": "upstash-redis-unavailable",
                    "lastError": str(exc),
                }
            snap["localZeroCostReservations"] = sum(
                1 for v in self.reservations.values() if v == 0.0
            )
            snap["pendingSettlements"] = len(self._pending_settlements)
            return snap
        async with self._lock:
            committed = self.spend + sum(self.reservations.values())
            return {
                "cap": self.project_cap,
                "spent": round(self.spend, 6),
                "reserved": round(sum(self.reservations.values()), 6),
                "committed": round(committed, 6),
                "remaining": round(max(0.0, self.project_cap - committed), 6),
                "overage": round(self.overage, 6),
                "overageCount": self.overage_count,
                "ledger": "per-instance",
            }
