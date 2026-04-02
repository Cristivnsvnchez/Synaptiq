from __future__ import annotations
from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select

from app.core.database import get_db
from app.shared.models.reminder import Reminder, ReminderStatus
from app.shared.schemas.reminder import ReminderCreate, ReminderOut

router = APIRouter(prefix="/reminders", tags=["Reminders"])


@router.post("/", response_model=ReminderOut, status_code=201)
async def create_reminder(payload: ReminderCreate, db: AsyncSession = Depends(get_db)):
    reminder = Reminder(**payload.model_dump())
    db.add(reminder)
    await db.commit()
    await db.refresh(reminder)
    return reminder


@router.get("/", response_model=List[ReminderOut])
async def list_reminders(
    status: Optional[ReminderStatus] = None,
    db: AsyncSession = Depends(get_db),
):
    q = select(Reminder)
    if status:
        q = q.where(Reminder.status == status)
    result = await db.execute(q.order_by(Reminder.trigger_date))
    return result.scalars().all()


@router.patch("/{reminder_id}/dismiss", response_model=ReminderOut)
async def dismiss_reminder(reminder_id: str, db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(Reminder).where(Reminder.id == reminder_id))
    reminder = result.scalar_one_or_none()
    if not reminder:
        raise HTTPException(status_code=404, detail="Reminder not found")
    reminder.status = ReminderStatus.dismissed
    await db.commit()
    await db.refresh(reminder)
    return reminder
