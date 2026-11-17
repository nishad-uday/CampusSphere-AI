
from uuid import UUID

from pydantic import BaseModel, ConfigDict, Field


class StudentDepartmentAssign(BaseModel):
    department_id: UUID


class StudentDepartmentAssignResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    message: str
    student_id: UUID
    department_id: UUID
    department_name: str
