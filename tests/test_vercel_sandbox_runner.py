"""Vercel Sandbox runner: bounds enforced, fail-closed everywhere.

The vercel SDK is faked in sys.modules; no sandbox is ever created here.
"""

import asyncio
import subprocess
import sys
import types

from src.gateway import vercel_sandbox_runner as vsr


class FakeCompletedProcess:
    def __init__(self, returncode=0, stdout="", stderr=""):
        self.returncode = returncode
        self.stdout = stdout
        self.stderr = stderr


class FakeBox:
    created_with = None
    run_with = None

    def __init__(self, kwargs):
        FakeBox.created_with = kwargs
        self.stopped = False

    async def __aenter__(self):
        return self

    async def __aexit__(self, *exc):
        self.stopped = True
        return False

    async def run_command(self, command, args, **kwargs):
        FakeBox.run_with = {"command": command, "args": args, **kwargs}
        return FakeCompletedProcess(stdout="hello")


class FakeNetworkPolicy:
    @staticmethod
    def deny_all():
        return {"mode": "deny-all"}

    @staticmethod
    def allow_all():
        return {"mode": "allow-all"}


class FakeSandboxResources:
    def __init__(self, vcpus, memory):
        self.vcpus = vcpus
        self.memory = memory


def _install_fake_vercel(monkeypatch, create_effect=None):
    sandbox_mod = types.ModuleType("vercel.sandbox")
    sandbox_mod.NetworkPolicy = FakeNetworkPolicy
    sandbox_mod.SandboxResources = FakeSandboxResources

    def create_sandbox(**kwargs):
        if create_effect is not None:
            raise create_effect
        return FakeBox(kwargs)

    sandbox_mod.create_sandbox = create_sandbox

    vercel_mod = types.ModuleType("vercel")
    vercel_mod.sandbox = sandbox_mod
    monkeypatch.setitem(sys.modules, "vercel", vercel_mod)
    monkeypatch.setitem(sys.modules, "vercel.sandbox", sandbox_mod)


def test_success_maps_output(monkeypatch):
    asyncio.run(_test_success_maps_output(monkeypatch))


async def _test_success_maps_output(monkeypatch):
    _install_fake_vercel(monkeypatch)
    result = await vsr.run_in_vercel_sandbox("print('x')")
    assert result["ok"] is True
    assert result["output"] == "hello"
    assert result["error"] is None


def test_isolation_bounds_passed_to_creation(monkeypatch):
    asyncio.run(_test_isolation_bounds_passed_to_creation(monkeypatch))


async def _test_isolation_bounds_passed_to_creation(monkeypatch):
    _install_fake_vercel(monkeypatch)
    await vsr.run_in_vercel_sandbox("print('x')")
    kw = FakeBox.created_with
    assert kw["network_policy"] == {"mode": "deny-all"}  # no egress at all
    assert kw["env"] == {}  # no host env vars in the VM
    assert kw["persistent"] is False  # destroyed after the run
    assert kw["execution_time_limit"] <= 30
    assert kw["resources"].vcpus == 1
    assert kw["resources"].memory == 2048 * kw["resources"].vcpus  # API requires 2048 MB per vCPU
    run = FakeBox.run_with
    assert run["command"] == "python"
    assert run["args"][0] == "-c"
    assert run["env"] == {}  # empty process env too
    assert run["kill_after"] <= 30
    assert run["capture_output"] is True
    assert run["check"] is False  # nonzero exit reported, not raised


def test_nonzero_exit_reported_in_band(monkeypatch):
    asyncio.run(_test_nonzero_exit_reported_in_band(monkeypatch))


async def _test_nonzero_exit_reported_in_band(monkeypatch):
    _install_fake_vercel(monkeypatch)

    async def boom(self, command, args, **kwargs):
        return FakeCompletedProcess(returncode=1, stdout="partial", stderr="boom")

    _install_fake_vercel(monkeypatch)
    FakeBox.run_command = boom
    result = await vsr.run_in_vercel_sandbox("import sys; sys.exit(1)")
    assert result["ok"] is False
    assert "exited with code 1" in result["error"]
    assert "boom" in result["output"]


def test_creation_failure_fails_closed(monkeypatch):
    asyncio.run(_test_creation_failure_fails_closed(monkeypatch))


async def _test_creation_failure_fails_closed(monkeypatch):
    _install_fake_vercel(monkeypatch, create_effect=RuntimeError("quota paused"))
    result = await vsr.run_in_vercel_sandbox("print('x')")
    assert result["ok"] is False
    assert "unavailable" in result["error"]
    assert "RuntimeError" in result["error"]


def test_missing_sdk_fails_closed(monkeypatch):
    asyncio.run(_test_missing_sdk_fails_closed(monkeypatch))


