"""Vercel entrypoint for the OtariOptm gateway service.

Vercel's FastAPI preset looks for an ASGI application exported as ``app`` inside
``api/index.py`` (or a root-level ``main.py`` / ``app.py``). The gateway itself
lives in ``src/gateway/main.py``, so this module only fixes ``sys.path`` and
re-exports the application object.

The app is created by ``create_app()`` inside src/gateway/main.py; the module
level ``app`` keeps the same behaviour, so importing it here is enough.
"""

import os
import sys

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from src.gateway.main import app  # noqa: E402

__all__ = ["app"]
