from sqlalchemy import String, Text, ForeignKey
from sqlalchemy.orm import mapped_column, Mapped, relationship

from app.core.database import Base
from app.shared.models.base import TimestampMixin, new_uuid


class Access(Base, TimestampMixin):
    __tablename__ = "accesses"

    id: Mapped[str] = mapped_column(String, primary_key=True, default=new_uuid)
    entity_id: Mapped[str] = mapped_column(String, ForeignKey("entities.id"), nullable=False)
    label: Mapped[str] = mapped_column(String, nullable=False)  # "Portail Ameli"
    url: Mapped[str | None] = mapped_column(String, nullable=True)
    account_ref: Mapped[str | None] = mapped_column(String, nullable=True)
    username: Mapped[str | None] = mapped_column(String, nullable=True)
    notes: Mapped[str | None] = mapped_column(Text, nullable=True)

    entity: Mapped["Entity"] = relationship(back_populates="accesses")
