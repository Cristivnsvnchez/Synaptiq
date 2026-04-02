from __future__ import annotations
from datetime import date, timedelta
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, update

from app.shared.models.document import Document, DocumentStatus
from app.shared.models.reminder import Reminder, ReminderType, ReminderStatus


EXPIRY_THRESHOLDS = [
    (90, "J-90"),
    (30, "J-30"),
    (7,  "J-7"),
]


async def sync_expired_documents(db: AsyncSession) -> int:
    """Mark documents as expired when their expiry date has passed."""
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
    return len(docs)


async def create_expiry_reminders(db: AsyncSession, document: Document) -> list[Reminder]:
    """Auto-create J-90 / J-30 / J-7 reminders for a document with an expiry date."""
    if not document.expires_at:
        return []

    reminders = []
    for days_before, label in EXPIRY_THRESHOLDS:
        trigger = document.expires_at - timedelta(days=days_before)
        if trigger < date.today():
            continue  # skip past triggers
        reminder = Reminder(
            entity_id=document.entity_id,
            document_id=document.id,
            title=f"{label} — {document.filename} expire le {document.expires_at.strftime('%d/%m/%Y')}",
            trigger_date=trigger,
            type=ReminderType.expiry,
            status=ReminderStatus.pending,
        )
        db.add(reminder)
        reminders.append(reminder)

    await db.commit()
    return reminders
