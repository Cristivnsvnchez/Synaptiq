from __future__ import annotations
from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select

from app.core.database import get_db
from app.shared.models.access import Access
from app.shared.schemas.access import AccessCreate, AccessOut

router = APIRouter(prefix="/accesses", tags=["Accesses"])


@router.post("/", response_model=AccessOut, status_code=201)
async def create_access(payload: AccessCreate, db: AsyncSession = Depends(get_db)):
    access = Access(**payload.model_dump())
    db.add(access)
    await db.commit()
    await db.refresh(access)
    return access


@router.get("/", response_model=List[AccessOut])
async def list_accesses(entity_id: Optional[str] = None, db: AsyncSession = Depends(get_db)):
    q = select(Access)
    if entity_id:
        q = q.where(Access.entity_id == entity_id)
    result = await db.execute(q)
    return result.scalars().all()


@router.delete("/{access_id}", status_code=204)
async def delete_access(access_id: str, db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(Access).where(Access.id == access_id))
    access = result.scalar_one_or_none()
    if not access:
        raise HTTPException(status_code=404, detail="Access not found")
    await db.delete(access)
    await db.commit()
