
import uuid
from datetime import datetime

from pydantic import BaseModel, ConfigDict, Field

from app.models.document import DocumentType


class DocumentUploadResponse(BaseModel):
    id: uuid.UUID
    file_name: str
    file_type: str
    file_size: int
    document_type: str
    published_at: datetime | None = None
    status: str
    page_count: int | None
    chunk_count: int
    created_at: datetime

    model_config = ConfigDict(from_attributes=True)


class DocumentMetadataUpdate(BaseModel):
    document_type: DocumentType = Field(
        default=DocumentType.OTHER
    )
    published_at: datetime | None = None
