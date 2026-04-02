from sqlalchemy import String, Integer
from sqlalchemy.orm import mapped_column, Mapped, relationship

from app.core.database import Base
from app.shared.models.base import TimestampMixin, new_uuid


class Domain(Base, TimestampMixin):
    __tablename__ = "domains"

    id: Mapped[str] = mapped_column(String, primary_key=True, default=new_uuid)
    slug: Mapped[str] = mapped_column(String, unique=True, nullable=False)
    label: Mapped[str] = mapped_column(String, nullable=False)
    icon: Mapped[str] = mapped_column(String, default="📁")
    health_score: Mapped[int] = mapped_column(Integer, default=100)

    entities: Mapped[list["Entity"]] = relationship(back_populates="domain")
