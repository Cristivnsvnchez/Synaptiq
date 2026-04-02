from __future__ import annotations
from typing import List, Dict, Any, Optional
from fastapi import APIRouter, Depends
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func
from datetime import date, timedelta
from pydantic import BaseModel

from app.core.database import get_db
from app.shared.models.document import Document, DocumentStatus
from app.shared.models.reminder import Reminder, ReminderStatus
from app.shared.models.domain import Domain
from app.shared.models.entity import Entity
from app.services.document_service import sync_expired_documents

router = APIRouter(prefix="/dashboard", tags=["Dashboard"])


class DomainHealth(BaseModel):
    slug: str
    label: str
    icon: str
    health_score: int
    entity_count: int
    expired_docs: int
    expiring_soon: int
    pending_reminders: int


class AttentionItem(BaseModel):
    type: str          # "document" | "reminder"
    id: str
    title: str
    domain_slug: Optional[str]
    expires_at: Optional[str] = None
    trigger_date: Optional[str] = None
    status: Optional[str] = None
    reminder_type: Optional[str] = None
    urgency: str       # "overdue" | "soon" | "upcoming"


class DashboardOut(BaseModel):
    attention_required: List[AttentionItem]
    upcoming_30_days: List[AttentionItem]
    domains_health: List[DomainHealth]
    total_entities: int
    total_documents: int
    expired_count: int


async def _compute_domain_health(
    domain: Domain,
    db: AsyncSession,
    today: date,
    soon: date,
) -> DomainHealth:
    # Count entities in domain
    ent_result = await db.execute(
        select(func.count()).where(Entity.domain_id == domain.id)
    )
    entity_count = ent_result.scalar() or 0

    # Get all entity ids for this domain
    ent_ids_result = await db.execute(
        select(Entity.id).where(Entity.domain_id == domain.id)
    )
    entity_ids = [r[0] for r in ent_ids_result.all()]

    expired_docs = 0
    expiring_soon = 0
    pending_reminders = 0

    if entity_ids:
        # Expired docs
        exp_result = await db.execute(
            select(func.count()).where(
                Document.entity_id.in_(entity_ids),
                Document.status == DocumentStatus.expired,
            )
        )
        expired_docs = exp_result.scalar() or 0

        # Expiring soon (next 30 days)
        soon_result = await db.execute(
            select(func.count()).where(
                Document.entity_id.in_(entity_ids),
                Document.expires_at <= soon,
                Document.expires_at >= today,
                Document.status == DocumentStatus.valid,
            )
        )
        expiring_soon = soon_result.scalar() or 0

        # Pending reminders
        rem_result = await db.execute(
            select(func.count()).where(
                Reminder.entity_id.in_(entity_ids),
                Reminder.status == ReminderStatus.pending,
            )
        )
        pending_reminders = rem_result.scalar() or 0

    # Health score: 100 - penalties
    score = 100
    score -= expired_docs * 20
    score -= expiring_soon * 5
    score -= pending_reminders * 2
    score = max(0, min(100, score))

    # Persist score
    domain.health_score = score
    await db.commit()

    return DomainHealth(
        slug=domain.slug,
        label=domain.label,
        icon=domain.icon,
        health_score=score,
        entity_count=entity_count,
        expired_docs=expired_docs,
        expiring_soon=expiring_soon,
        pending_reminders=pending_reminders,
    )


@router.get("/", response_model=DashboardOut)
async def get_dashboard(db: AsyncSession = Depends(get_db)):
    today = date.today()
    in_30_days = today + timedelta(days=30)

    # Sync expired docs first
    await sync_expired_documents(db)

    attention: List[AttentionItem] = []
    upcoming: List[AttentionItem] = []

    # --- Expired & expiring documents ---
    exp_result = await db.execute(
        select(Document, Entity).join(Entity, Document.entity_id == Entity.id).where(
            Document.expires_at <= in_30_days,
            Document.status != DocumentStatus.archived,
        ).order_by(Document.expires_at)
    )

    domain_slugs: Dict[str, str] = {}  # entity_id -> domain_slug cache

    for doc, entity in exp_result.all():
        if entity.domain_id not in domain_slugs:
            dom_result = await db.execute(select(Domain).where(Domain.id == entity.domain_id))
            dom = dom_result.scalar_one_or_none()
            domain_slugs[entity.domain_id] = dom.slug if dom else "unknown"
        slug = domain_slugs[entity.domain_id]

        item = AttentionItem(
            type="document",
            id=doc.id,
            title=f"{doc.filename} ({entity.name})",
            domain_slug=slug,
            expires_at=doc.expires_at.isoformat() if doc.expires_at else None,
            status=doc.status.value,
            urgency="overdue" if (doc.expires_at and doc.expires_at < today) else "soon",
        )
        if doc.expires_at and doc.expires_at < today:
            attention.append(item)
        else:
            upcoming.append(item)

    # --- Due & upcoming reminders ---
    rem_result = await db.execute(
        select(Reminder, Entity).join(Entity, Reminder.entity_id == Entity.id).where(
            Reminder.trigger_date <= in_30_days,
            Reminder.status == ReminderStatus.pending,
        ).order_by(Reminder.trigger_date)
    )

    for reminder, entity in rem_result.all():
        if entity.domain_id not in domain_slugs:
            dom_result = await db.execute(select(Domain).where(Domain.id == entity.domain_id))
            dom = dom_result.scalar_one_or_none()
            domain_slugs[entity.domain_id] = dom.slug if dom else "unknown"
        slug = domain_slugs[entity.domain_id]

        urgency = "overdue" if reminder.trigger_date < today else "upcoming"
        item = AttentionItem(
            type="reminder",
            id=reminder.id,
            title=reminder.title,
            domain_slug=slug,
            trigger_date=reminder.trigger_date.isoformat(),
            reminder_type=reminder.type.value,
            urgency=urgency,
        )
        if reminder.trigger_date < today:
            attention.append(item)
        else:
            upcoming.append(item)

    # --- Domain health scores ---
    domains_result = await db.execute(select(Domain))
    domains = domains_result.scalars().all()
    domains_health = []
    for domain in domains:
        health = await _compute_domain_health(domain, db, today, in_30_days)
        domains_health.append(health)
    domains_health.sort(key=lambda d: d.health_score)

    # --- Global counts ---
    total_entities = (await db.execute(select(func.count(Entity.id)))).scalar() or 0
    total_documents = (await db.execute(select(func.count(Document.id)))).scalar() or 0
    expired_count = (await db.execute(
        select(func.count(Document.id)).where(Document.status == DocumentStatus.expired)
    )).scalar() or 0

    return DashboardOut(
        attention_required=attention,
        upcoming_30_days=upcoming,
        domains_health=domains_health,
        total_entities=total_entities,
        total_documents=total_documents,
        expired_count=expired_count,
    )
