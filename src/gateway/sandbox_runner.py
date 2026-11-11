"""Sandbox runner: executed as a FRESH interpreter subprocess, never forked.

The gateway spawns ``python -I sandbox_runner.py`` with an EMPTY environment
for every untrusted code-exec request. Because the child is a brand new
interpreter (isolated mode: no env vars, no user site, no cwd on sys.path),
it inherits nothing from the server process: no module globals, no loaded
API clients, no environment keys. There is nothing sensitive in its memory
to leak, which is what makes the remaining Python-sandbox limits acceptable
for a public endpoint.

Defense in depth inside the child:
  1. AST validation refuses imports, reflection builtins, dunder access and
     frame/object-model attributes (gi_frame, cr_frame, f_globals, ...).
  2. exec runs with a minimal builtins set.
  3. RLIMIT_CPU (kernel SIGKILL mid-busy-loop) and RLIMIT_AS (fixed cap)
     are applied BEFORE untrusted code runs.
The parent additionally enforces a wall-clock timeout and kills the child.

This module is imported by the gateway for the shared validator AND executed
standalone as the child entry point (see bottom).
"""

import ast
import json
import sys
from typing import Any, Dict, List, Optional

SANDBOX_DUNDER_ALLOWLIST = {"__name__", "__doc__", "__file__"}

SANDBOX_BANNED_NAMES = {
    "eval", "exec", "compile", "open", "__import__", "input", "breakpoint",
    "globals", "locals", "vars", "getattr", "setattr", "delattr", "memoryview",
    "exit", "quit", "help", "id",
}

# Banned as ATTRIBUTES. Two classes:
#  - str.format / format_map evaluate attribute access INSIDE the format
#    string (``"{0.__class__}".format(x)``), bypassing AST attribute checks;
#    the ``format`` BUILTIN stays allowed (it takes a spec string, not a path).
#  - frame/object-model attributes are not dunders, so the dunder rule does
#    not catch them: ``(x for x in ()).gi_frame.f_globals`` walks from a
#    generator to its frame and out to module globals; coroutines expose the
#    same via ``cr_frame`` and async generators via ``ag_frame``.
SANDBOX_BANNED_ATTRS = SANDBOX_BANNED_NAMES | {
    "format", "format_map",
    "gi_frame", "cr_frame", "ag_frame",
    "f_back", "f_builtins", "f_code", "f_globals", "f_locals",
    "tb_frame", "tb_lineno", "tb_next",
}

MAX_OUTPUT_CHARS = 64 * 1024


def sandbox_violation(code: str) -> Optional[str]:
    """Static check of untrusted code; returns a reason string or None."""
    try:
        tree = ast.parse(code, mode="exec")
    except SyntaxError as exc:
        return f"syntax error: {exc.msg} (line {exc.lineno})"
    except Exception as exc:
        return f"could not parse code: {exc.__class__.__name__}"

    for node in ast.walk(tree):
        if isinstance(node, (ast.Import, ast.ImportFrom)):
            return "imports are not allowed in the sandbox"
        if isinstance(node, ast.Attribute):
            attr = node.attr
            if attr in SANDBOX_BANNED_ATTRS:
                return f"'{attr}' is not allowed in the sandbox"
            if attr.startswith("__") and attr.endswith("__") and attr not in SANDBOX_DUNDER_ALLOWLIST:
                return f"attribute '{attr}' is not allowed in the sandbox"
        elif isinstance(node, ast.Name):
            name = node.id
            if name in SANDBOX_BANNED_NAMES:
                return f"'{name}' is not allowed in the sandbox"
            if name.startswith("__") and name.endswith("__") and name not in SANDBOX_DUNDER_ALLOWLIST:
                return f"name '{name}' is not allowed in the sandbox"
    return None


def _safe_builtins() -> Dict[str, Any]:
    return {
        "abs": abs, "all": all, "any": any, "bool": bool, "dict": dict, "divmod": divmod,
        "enumerate": enumerate, "filter": filter, "float": float, "format": format,
        "frozenset": frozenset, "int": int, "len": len, "list": list, "map": map,
        "max": max, "min": min, "range": range, "repr": repr, "reversed": reversed,
        "round": round, "set": set, "sorted": sorted, "str": str, "sum": sum,
        "tuple": tuple, "zip": zip,
        "__import__": lambda name, *a, **k: (_ for _ in ()).throw(
            RuntimeError(f"import blocked in sandbox: {name}")
        ),
    }


def _apply_limits() -> Optional[str]:
    """Hard OS limits, applied in the child BEFORE untrusted code runs.

    FAIL CLOSED: if RLIMIT_CPU or RLIMIT_AS cannot be applied, return an
    error string and the child refuses to run untrusted code at all. There
    is no assumed graceful degrade.
    """
    try:
        import resource
    except Exception as exc:
        return f"resource limits unavailable ({exc.__class__.__name__})"
    try:
        resource.setrlimit(resource.RLIMIT_CPU, (5, 6))
    except Exception as exc:
        return f"RLIMIT_CPU could not be applied ({exc.__class__.__name__})"
    try:
        cap = 512 * 1024 * 1024  # fixed address-space cap, fresh interpreter
        resource.setrlimit(resource.RLIMIT_AS, (cap, cap))
    except Exception as exc:
        return f"RLIMIT_AS could not be applied ({exc.__class__.__name__})"
    return None


def _child_main() -> None:
    limits_error = _apply_limits()
    if limits_error:
        print(json.dumps({"output": f"sandbox unavailable: {limits_error}", "ok": False, "error": limits_error}))
        return
    code = sys.stdin.read()
    violation = sandbox_violation(code)
    if violation:
        print(json.dumps({"output": f"sandbox rejected: {violation}", "ok": False, "error": violation}))
        return
    stdout: List[str] = []

    def _fake_print(*args: Any, **kwargs: Any) -> None:
        stdout.append(" ".join(str(a) for a in args))

    gl: Dict[str, Any] = {"__builtins__": _safe_builtins(), "print": _fake_print}
    try:
        exec(code, gl, {})  # noqa: S102 - AST-validated, fresh empty interpreter
        out = "\n".join(stdout) or "(no output)"
        print(json.dumps({"output": out[:MAX_OUTPUT_CHARS], "ok": True, "error": None}))
    except MemoryError:
        print(json.dumps({"output": "sandbox error: memory limit exceeded", "ok": False, "error": "memory limit"}))
    except Exception as exc:  # noqa: BLE001
        detail = f"{exc.__class__.__name__}: {exc}"
        print(json.dumps({"output": f"sandbox error: {detail}"[:MAX_OUTPUT_CHARS], "ok": False, "error": detail}))


if __name__ == "__main__":
    _child_main()
