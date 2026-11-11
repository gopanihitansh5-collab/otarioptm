"""Durable, cross-instance budget ledger backed by Upstash Redis (REST).

Why this exists: on serverless hosting, each function instance has its own
memory, so the in-process BudgetManager reservation map is per-instance.
Two concurrent instances can each pass a local affordability check and
jointly overspend the project cap, and a redeploy resets all local
accounting to zero. This module moves the reserve/settle accounting into
a single shared store so the cap check is atomic across every instance.

Atomicity model:

* EVERY state transition is ONE Lua script evaluated by Redis. Redis runs
  each script atomically, so the affordability check and the reservation
  write can never interleave with another instance's script. There is no
  reserve-then-check or check-then-refund sequence anywhere.
* Settlement is idempotent: a settled marker key remembers the charged
  amount, so a retried settle/release of the same reservation can never
  double-charge.

Crash and uncertainty posture (conservative - never under-counts):

* Reservations NEVER expire and are never freed by age. A reservation
  whose holder crashed stays counted, so abandoned reservations
  over-count (block spend early), never under-count.
* When a reservation is older than STALE_AGE_SECONDS (long past any
  plausible provider call), every script's built-in reaper converts it to
  SPEND AT ITS FULL RESERVED AMOUNT and tracks it under `assumed`. The
  ledger assumes the provider executed and billed the estimate. This is
  the conservative direction: uncertain execution costs money in the
  ledger, it does not free money.
* A settle arriving after its reservation was stale-converted charges
  only max(0, actual - assumed_amount): real provider-reported spend
  refines the assumption, it never double-charges and never refunds.
* A release after stale-conversion is a no-op: by then it is impossible
  to prove the provider was never called, so the assumed spend stands.
* Reconciliation against provider truth: `assumedSpend` is surfaced in
  every snapshot so an operator can compare with the provider's own
  dashboard and correct the base via `reset_spend` if needed.

Failure posture (fail closed):

* If the store is unreachable at reserve time, reserve raises
  LedgerUnavailable and the caller blocks the step BEFORE any provider
  call - never a silent per-instance fallback.
* If the store fails at settle time, BudgetManager retries with backoff
  and queues the settlement for retry on subsequent operations; the
  store-side reservation is NOT freed, and if the process dies first the
  stale reaper converts it to spend at the full estimate. No spend is
  ever lost; the worst case is over-counting at the padded estimate.

Configuration: KV_REST_API_URL / KV_REST_API_TOKEN (the names Vercel's
Upstash integration injects), with UPSTASH_REDIS_REST_URL /
UPSTASH_REDIS_REST_TOKEN accepted as alternates. Both must be present or
the ledger is not configured and BudgetManager stays in per-instance
mode (which snapshot() labels honestly).
"""

import os
import time
import uuid
from typing import Any, Dict, Optional, Tuple

import httpx

KEY_PREFIX = "otarioptm"
# Far beyond any plausible provider call duration (gateway timeouts are
# seconds). Younger reservations are never touched by the reaper.
STALE_AGE_SECONDS = 1800
SETTLED_TTL_SECONDS = 30 * 86400  # idempotency + stale-marker retention
REQUEST_TIMEOUT_SECONDS = 5.0

# Reservation hash values are "amount|unix_ts". The reaper (first step of
# EVERY script) converts fields older than stale_age to spend at the full
# reserved amount, counts them under `assumed`, and leaves a stale marker
# so a late settle charges only the excess over the assumption.
_REAP = """
local now = tonumber(ARGV[6])
local stale_age = tonumber(ARGV[7])
local fields = redis.call('HKEYS', KEYS[2])
local reserved = 0.0
for _, f in ipairs(fields) do
  local v = redis.call('HGET', KEYS[2], f)
  local bar = string.find(v, '|')
  local amt = tonumber(string.sub(v, 1, bar - 1))
  local ts = tonumber(string.sub(v, bar + 1))
  if now - ts > stale_age then
    redis.call('HDEL', KEYS[2], f)
    redis.call('INCRBYFLOAT', KEYS[1], amt)
    redis.call('INCRBYFLOAT', KEYS[3], amt)
    redis.call('INCR', KEYS[4])
    redis.call('SET', ARGV[5] .. ':stale:' .. f, tostring(amt), 'EX', tonumber(ARGV[8]))
  else
    reserved = reserved + amt
  end
end
"""

