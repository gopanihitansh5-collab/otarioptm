# OtariOptm gateway (FastAPI backend, port 8000)
FROM python:3.12-slim

# Unbuffered logs for `docker logs`; no .pyc churn (app dir stays read-only);
# pip never keeps a cache inside the image layer.
ENV PYTHONUNBUFFERED=1 \
    PYTHONDONTWRITEBYTECODE=1 \
    PIP_NO_CACHE_DIR=1

WORKDIR /app

# Unprivileged user, created before app code is copied so source bumps never
# invalidate this layer. /app stays root-owned (read-only for the runtime user);
# the zero-key demo tier writes nothing, so no chown is needed.
RUN useradd --create-home --shell /usr/sbin/nologin appuser

# Dependencies first: this layer only rebuilds when requirements change.
COPY requirements.txt ./
RUN pip install --no-cache-dir -r requirements.txt

COPY run_server.py ./
COPY src ./src
COPY config ./config

USER appuser

EXPOSE 8000

# API keys (OTARI_API_KEY, GROQ_API_KEY, EXA_API_KEY, RESEND_API_KEY) are
# supplied at runtime via environment or an .env bind-mount, never baked in.
# Without keys the gateway runs its zero-cost demo tier.
# Health endpoint is /api/v1/health (see src/gateway/main.py). urlopen raises on
# connection errors and non-2xx, so the container flips unhealthy on both.
HEALTHCHECK --interval=30s --timeout=5s --start-period=15s --retries=3 \
  CMD ["python", "-c", "import urllib.request; urllib.request.urlopen('http://127.0.0.1:8000/api/v1/health', timeout=4)"]

CMD ["python", "run_server.py"]
