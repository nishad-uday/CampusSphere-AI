
import enum
import uuid

from sqlalchemy import (
    BigInteger,
    DateTime,
    Enum as SQLAlchemyEnum,
    ForeignKey,
    Index,
    String,
    Text,
    Uuid,
)
from sqlalchemy.orm import Mapped, mapped_column

from app.models.base import Base, TimestampMixin
from datetime import datetime

class DocumentStatus(str, enum.Enum):
    PENDING = "pending"
    PROCESSING = "processing"
    COMPLETED = "completed"
    FAILED = "failed"


class DocumentType(str, enum.Enum):
    NOTICE = "notice"
    SYLLABUS = "syllabus"
    ACADEMIC_CALENDAR = "academic_calendar"
    EXAMINATION = "examination"
    RULES_REGULATIONS = "rules_regulations"
    STUDY_MATERIAL = "study_material"
    ADMISSION = "admission"
    OTHER = "other"


class Document(Base, TimestampMixin):
    __tablename__ = "documents"

    id: Mapped[uuid.UUID] = mapped_column(
        Uuid(as_uuid=True),
        primary_key=True,
        default=uuid.uuid4,
    )

    college_id: Mapped[uuid.UUID] = mapped_column(
        Uuid(as_uuid=True),
        ForeignKey("colleges.id", ondelete="RESTRICT"),
        nullable=False,
        index=True,
    )

    uploaded_by: Mapped[uuid.UUID | None] = mapped_column(
        Uuid(as_uuid=True),
        ForeignKey("users.id", ondelete="SET NULL"),
        nullable=True,
        index=True,
    )

    file_name: Mapped[str] = mapped_column(
        String(255),
        nullable=False,
    )

    stored_path: Mapped[str] = mapped_column(
        String(500),
        nullable=False,
    )

    file_type: Mapped[str] = mapped_column(
        String(20),
        nullable=False,
    )

    mime_type: Mapped[str] = mapped_column(
        String(100),
        nullable=False,
    )

    file_size: Mapped[int] = mapped_column(
        BigInteger,
        nullable=False,
    )

    checksum: Mapped[str | None] = mapped_column(
        String(64),
        nullable=True,
    )

    document_type: Mapped[str] = mapped_column(
        String(40),
        nullable=False,
        default=DocumentType.OTHER.value,
        server_default=DocumentType.OTHER.value,
        index=True,
    )

    published_at: Mapped[datetime | None] = mapped_column(
        DateTime(timezone=True),
        nullable=True,
    )

    status: Mapped[DocumentStatus] = mapped_column(
        SQLAlchemyEnum(
            DocumentStatus,
            name="document_status",
            values_callable=lambda enum_cls: [
                item.value for item in enum_cls
            ],
        ),
        nullable=False,
        default=DocumentStatus.PENDING,
    )

    error_message: Mapped[str | None] = mapped_column(
        Text,
        nullable=True,
    )

    page_count: Mapped[int | None] = mapped_column(
        nullable=True,
    )

    chunk_count: Mapped[int] = mapped_column(
        default=0,
        nullable=False,
    )

    __table_args__ = (
        Index(
            "ix_documents_college_status",
            "college_id",
            "status",
        ),
        Index(
            "ix_documents_college_type",
            "college_id",
            "document_type",
        ),
    )
