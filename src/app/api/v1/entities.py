from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select

from app.core.database import get_db
from app.shared.models.entity import Entity
from app.shared.schemas.entity import EntityCreate, EntityUpdate, EntityOut

router = APIRouter(prefix="/entities", tags=["Entities"])


@router.post("/", response_model=EntityOut, status_code=201)
async def create_entity(payload: EntityCreate, db: AsyncSession = Depends(get_db)):
    entity = Entity(**payload.model_dump())
    db.add(entity)
    await db.commit()
    await db.refresh(entity)
    return entity


@router.get("/", response_model=list[EntityOut])
async def list_entities(domain_id: str | None = None, db: AsyncSession = Depends(get_db)):
    q = select(Entity)
    if domain_id:
        q = q.where(Entity.domain_id == domain_id)
    result = await db.execute(q)
    return result.scalars().all()


@router.get("/{entity_id}", response_model=EntityOut)
async def get_entity(entity_id: str, db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(Entity).where(Entity.id == entity_id))
    entity = result.scalar_one_or_none()
    if not entity:
        raise HTTPException(status_code=404, detail="Entity not found")
    return entity


@router.patch("/{entity_id}", response_model=EntityOut)
async def update_entity(entity_id: str, payload: EntityUpdate, db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(Entity).where(Entity.id == entity_id))
    entity = result.scalar_one_or_none()
    if not entity:
        raise HTTPException(status_code=404, detail="Entity not found")
    for field, value in payload.model_dump(exclude_unset=True).items():
        setattr(entity, field, value)
    await db.commit()
    await db.refresh(entity)
    return entity


@router.delete("/{entity_id}", status_code=204)
async def delete_entity(entity_id: str, db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(Entity).where(Entity.id == entity_id))
    entity = result.scalar_one_or_none()
    if not entity:
        raise HTTPException(status_code=404, detail="Entity not found")
    await db.delete(entity)
    await db.commit()
