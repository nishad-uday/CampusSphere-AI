from datetime import datetime
from pydantic import BaseModel, Field, ConfigDict
from uuid import UUID

RESOURCE_CATEGORIES = {"notes", "assignment", "question_paper", "syllabus", "reference", "other"}

class LearningResourceCreate(BaseModel):
    title: str = Field(min_length=2, max_length=200)
    description: str | None = Field(default=None, max_length=3000)
    subject: str | None = Field(default=None, max_length=150)
    category: str = Field(default="notes", max_length=40)
    department_id: UUID | None = None
    semester: int | None = Field(default=None, ge=1, le=12)

class LearningResourceUpdate(BaseModel):
    title: str | None = Field(default=None, min_length=2, max_length=200)
    description: str | None = Field(default=None, max_length=3000)
    subject: str | None = Field(default=None, max_length=150)
    category: str | None = Field(default=None, max_length=40)
    department_id: UUID | None = None
    semester: int | None = Field(default=None, ge=1, le=12)

class LearningResourceResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    id: UUID
    title: str
    description: str | None
    subject: str | None
    category: str
    department_id: UUID | None
    department_name: str | None = None
    semester: int | None
    file_name: str
    mime_type: str
    file_size: int
    uploaded_by: UUID | None
    uploader_name: str | None = None
    created_at: datetime
    download_url: str