async def _test_missing_sdk_fails_closed(monkeypatch):
    monkeypatch.delitem(sys.modules, "vercel", raising=False)
    monkeypatch.delitem(sys.modules, "vercel.sandbox", raising=False)
    import builtins
    real_import = builtins.__import__

    def no_vercel(name, *a, **k):
        if name == "vercel" or name.startswith("vercel."):
            raise ImportError("No module named 'vercel'")
        return real_import(name, *a, **k)

    monkeypatch.setattr(builtins, "__import__", no_vercel)
    result = await vsr.run_in_vercel_sandbox("print('x')")
    assert result["ok"] is False
    assert "not installed" in result["error"]


def test_oversize_program_rejected_without_sandbox(monkeypatch):
    asyncio.run(_test_oversize_program_rejected_without_sandbox(monkeypatch))


async def _test_oversize_program_rejected_without_sandbox(monkeypatch):
    _install_fake_vercel(monkeypatch)
    FakeBox.created_with = None
    result = await vsr.run_in_vercel_sandbox("x" * (vsr.MAX_CODE_CHARS + 1))
    assert result["ok"] is False
    assert "exceeds" in result["error"]
    assert FakeBox.created_with is None  # never reached creation


def test_empty_program_rejected(monkeypatch):
    asyncio.run(_test_empty_program_rejected(monkeypatch))


async def _test_empty_program_rejected(monkeypatch):
    _install_fake_vercel(monkeypatch)
    result = await vsr.run_in_vercel_sandbox("   ")
    assert result["ok"] is False
    assert "empty" in result["error"]


def test_output_truncated(monkeypatch):
    asyncio.run(_test_output_truncated(monkeypatch))


async def _test_output_truncated(monkeypatch):
    _install_fake_vercel(monkeypatch)

    async def loud(self, command, args, **kwargs):
        return FakeCompletedProcess(stdout="y" * (vsr.MAX_OUTPUT_CHARS * 2))

    FakeBox.run_command = loud
    result = await vsr.run_in_vercel_sandbox("print('y'*999999)")
    assert result["ok"] is True
    assert len(result["output"]) <= vsr.MAX_OUTPUT_CHARS + 32
    assert "truncated" in result["output"]


def test_wall_timeout_fails_closed(monkeypatch):
    asyncio.run(_test_wall_timeout_fails_closed(monkeypatch))


async def _test_wall_timeout_fails_closed(monkeypatch):
    _install_fake_vercel(monkeypatch)

    async def hang(self, command, args, **kwargs):
        await asyncio.sleep(10)
        return FakeCompletedProcess()

    FakeBox.run_command = hang
    monkeypatch.setattr(vsr, "WALL_TIMEOUT_SECONDS", 0.05)
    result = await vsr.run_in_vercel_sandbox("while True: pass")
    assert result["ok"] is False
    assert result["error"] == "timeout"


def test_concurrency_bounded(monkeypatch):
    asyncio.run(_test_concurrency_bounded(monkeypatch))


async def _test_concurrency_bounded(monkeypatch):
    _install_fake_vercel(monkeypatch)
    peak = {"now": 0, "max": 0}

    async def slow(self, command, args, **kwargs):
        peak["now"] += 1
        peak["max"] = max(peak["max"], peak["now"])
        await asyncio.sleep(0.05)
        peak["now"] -= 1
        return FakeCompletedProcess(stdout="ok")

    FakeBox.run_command = slow
    results = await asyncio.gather(
        *[vsr.run_in_vercel_sandbox("pass") for _ in range(12)]
    )
    assert all(r["ok"] for r in results)
    assert peak["max"] <= vsr.MAX_CONCURRENT_SANDBOXES


def test_runner_never_raises(monkeypatch):
    asyncio.run(_test_runner_never_raises(monkeypatch))


async def _test_runner_never_raises(monkeypatch):
    _install_fake_vercel(monkeypatch, create_effect=subprocess.CalledProcessError(1, "x"))
    result = await vsr.run_in_vercel_sandbox("print('x')")
    assert result["ok"] is False


def test_gateway_routes_to_vercel_backend(monkeypatch):
    from src.gateway import main as gateway_main

    _install_fake_vercel(monkeypatch)
    monkeypatch.setattr(gateway_main, "CODE_EXEC_DISABLED", False)
    monkeypatch.setattr(gateway_main, "CODE_EXEC_BACKEND", "vercel-sandbox")
    result = asyncio.run(gateway_main._run_code("print('x')"))
    assert result["ok"] is True
    assert FakeBox.created_with["network_policy"] == {"mode": "deny-all"}


def test_gateway_default_backend_stays_local(monkeypatch):
    from src.gateway import main as gateway_main

    assert gateway_main.CODE_EXEC_BACKEND == "local"  # no env var set in tests
    assert gateway_main.CODE_EXEC_DISABLED is True  # kill switch still on
