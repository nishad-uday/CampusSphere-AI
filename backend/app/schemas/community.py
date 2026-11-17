
from datetime import datetime
from uuid import UUID

from pydantic import BaseModel, ConfigDict, Field, field_validator


class CommunityPostCreate(BaseModel):
    content: str = Field(min_length=1, max_length=5000)

    @field_validator("content")
    @classmethod
    def validate_content(cls, value: str) -> str:
        value = value.strip()
        if not value:
            raise ValueError("Post content cannot be empty.")
        return value


class CommunityPostResponse(BaseModel):
    id: UUID
    user_id: UUID
    author_name: str
    content: str
    like_count: int
    comment_count: int
    has_liked: bool
    created_at: datetime

    model_config = ConfigDict(from_attributes=True)


class CommunityFeedResponse(BaseModel):
    items: list[CommunityPostResponse]
    total: int
    skip: int
    limit: int


class CommunityCommentCreate(BaseModel):
    content: str = Field(min_length=1, max_length=2000)

    @field_validator("content")
    @classmethod
    def validate_content(cls, value: str) -> str:
        value = value.strip()
        if not value:
            raise ValueError("Comment cannot be empty.")
        return value


class CommunityCommentResponse(BaseModel):
    id: UUID
    post_id: UUID
    user_id: UUID
    author_name: str
    content: str
    created_at: datetime


class CommunityCommentListResponse(BaseModel):
    items: list[CommunityCommentResponse]
    total: int


class CommunityLikeResponse(BaseModel):
    liked: bool
    like_count: int
    message: str
