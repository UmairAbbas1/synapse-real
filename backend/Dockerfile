# Stage 1: builder
FROM python:3.12-slim AS builder

WORKDIR /build

ENV PYTHONUNBUFFERED=1 \
    PYTHONDONTWRITEBYTECODE=1 \
    PIP_DEFAULT_TIMEOUT=600 \
    PIP_RETRIES=10

RUN apt-get update \
    && apt-get install -y --no-install-recommends build-essential \
    && rm -rf /var/lib/apt/lists/*

COPY pyproject.toml README.md ./
COPY app ./app/

RUN python -m venv /opt/venv \
    && /opt/venv/bin/pip install --no-cache-dir --upgrade pip \
    && /opt/venv/bin/pip install --no-cache-dir --retries 10 --timeout 600 \
         torch --index-url https://download.pytorch.org/whl/cpu \
    && /opt/venv/bin/pip install --no-cache-dir --retries 10 --timeout 600 .

# Stage 2: runtime
FROM python:3.12-slim AS runtime

RUN apt-get update \
    && apt-get install -y --no-install-recommends curl \
    && rm -rf /var/lib/apt/lists/* \
    && addgroup --gid 1001 synapse \
    && adduser --uid 1001 --gid 1001 --no-create-home synapse

COPY --from=builder /opt/venv /opt/venv
COPY app /app/app
COPY scripts /app/scripts
COPY alembic /app/alembic
COPY alembic.ini /app/
COPY docker-entrypoint.sh /usr/local/bin/docker-entrypoint.sh
WORKDIR /app

RUN chmod +x /usr/local/bin/docker-entrypoint.sh \
    && mkdir -p /app/.cache/huggingface/hub /app/.cache/sentence_transformers \
    && chown -R synapse:synapse /app

ENV PYTHONUNBUFFERED=1 \
    PYTHONDONTWRITEBYTECODE=1 \
    PYTHONPATH=/app \
    PATH="/opt/venv/bin:$PATH" \
    HOME=/app \
    HF_HOME=/app/.cache/huggingface \
    HUGGINGFACE_HUB_CACHE=/app/.cache/huggingface/hub \
    TRANSFORMERS_CACHE=/app/.cache/huggingface/hub \
    SENTENCE_TRANSFORMERS_HOME=/app/.cache/sentence_transformers

ENTRYPOINT ["/usr/local/bin/docker-entrypoint.sh"]

HEALTHCHECK --interval=30s --timeout=10s --retries=3 \
  CMD curl -f http://localhost:8000/api/v1/health || exit 1

CMD ["uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "8000", "--workers", "4"]