# Atomic check + reserve. KEYS: 1=spent 2=res 3=assumed 4=assumed_count
# ARGV: 1=rid 2=amount 3=cap 4=(unused) 5=prefix 6=now 7=stale_age 8=marker_ttl
# Returns [1, committed_after] on success, [0, committed] when over budget.
# (Numbers are returned as STRINGS: Redis truncates Lua number replies to
# integers on the wire, so floats must cross as strings.)
_RESERVE_LUA = _REAP + """
local spent = tonumber(redis.call('GET', KEYS[1]) or '0')
local amount = tonumber(ARGV[2])
local cap = tonumber(ARGV[3])
if spent + reserved + amount > cap then
  return {0, tostring(spent + reserved)}
end
redis.call('HSET', KEYS[2], ARGV[1], ARGV[2] .. '|' .. ARGV[6])
return {1, tostring(spent + reserved + amount)}
"""

# Atomic settle, idempotent. Three cases:
#   settled marker  -> replay, return the original charge (no double charge)
#   stale marker    -> reservation was assumed at full estimate; charge only
#                      the excess of actual over the assumption
#   otherwise       -> charge actual, clamped to remaining cap headroom
# KEYS: 1=spent 2=res 3=assumed 4=assumed_count 5=overage 6=overcount
# ARGV: 1=rid 2=actual 3=cap 4=(unused) 5=prefix 6=now 7=stale_age 8=marker_ttl
# Returns [1, total_charged_for_rid, over_budget] or [2, charge, 0] on replay.
_SETTLE_LUA = _REAP + """
local marker = ARGV[5] .. ':settled:' .. ARGV[1]
local prev = redis.call('GET', marker)
if prev then
  return {2, prev, 0}
end
redis.call('HDEL', KEYS[2], ARGV[1])
local stale = redis.call('GET', ARGV[5] .. ':stale:' .. ARGV[1])
local spent = tonumber(redis.call('GET', KEYS[1]) or '0')
local cap = tonumber(ARGV[3])
local actual = tonumber(ARGV[2])
local due = actual
if stale then
  due = math.max(0.0, actual - tonumber(stale))
end
local charged = math.min(due, math.max(0.0, cap - spent))
local over = 0
if charged < due then
  over = 1
  redis.call('INCRBYFLOAT', KEYS[5], due - charged)
  redis.call('INCR', KEYS[6])
end
redis.call('INCRBYFLOAT', KEYS[1], charged)
local total = charged + (stale and tonumber(stale) or 0.0)
redis.call('SET', marker, tostring(total), 'EX', tonumber(ARGV[8]))
return {1, tostring(total), over}
"""

# Atomic release: frees only a LIVE reservation. After stale conversion a
# release is a no-op - non-execution can no longer be proven, so the
# assumed spend stands.
# KEYS: 1=spent 2=res 3=assumed 4=assumed_count
_RELEASE_LUA = _REAP + """
local marker = ARGV[5] .. ':settled:' .. ARGV[1]
if redis.call('EXISTS', marker) == 1 then
  return {2, 0}
end
if redis.call('EXISTS', ARGV[5] .. ':stale:' .. ARGV[1]) == 1 then
  return {3, 0}
end
redis.call('HDEL', KEYS[2], ARGV[1])
redis.call('SET', marker, '0', 'EX', tonumber(ARGV[8]))
return {1, 0}
"""

# Snapshot after reaping: {spent, reserved, assumed, assumed_count, overage, overcount, open}.
_SNAPSHOT_LUA = _REAP + """
local spent = tonumber(redis.call('GET', KEYS[1]) or '0')
local assumed = tonumber(redis.call('GET', KEYS[3]) or '0')
local assumed_count = tonumber(redis.call('GET', KEYS[4]) or '0')
local overage = tonumber(redis.call('GET', KEYS[5]) or '0')
local overcount = tonumber(redis.call('GET', KEYS[6]) or '0')
local open = 0
for _, f in ipairs(redis.call('HKEYS', KEYS[2])) do
  open = open + 1
end
return {tostring(spent), tostring(reserved), tostring(assumed), tostring(assumed_count), tostring(overage), tostring(overcount), open}
"""


class LedgerUnavailable(Exception):
    """The shared store could not be reached. Callers must fail closed."""


