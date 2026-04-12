"""Celery application (workers expanded in Phase 3)."""

from __future__ import annotations

from celery import Celery

from app.config import settings

celery_app = Celery(
    "synapse",
    broker=settings.REDIS_URL,
    backend=settings.REDIS_URL,
    include=[
        "app.workers.ingestion_tasks",
        "app.workers.sync_tasks",
        "app.workers.cleanup_tasks",
    ],
)

celery_app.conf.update(
    task_serializer="json",
    accept_content=["json"],
    result_serializer="json",
    timezone="UTC",
    enable_utc=True,
)
