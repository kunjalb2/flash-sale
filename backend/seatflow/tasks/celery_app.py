from celery import Celery
from celery.schedules import crontab

from seatflow.config import settings

celery_app = Celery(
    "seatflow",
    broker=settings.celery_broker_url,
    backend=settings.celery_result_backend,
)

celery_app.conf.update(
    task_serializer="json",
    result_serializer="json",
    accept_content=["json"],
    timezone="UTC",
    task_track_started=True,
    task_time_limit=30 * 60,
    worker_prefetch_multiplier=1,
    worker_max_tasks_per_child=1000,
)

celery_app.conf.beat_schedule = {
    "cleanup-expired-reservations-every-minute": {
        "task": "seatflow.tasks.tasks.cleanup_expired_reservations",
        "schedule": crontab(minute="*"),
    },
    "cleanup-failed-payments-every-5-minutes": {
        "task": "seatflow.tasks.tasks.cleanup_failed_payments",
        "schedule": crontab(minute="*/5"),
    },
}
