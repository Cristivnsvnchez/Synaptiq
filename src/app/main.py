from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from contextlib import asynccontextmanager

from app.core.database import engine, Base
from app.api.v1 import capture, domains, entities, documents, accesses, reminders, dashboard


@asynccontextmanager
async def lifespan(app: FastAPI):
    # Startup: create tables (dev only — use alembic in prod)
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)
    yield


app = FastAPI(
    title="Synaptiq API",
    description="Personal OS — your second brain.",
    version="1.0.0",
    lifespan=lifespan,
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(capture.router, prefix="/api/v1")
app.include_router(domains.router, prefix="/api/v1")
app.include_router(entities.router, prefix="/api/v1")
app.include_router(documents.router, prefix="/api/v1")
app.include_router(accesses.router, prefix="/api/v1")
app.include_router(reminders.router, prefix="/api/v1")
app.include_router(dashboard.router, prefix="/api/v1")


@app.get("/health")
async def health():
    return {"status": "ok"}
