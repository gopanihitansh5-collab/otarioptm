# OtariOptm gateway (FastAPI backend, port 8000)
FROM python:3.12-slim

ENV PYTHONUNBUFFERED=1 \
    PYTHONDONTWRITEBYTECODE=1

WORKDIR /app

COPY requirements.txt ./
RUN pip install --no-cache-dir -r requirements.txt

COPY run_server.py ./
COPY src ./src
COPY config ./config

# Run as an unprivileged user.
RUN useradd --create-home appuser && chown -R appuser:appuser /app
USER appuser

EXPOSE 8000

# API keys (OTARI_API_KEY, GROQ_API_KEY, EXA_API_KEY, RESEND_API_KEY) are
# supplied at runtime via environment or an .env bind-mount, never baked in.
# Without keys the gateway runs its zero-cost demo tier.
CMD ["python", "run_server.py"]
