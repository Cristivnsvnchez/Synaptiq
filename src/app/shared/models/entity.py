from sqlalchemy import String, Text, ForeignKey
from sqlalchemy.dialects.postgresql import JSONB
from sqlalchemy.orm import mapped_column, Mapped, relationship

from app.core.database import Base
from app.shared.models.base import TimestampMixin, new_uuid


class Entity(Base, TimestampMixin):
    __tablename__ = "entities"

    id: Mapped[str] = mapped_column(String, primary_key=True, default=new_uuid)
    domain_id: Mapped[str] = mapped_column(String, ForeignKey("domains.id"), nullable=False)
    name: Mapped[str] = mapped_column(String, nullable=False)
    type: Mapped[str] = mapped_column(String, nullable=False)  # ex: "passeport", "bail"
    metadata_: Mapped[dict | None] = mapped_column("metadata", JSONB, nullable=True)
    notes: Mapped[str | None] = mapped_column(Text, nullable=True)

    domain: Mapped["Domain"] = relationship(back_populates="entities")
    documents: Mapped[list["Document"]] = relationship(back_populates="entity")
    accesses: Mapped[list["Access"]] = relationship(back_populates="entity")
    reminders: Mapped[list["Reminder"]] = relationship(back_populates="entity")
