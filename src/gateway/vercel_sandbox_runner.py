"""Vercel Sandbox runner: untrusted code in a fresh, deny-all microVM.

Each code-exec request gets a brand new Vercel Sandbox microVM created via
the ``vercel`` Python SDK. Unlike the local fresh-interpreter fallback
(``sandbox_runner.py``), this is a genuine isolation boundary:

  * the code runs inside a Firecracker-style microVM, not in a process
    sharing the gateway's filesystem, user, or network namespace;
  * the VM is created with ``NetworkPolicy.deny_all()``: no outbound
    network at all, so secrets and data cannot be exfiltrated even if the
    code is hostile;
  * the VM is created with an EMPTY environment (``env={}``) and no
    mounts: no gateway env vars, API keys, or filesystem reach it. Host
    auth (Vercel OIDC) is used only by the host-side SDK client and never
    enters the VM;
  * the VM is destroyed when the request finishes (``persistent=False``).

Fail closed everywhere: if the SDK is missing, the VM cannot be created
(including when the Hobby free quota pauses creation), the command cannot
start, or the whole operation exceeds the wall timeout, the step fails
with an honest error. Untrusted code never falls back to in-process
execution.

Free-quota context (Hobby, verified against the account 2026-11-11):
5h Active CPU/month and 5,000 creations/month; at the limit Vercel PAUSES
creation rather than billing ("You will not be charged"), and the account
has no payment method, so an overage cannot bill. The concurrency bound
below (4, of the 10 Hobby allows) and 30s execution cap keep usage far
under the free quotas for interactive traffic.
"""

import asyncio
from typing import Any, Dict

MAX_OUTPUT_CHARS = 64 * 1024
MAX_CODE_CHARS = 32 * 1024
EXECUTION_TIME_LIMIT_SECONDS = 30  # Vercel-side hard session cap
RUN_KILL_AFTER_SECONDS = 30  # SIGKILL inside the VM after this
WALL_TIMEOUT_SECONDS = 45.0  # create + run + teardown slack
MAX_CONCURRENT_SANDBOXES = 4  # per gateway instance; see honesty note below

# HONESTY NOTE: this semaphore bounds concurrent sandboxes per gateway
# INSTANCE only. On Vercel serverless, N warm instances allow up to
# 4 x N concurrent sandboxes; there is no global in-code bound. The real
# global bounds are Vercel's Hobby quotas (10 concurrent, 5h Active CPU,
# 5000 creations/month): exhaustion pauses creation and this runner then
# fails closed with an honest "sandbox unavailable" error. Do not describe
# the concurrency as "capped at 4" globally.
SANDBOX_REGION = "iad1"  # same region as the functions

_sem = asyncio.Semaphore(MAX_CONCURRENT_SANDBOXES)


def _fail(detail: str, error: str = None) -> Dict[str, Any]:
    return {"output": detail, "ok": False, "error": error if error is not None else detail}


async def run_in_vercel_sandbox(code: str) -> Dict[str, Any]:
    """Run untrusted code in a fresh Vercel Sandbox microVM; fail closed.

    Returns ``{"output", "ok", "error"}``. Failures of the untrusted
    program itself (nonzero exit, stderr) are reported in-band; failures
    of the sandbox machinery (creation, quota pause, timeout) fail the
    step with an explanatory error. Never raises for untrusted input.
    """
    if not code or not code.strip():
        return _fail("sandbox rejected: empty program")
    if len(code) > MAX_CODE_CHARS:
        return _fail(f"sandbox rejected: program exceeds {MAX_CODE_CHARS} characters")

    try:
        from vercel import sandbox as _sandbox
        from vercel.sandbox import NetworkPolicy, SandboxResources
    except ImportError:
        return _fail("code-exec backend unavailable: vercel sandbox SDK not installed")

    async def _run() -> Dict[str, Any]:
        async with _sem:
            async with _sandbox.create_sandbox(
                execution_time_limit=EXECUTION_TIME_LIMIT_SECONDS,
                network_policy=NetworkPolicy.deny_all(),
                env={},  # no env vars in the VM: nothing to leak
                persistent=False,  # destroy on exit; no snapshot storage
                region=SANDBOX_REGION,
                resources=SandboxResources(vcpus=1, memory=2048),  # memory is MB, 2048/vCPU required
            ) as box:
                result = await box.run_command(
                    "python",
                    ["-c", code],  # argv, not a shell: no quoting/escape surface
                    env={},  # empty process env as well
                    kill_after=RUN_KILL_AFTER_SECONDS,
                    capture_output=True,
                    check=False,  # nonzero exit is a reported result, not an exception
                )
        out = result.stdout or ""
        err = result.stderr or ""
        text = out + ("\n--- stderr ---\n" + err if err else "")
        if len(text) > MAX_OUTPUT_CHARS:
            text = text[:MAX_OUTPUT_CHARS] + "\n... [output truncated]"
        if result.returncode == 0:
            return {"output": text, "ok": True, "error": None}
        return {
            "output": text,
            "ok": False,
            "error": f"program exited with code {result.returncode}",
        }

    try:
        return await asyncio.wait_for(_run(), timeout=WALL_TIMEOUT_SECONDS)
    except asyncio.TimeoutError:
        # The VM still self-terminates at EXECUTION_TIME_LIMIT_SECONDS and
        # the context manager destroys it on cancellation where possible.
        return _fail("code-exec sandbox timed out", error="timeout")
    except Exception as exc:  # noqa: BLE001 - quota pause, auth, API errors
        # Structured detail only (exception class, HTTP status, API error
        # code): enough to diagnose quota/auth/parameter failures honestly,
        # never the response body (which can echo request data).
        detail = f"code-exec sandbox unavailable ({exc.__class__.__name__}"
        status = getattr(exc, "status_code", None)
        code = getattr(exc, "code", None)
        if status is not None:
            detail += f", status {status}"
        if code:
            detail += f", code {code}"
        return _fail(detail + ")")
