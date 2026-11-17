
from uuid import UUID
from datetime import datetime

from pydantic import BaseModel, ConfigDict, Field, field_validator


class AcademicQuestionCreate(BaseModel):
    title: str = Field(min_length=5, max_length=250)
    content: str = Field(min_length=10, max_length=10000)

    @field_validator("title", "content")
    @classmethod
    def clean_text(cls, value: str) -> str:
        value = value.strip()
        if not value:
            raise ValueError("This field cannot be empty.")
        return value


class AcademicAnswerCreate(BaseModel):
    content: str = Field(min_length=2, max_length=10000)

    @field_validator("content")
    @classmethod
    def clean_content(cls, value: str) -> str:
        value = value.strip()
        if not value:
            raise ValueError("Answer cannot be empty.")
        return value


class AcademicQuestionResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: UUID
    user_id: UUID
    author_name: str
    department_id: UUID | None
    department_name: str | None
    title: str
    content: str
    answer_count: int
    is_resolved: bool
    created_at: datetime


class AcademicQuestionFeedResponse(BaseModel):
    items: list[AcademicQuestionResponse]
    total: int
    skip: int
    limit: int


class AcademicAnswerResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: UUID
    question_id: UUID
    user_id: UUID
    author_name: str
    author_role: str
    content: str
    like_count: int
    has_liked: bool
    is_accepted: bool
    created_at: datetime


class AcademicAnswerListResponse(BaseModel):
    items: list[AcademicAnswerResponse]
    total: int


class AcademicLikeResponse(BaseModel):
    liked: bool
    like_count: int
    message: str


class AcademicAcceptResponse(BaseModel):
    message: str
    question_id: UUID
    accepted_answer_id: UUID
    is_resolved: bool


class AcademicDeleteResponse(BaseModel):
    message: str

class AcademicAnswerUpdate(BaseModel):
    content: str = Field(min_length=2, max_length=10000)

    @field_validator("content")
    @classmethod
    def clean_content(cls, value: str) -> str:
        value = value.strip()
        if not value:
            raise ValueError("Answer cannot be empty.")
        return value


class AcademicQuestionStatusResponse(BaseModel):
    message: str
    question_id: UUID
    is_resolved: bool
