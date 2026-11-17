
from uuid import UUID

from pydantic import BaseModel, ConfigDict, Field, field_validator


class DepartmentCreate(BaseModel):
    name: str = Field(min_length=2, max_length=150)
    code: str = Field(min_length=2, max_length=50)

    @field_validator("name")
    @classmethod
    def clean_name(cls, value: str) -> str:
        value = value.strip()
        if not value:
            raise ValueError("Department name cannot be empty")
        return value

    @field_validator("code")
    @classmethod
    def clean_code(cls, value: str) -> str:
        value = value.strip().upper()
        if not value:
            raise ValueError("Department code cannot be empty")
        return value


class DepartmentUpdate(DepartmentCreate):
    pass


class DepartmentResponse(BaseModel):
    id: UUID
    name: str
    code: str
    college_id: UUID
    is_active: bool

    model_config = ConfigDict(from_attributes=True)
