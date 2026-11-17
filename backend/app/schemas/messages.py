from datetime import datetime
from uuid import UUID

from pydantic import BaseModel, ConfigDict, Field, field_validator


class MessageCreate(BaseModel):
    content: str = Field(min_length=1, max_length=5000)

    @field_validator("content")
    @classmethod
    def clean_content(cls, value: str) -> str:
        value = value.strip()
        if not value:
            raise ValueError("Message cannot be empty.")
        return value


class ContactResponse(BaseModel):
    id: UUID
    full_name: str
    email: str
    role: str
    department_id: UUID | None
    department_name: str | None = None


class DirectMessageResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: UUID
    conversation_id: UUID
    sender_id: UUID
    sender_name: str
    sender_role: str
    content: str
    read_at: datetime | None
    created_at: datetime


class MessageListResponse(BaseModel):
    items: list[DirectMessageResponse]
    total: int
    skip: int
    limit: int


class ConversationResponse(BaseModel):
    id: UUID
    participant_id: UUID
    participant_name: str
    participant_email: str
    participant_role: str
    department_name: str | None = None
    last_message: str | None = None
    last_message_at: datetime | None = None
    unread_count: int = 0


class ConversationListResponse(BaseModel):
    items: list[ConversationResponse]
    total: int


class MessageActionResponse(BaseModel):
    message: str
    conversation_id: UUID