class UpstashLedger:
    """Shared budget ledger over the Upstash Redis REST API."""

    def __init__(self, url: str, token: str, prefix: str = KEY_PREFIX,
                 stale_age: float = STALE_AGE_SECONDS):
        self._url = url.rstrip("/")
        self._token = token
        self._prefix = prefix
        self._stale_age = stale_age
        self.last_error: Optional[str] = None

    @classmethod
    def from_env(cls) -> Optional["UpstashLedger"]:
        """Build from env vars, or None when no shared store is configured."""
        url = os.environ.get("KV_REST_API_URL") or os.environ.get("UPSTASH_REDIS_REST_URL")
        token = os.environ.get("KV_REST_API_TOKEN") or os.environ.get("UPSTASH_REDIS_REST_TOKEN")
        if not url or not token:
            return None
        return cls(url, token)

    @property
    def backend(self) -> str:
        return "upstash-redis"

    def _k(self, name: str) -> str:
        return f"{self._prefix}:{name}"

    def _args(self, rid: str = "-", amount: float = 0.0, cap: float = 0.0) -> list:
        return [rid, f"{amount:.6f}", f"{cap:.6f}", 0, self._prefix,
                f"{time.time():.3f}", self._stale_age, SETTLED_TTL_SECONDS]

    async def _eval(self, script: str, keys: list, args: list) -> Any:
        cmd = ["EVAL", script, len(keys), *keys, *[str(a) for a in args]]
        try:
            async with httpx.AsyncClient(timeout=REQUEST_TIMEOUT_SECONDS) as client:
                resp = await client.post(
                    self._url,
                    headers={"Authorization": f"Bearer {self._token}"},
                    json=cmd,
                )
        except (httpx.HTTPError, OSError) as exc:
            self.last_error = f"ledger request failed: {type(exc).__name__}: {exc}"
            raise LedgerUnavailable(self.last_error) from exc
        if resp.status_code != 200:
            self.last_error = f"ledger HTTP {resp.status_code}"
            raise LedgerUnavailable(self.last_error)
        try:
            body = resp.json()
        except ValueError as exc:
            self.last_error = "ledger returned non-JSON"
            raise LedgerUnavailable(self.last_error) from exc
        if isinstance(body, dict) and body.get("error"):
            self.last_error = f"ledger error: {body['error']}"
            raise LedgerUnavailable(self.last_error)
        self.last_error = None
        return body.get("result") if isinstance(body, dict) else None

    async def reserve(self, amount: float, cap: float) -> Tuple[bool, Optional[str]]:
        """Atomically check affordability and reserve `amount` under `cap`.

        Returns (ok, reservation_id). Raises LedgerUnavailable when the
        store cannot confirm the reservation; callers must treat that as
        blocked (fail closed), never as approved.
        """
        rid = f"sh-{uuid.uuid4().hex[:20]}"
        result = await self._eval(
            _RESERVE_LUA,
            keys=[self._k("spent"), self._k("res"), self._k("assumed"), self._k("assumed_count")],
            args=self._args(rid, amount, cap),
        )
        ok = bool(result and int(result[0]) == 1)
        return ok, (rid if ok else None)

    async def settle(self, reservation_id: str, actual_cost: float, cap: float) -> Tuple[float, bool]:
        """Charge a reservation exactly once, clamped to the cap.

        Returns (total_charged_for_rid, over_budget). Replays return the
        original charge; after a stale conversion only the excess over the
        assumption is charged.
        """
        result = await self._eval(
            _SETTLE_LUA,
            keys=[self._k("spent"), self._k("res"), self._k("assumed"),
                  self._k("assumed_count"), self._k("overage"), self._k("overcount")],
            args=self._args(reservation_id, actual_cost, cap),
        )
        if not result:
            raise LedgerUnavailable("ledger settle returned no result")
        return float(result[1]), bool(int(result[2]) == 1)

    async def release(self, reservation_id: str) -> None:
        """Free a LIVE reservation (provably no provider call). No-op after
        settlement or stale conversion."""
        await self._eval(
            _RELEASE_LUA,
            keys=[self._k("spent"), self._k("res"), self._k("assumed"), self._k("assumed_count")],
            args=self._args(reservation_id),
        )

    async def snapshot(self, cap: float) -> Dict[str, Any]:
        """Committed spend state (reaping stale reservations on the way)."""
        result = await self._eval(
            _SNAPSHOT_LUA,
            keys=[self._k("spent"), self._k("res"), self._k("assumed"),
                  self._k("assumed_count"), self._k("overage"), self._k("overcount")],
            args=self._args(),
        )
        spent, reserved, assumed, assumed_count = [float(v) for v in result[:4]]
        overage, overcount = float(result[4]), int(float(result[5]))
        open_count = int(float(result[6]))
        committed = spent + reserved
        return {
            "cap": cap,
            "spent": round(spent, 6),
            "reserved": round(reserved, 6),
            "committed": round(committed, 6),
            "remaining": round(max(0.0, cap - committed), 6),
            "assumedSpend": round(assumed, 6),
            "assumedCount": int(assumed_count),
            "overage": round(overage, 6),
            "overageCount": int(overcount),
            "openReservations": open_count,
            "ledger": self.backend,
            "lastError": self.last_error,
        }
