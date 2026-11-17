
import uuid
from datetime import datetime

from pydantic import BaseModel, Field, ConfigDict


class AssistantAskRequest(BaseModel):
    question: str = Field(
        min_length=1,
        max_length=5000,
    )

    chat_id: uuid.UUID | None = None


class AssistantSource(BaseModel):
    source_number: int
    document_id: uuid.UUID
    file_name: str
    chunk_id: uuid.UUID
    page_number: int | None = None


class AssistantAskResponse(BaseModel):
    chat_id: uuid.UUID
    question_message_id: uuid.UUID
    answer_message_id: uuid.UUID
    question: str
    answer: str
    sources: list[AssistantSource]
    created_at: datetime


class AssistantChatSummary(BaseModel):
    id: uuid.UUID
    title: str
    is_active: bool
    created_at: datetime

    model_config = ConfigDict(from_attributes=True)


class AssistantMessageResponse(BaseModel):
    id: uuid.UUID
    role: str
    content: str
    sources: list | None = None
    created_at: datetime
