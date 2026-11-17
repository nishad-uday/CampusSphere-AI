
from __future__ import annotations

import uuid

from sqlalchemy import Boolean, String, Uuid
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.models.base import Base, TimestampMixin


class College(Base, TimestampMixin):
    __tablename__ = "colleges"

    id: Mapped[uuid.UUID] = mapped_column(
        Uuid(as_uuid=True),
        primary_key=True,
        default=uuid.uuid4,
    )

    name: Mapped[str] = mapped_column(
        String(200),
        nullable=False,
    )

    code: Mapped[str] = mapped_column(
        String(50),
        unique=True,
        index=True,
        nullable=False,
    )

    email_domain: Mapped[str | None] = mapped_column(
        String(150),
        nullable=True,
    )

    is_active: Mapped[bool] = mapped_column(
        Boolean,
        default=True,
        nullable=False,
    )

    # One college has multiple departments.
    departments: Mapped[list["Department"]] = relationship(
        "Department",
        back_populates="college",
        cascade="all, delete-orphan",
    )

    # One college has multiple users.
    users: Mapped[list["User"]] = relationship(
        "User",
        back_populates="college",
    )
