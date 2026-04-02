from __future__ import annotations
from typing import List, Dict, Any
from fastapi import APIRouter, Depends
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from datetime import date, timedelta
from pydantic import BaseModel

from app.core.database import get_db
from app.shared.models.document import Document, DocumentStatus
from app.shared.models.reminder import Reminder, ReminderStatus
from app.shared.models.domain import Domain

router = APIRouter(prefix="/dashboard", tags=["Dashboard"])


class DomainHealth(BaseModel):
    slug: str
    label: str
    icon: str
    health_score: int
    expired_docs: int
    pending_reminders: int


class DashboardOut(BaseModel):
    attention_required: List[Dict[str, Any]]
    upcoming_30_days: List[Dict[str, Any]]
    domains_health: List[DomainHealth]


@router.get("/", response_model=DashboardOut)
async def get_dashboard(db: AsyncSession = Depends(get_db)):
    today = date.today()
    in_30_days = today + timedelta(days=30)

    exp_result = await db.execute(
        select(Document).where(
            Document.expires_at <= in_30_days,
            Document.status != DocumentStatus.archived,
        ).order_by(Document.expires_at)
    )
    expiring_docs = exp_result.scalars().all()

    attention: List[Dict[str, Any]] = []
    upcoming: List[Dict[str, Any]] = []

    for doc in expiring_docs:
        item = {
            "type": "document",
            "id": doc.id,
            "title": doc.filename,
            "expires_at": doc.expires_at.isoformat() if doc.expires_at else None,
            "status": doc.status,
        }
        if doc.expires_at and doc.expires_at < today:
            attention.append(item)
        else:
            upcoming.append(item)

    rem_result = await db.execute(
        select(Reminder).where(
            Reminder.trigger_date <= in_30_days,
            Reminder.status == ReminderStatus.pending,
        ).order_by(Reminder.trigger_date)
    )
    for reminder in rem_result.scalars().all():
        item = {
            "type": "reminder",
            "id": reminder.id,
            "title": reminder.title,
            "trigger_date": reminder.trigger_date.isoformat(),
            "reminder_type": reminder.type,
        }
        if reminder.trigger_date < today:
            attention.append(item)
        else:
            upcoming.append(item)

    domains_result = await db.execute(select(Domain))
    domains_health = [
        DomainHealth(
            slug=d.slug,
            label=d.label,
            icon=d.icon,
            health_score=d.health_score,
            expired_docs=0,
            pending_reminders=0,
        )
        for d in domains_result.scalars().all()
    ]

    return DashboardOut(
        attention_required=attention,
        upcoming_30_days=upcoming,
        domains_health=domains_health,
    )
