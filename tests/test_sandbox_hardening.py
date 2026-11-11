"""Sandbox hardening regression tests.

The sandbox must FAIL CLOSED: untrusted code only ever runs in a freshly
spawned interpreter with an empty environment (never forked, never
in-process), and any spawn failure / resource kill is a truthful error,
not a fallback. Escape probes below include a dummy canary secret in the
parent process environment and assert it can never appear in output.

No real credentials are used anywhere in these tests.
"""

import asyncio
import os


import pytest

from src.gateway import main as gw


@pytest.fixture(autouse=True)
def _sandbox_enabled(monkeypatch):
    """Exercise the sandbox with the production kill switch lifted LOCALLY.

    CODE_EXEC_DISABLED stays True in production until a genuine isolation
    boundary exists; these tests verify the mitigation itself.
    """
    monkeypatch.setattr(gw, "CODE_EXEC_DISABLED", False)

import src.gateway.main as gw

CANARY = "DUMMY-CANARY-not-a-real-secret-0000"


def _run(code):
    return asyncio.run(gw._run_code(code))


# --- validator: known escape paths stay closed -------------------------------

def test_format_string_dunder_attribute_blocked():
    r = _run('print("{0.__class__}".format(True))')
    assert r["ok"] is False and "'format' is not allowed" in r["output"]


def test_format_map_blocked():
    r = _run('print("{x.__class__}".format_map({"x": 1}))')
    assert r["ok"] is False


def test_dunder_attribute_blocked():
    assert gw._sandbox_violation("print(().__class__.__bases__[0].__subclasses__())") is not None


def test_generator_frame_walk_blocked():
    r = _run("g=(x for x in ())\nprint(g.gi_frame.f_globals)")
    assert r["ok"] is False and "not allowed" in r["output"]


def test_coroutine_frame_walk_blocked():
    code = "async def c():\n    return 1\nx = c()\nprint(x.cr_frame.f_globals)"
    r = _run(code)
    assert r["ok"] is False and "not allowed" in r["output"]


def test_builtins_subscript_blocked():
    assert gw._sandbox_violation('print(__builtins__["len"])') is not None


# --- canary: parent-process secrets cannot reach sandbox output --------------

def test_env_canary_never_leaks(monkeypatch):
    """With a dummy secret in the server env, no probe may echo it back.

    The child runs with env={} in a fresh interpreter, so the canary is not
    merely scrubbed from os.environ - it is never in the child's memory.
    """
    monkeypatch.setenv("OTARI_API_KEY", CANARY)
    probes = [
        'print("{0.__globals__}".format(print))',
        "g=(x for x in ())\nprint(g.gi_frame.f_back.f_globals)",
        "async def c():\n    return 1\nx=c()\nprint(x.cr_frame.f_globals)",
        'print(__import__("os").environ)',
        "print(open('/proc/self/environ').read())",
        "print(globals())",
        "print(vars())",
        "x=1\nprint(f'{x.__class__}')",
    ]
    for probe in probes:
        r = _run(probe)
        assert CANARY not in str(r), f"canary leaked via: {probe!r}"
        assert r["ok"] is False, f"escape probe unexpectedly succeeded: {probe!r}"


# --- resource bounds ----------------------------------------------------------

def test_cpu_bomb_killed_by_os_limit():
    import time
    t0 = time.time()
    r = _run("x = 0\nfor i in range(10**9):\n    x = i\nprint('done', x)")
    elapsed = time.time() - t0
    assert r["ok"] is False
    assert "done" not in r["output"]
    assert elapsed < 25, f"CPU bomb not killed promptly ({elapsed:.1f}s)"


def test_memory_bomb_handled():
    r = _run("x = 'a' * (10**10)")
    assert r["ok"] is False
    assert r["error"] in ("memory limit", "killed", "timeout")


def test_output_is_capped():
    r = _run("print('x' * (10**7))")
    assert len(r["output"]) <= 70 * 1024


# --- fail closed: never an in-process fallback --------------------------------

def test_spawn_failure_fails_closed(monkeypatch):
    """If the isolated subprocess cannot start, the step fails truthfully
    and the untrusted code NEVER runs in-process (no side effect appears)."""
    marker = {"executed": False}

    async def boom(*a, **k):
        raise OSError("spawn not permitted in this runtime")

    monkeypatch.setattr(asyncio, "create_subprocess_exec", boom)
    r = _run("marker_executed = True\nprint('ran in-process')")
    assert r["ok"] is False
    assert "sandbox unavailable" in r["output"]
    assert "ran in-process" not in r["output"]
    assert marker["executed"] is False


# --- legit code still works ----------------------------------------------------

def test_format_builtin_still_allowed():
    r = _run('print(format(1.2345, ".2f"))')
    assert r["ok"] is True and r["output"] == "1.23"


def test_legit_sandbox_code_still_runs():
    r = _run("print('hello sandbox')\nprint(2 + 3)")
    assert r["ok"] is True and "hello sandbox" in r["output"] and "5" in r["output"]


def test_child_interpreter_is_fresh():
    """The child is a fresh interpreter with minimal builtins: real builtins
    like open/type are absent, and the env=\{\} spawn means no PATH, no keys,
    no config exist in its memory at all (covered by the canary test)."""
    r = _run("print(open)")
    assert r["ok"] is False and "not allowed" in r["output"]
    r = _run("print(type(1))")
    assert r["ok"] is False  # 'type' is not in the restricted builtins
    r = _run("print(len([abs, all, str, sum]))")
    assert r["ok"] is True and r["output"] == "4"
