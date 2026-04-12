"""Celery application initializing background structures."""

from celery import Celery
from celery.schedules import crontab
from app.config import settings

celery_app = Celery("synapse_workers")

celery_app.conf.update(
    broker_url=settings.REDIS_URL,
    result_backend=settings.REDIS_URL,
    task_serializer="json",
    accept_content=["json"],
    result_serializer="json",
    timezone="UTC",
    enable_utc=True,
    task_track_started=True,
    task_reject_on_worker_lost=True,
    task_acks_late=True,
)

celery_app.autodiscover_tasks([
    'app.workers.ingestion_tasks',
    'app.workers.sync_tasks',
    'app.workers.cleanup_tasks'
])

celery_app.conf.beat_schedule = {
    'sync-all-sources-every-6-hours': {
        'task': 'app.workers.sync_tasks.sync_all_sources',
        'schedule': crontab(minute='0', hour='*/6'),
    },
    'cleanup-sessions-daily': {
        'task': 'app.workers.cleanup_tasks.cleanup_expired_sessions',
        'schedule': crontab(minute='0', hour='0'),
    },
    'cleanup-audit-logs-daily': {
        'task': 'app.workers.cleanup_tasks.cleanup_old_audit_logs',
        'schedule': crontab(minute='0', hour='0'),
    }
}
