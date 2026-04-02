from fastapi import APIRouter, Depends
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select

from app.core.database import get_db
from app.shared.models.domain import Domain
from app.shared.schemas.domain import DomainOut

router = APIRouter(prefix="/domains", tags=["Domains"])

DOMAIN_SEEDS = [
    {"slug": "identity", "label": "Identité & Documents officiels", "icon": "🪪"},
    {"slug": "housing", "label": "Logement", "icon": "🏠"},
    {"slug": "finance", "label": "Finance", "icon": "💶"},
    {"slug": "work", "label": "Travail", "icon": "💼"},
    {"slug": "health", "label": "Santé", "icon": "🏥"},
    {"slug": "learning", "label": "Learning", "icon": "📚"},
    {"slug": "vehicle", "label": "Véhicule", "icon": "🚗"},
    {"slug": "travel", "label": "Voyage", "icon": "✈️"},
    {"slug": "subscriptions", "label": "Abonnements & Assets", "icon": "📦"},
    {"slug": "contacts", "label": "Contacts clés", "icon": "👥"},
    {"slug": "projects", "label": "Projets personnels", "icon": "🚀"},
]


@router.get("/", response_model=list[DomainOut])
async def list_domains(db: AsyncSession = Depends(get_db)):
    # Auto-seed domains if empty
    result = await db.execute(select(Domain))
    domains = result.scalars().all()
    if not domains:
        for seed in DOMAIN_SEEDS:
            db.add(Domain(**seed))
        await db.commit()
        result = await db.execute(select(Domain))
        domains = result.scalars().all()
    return domains


@router.get("/{slug}", response_model=DomainOut)
async def get_domain(slug: str, db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(Domain).where(Domain.slug == slug))
    domain = result.scalar_one_or_none()
    if not domain:
        from fastapi import HTTPException
        raise HTTPException(status_code=404, detail="Domain not found")
    return domain
