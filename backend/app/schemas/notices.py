from datetime import datetime
from uuid import UUID
from pydantic import BaseModel, ConfigDict, Field, field_validator, model_validator


class NoticeCreate(BaseModel):
    title: str = Field(min_length=3, max_length=250)
    content: str = Field(min_length=5, max_length=20000)
    category: str = Field(default="General", min_length=2, max_length=50)
    priority: str = "normal"
    is_published: bool = False
    expires_at: datetime | None = None

    @field_validator("title", "content", "category")
    @classmethod
    def clean_text(cls, value: str) -> str:
        value = value.strip()
        if not value:
            raise ValueError("This field cannot be empty.")
        return value

    @field_validator("priority")
    @classmethod
    def validate_priority(cls, value: str) -> str:
        value = value.strip().lower()
        if value not in {"low", "normal", "high", "urgent"}:
            raise ValueError("Priority must be low, normal, high, or urgent.")
        return value

    @model_validator(mode="after")
    def validate_expiry(self):
        if self.expires_at and self.expires_at.tzinfo is None:
            raise ValueError("Expiry date must include a timezone.")
        return self


class NoticeUpdate(NoticeCreate):
    pass


class NoticeResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    id: UUID
    college_id: UUID
    created_by: UUID
    author_name: str
    title: str
    content: str
    category: str
    priority: str
    is_published: bool
    published_at: datetime | None
    expires_at: datetime | None
    created_at: datetime
    updated_at: datetime


class NoticeListResponse(BaseModel):
    items: list[NoticeResponse]
    total: int
    skip: int
    limit: int


class NoticeActionResponse(BaseModel):
    message: str
    notice_id: UUID
