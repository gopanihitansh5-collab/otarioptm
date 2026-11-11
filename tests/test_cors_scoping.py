"""CORS scoping: production/local origins explicit, previews team-scoped.

The broad unanchored https://.*\.vercel\.app wildcard admitted every
Vercel project (and, being unanchored, look-alike attacker domains)
with credentials. Production calls the API same-origin via /api
rewrites, so the wildcard is narrowed to the project's own team slug.
"""

from fastapi.testclient import TestClient

import src.gateway.main as gw

client = TestClient(gw.app)


def _acao(origin: str) -> str:
    return client.get("/api/v1/health", headers={"Origin": origin}).headers.get(
        "access-control-allow-origin", ""
    )


def test_production_origin_allowed():
    assert _acao("https://otarioptm.vercel.app") == "https://otarioptm.vercel.app"


def test_local_dev_origins_allowed():
    assert _acao("http://localhost:3000") == "http://localhost:3000"
    assert _acao("http://localhost:5173") == "http://localhost:5173"


def test_team_preview_deployment_allowed():
    assert (
        _acao("https://otarioptm-git-feat-x-hitanshuser50s-projects.vercel.app")
        == "https://otarioptm-git-feat-x-hitanshuser50s-projects.vercel.app"
    )


def test_unrelated_vercel_project_rejected():
    assert _acao("https://someone-elses-app.vercel.app") == ""


def test_lookalike_domain_rejected():
    # Unanchored regexes would match this prefix; the anchored one must not.
    assert _acao("https://x-hitanshuser50s-projects.vercel.app.evil.example") == ""


def test_origin_regex_env_override(monkeypatch):
    monkeypatch.setenv("ALLOWED_ORIGIN_REGEX", r"https://.*\.example\.com$")
    assert gw._allow_origin_regex() == r"https://.*\.example\.com$"
