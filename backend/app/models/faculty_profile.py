
from __future__ import annotations

import uuid

from sqlalchemy import ForeignKey, Integer, String, Text, Uuid
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.models.base import Base, TimestampMixin


class FacultyProfile(Base, TimestampMixin):
    __tablename__ = "faculty_profiles"

    id: Mapped[uuid.UUID] = mapped_column(
        Uuid(as_uuid=True),
        primary_key=True,
        default=uuid.uuid4,
    )

    user_id: Mapped[uuid.UUID] = mapped_column(
        Uuid(as_uuid=True),
        ForeignKey("users.id", ondelete="CASCADE"),
        unique=True,
        nullable=False,
        index=True,
    )

    employee_id: Mapped[str | None] = mapped_column(
        String(100),
        nullable=True,
        index=True,
    )

    designation: Mapped[str | None] = mapped_column(
        String(150),
        nullable=True,
    )

    specialization: Mapped[str | None] = mapped_column(
        String(200),
        nullable=True,
    )

    qualification: Mapped[str | None] = mapped_column(
        String(200),
        nullable=True,
    )

    experience_years: Mapped[int | None] = mapped_column(
        Integer,
        nullable=True,
    )

    office_location: Mapped[str | None] = mapped_column(
        String(150),
        nullable=True,
    )

    bio: Mapped[str | None] = mapped_column(
        Text,
        nullable=True,
    )

    user: Mapped["User"] = relationship(
        "User",
        back_populates="faculty_profile",
    )
