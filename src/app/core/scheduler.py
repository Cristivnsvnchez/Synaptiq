from __future__ import annotations
import logging
from datetime import date

from apscheduler.schedulers.asyncio import AsyncIOScheduler
from apscheduler.triggers.cron import CronTrigger
from sqlalchemy import select, update

from app.core.database import AsyncSessionLocal
from app.shared.models.document import Document, DocumentStatus
from app.shared.models.reminder import Reminder, ReminderStatus

logger = logging.getLogger("synaptiq.scheduler")

scheduler = AsyncIOScheduler()


async def job_sync_expired_documents():
    """Daily: mark documents as expired when their date has passed."""
    async with AsyncSessionLocal() as db:
        today = date.today()
        result = await db.execute(
            select(Document).where(
                Document.expires_at < today,
                Document.status == DocumentStatus.valid,
            )
        )
        docs = result.scalars().all()
        for doc in docs:
            doc.status = DocumentStatus.expired
        await db.commit()
        if docs:
            logger.info(f"[scheduler] Marked {len(docs)} document(s) as expired.")


async def job_fire_due_reminders():
    """Daily: mark reminders as 'sent' when their trigger_date is today or past."""
    async with AsyncSessionLocal() as db:
        today = date.today()
        result = await db.execute(
            select(Reminder).where(
                Reminder.trigger_date <= today,
                Reminder.status == ReminderStatus.pending,
            )
        )
        reminders = result.scalars().all()
        for reminder in reminders:
            reminder.status = ReminderStatus.sent
            logger.info(f"[scheduler] Reminder fired: {reminder.title} (entity: {reminder.entity_id})")
        await db.commit()
        if reminders:
            logger.info(f"[scheduler] Fired {len(reminders)} reminder(s).")


def start_scheduler():
    scheduler.add_job(
        job_sync_expired_documents,
        CronTrigger(hour=0, minute=5),  # every day at 00:05
        id="sync_expired_documents",
        replace_existing=True,
    )
    scheduler.add_job(
        job_fire_due_reminders,
        CronTrigger(hour=0, minute=10),  # every day at 00:10
        id="fire_due_reminders",
        replace_existing=True,
    )
    scheduler.start()
    logger.info("[scheduler] Started — jobs: sync_expired_documents, fire_due_reminders")
