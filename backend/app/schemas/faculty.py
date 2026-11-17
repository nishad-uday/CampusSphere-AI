
from uuid import UUID

from pydantic import (
    BaseModel,
    ConfigDict,
    EmailStr,
    Field,
    field_validator,
)


# ==================================================
# CREATE FACULTY
# ==================================================

class FacultyCreate(BaseModel):
    full_name: str = Field(min_length=2, max_length=150)
    email: EmailStr
    department_id: UUID | None = None

    employee_id: str | None = Field(default=None, max_length=50)
    designation: str | None = Field(default=None, max_length=100)
    specialization: str | None = Field(default=None, max_length=150)
    qualification: str | None = Field(default=None, max_length=150)
    experience_years: int | None = Field(default=None, ge=0, le=60)
    office_location: str | None = Field(default=None, max_length=150)
    bio: str | None = Field(default=None, max_length=1000)

    @field_validator("full_name")
    @classmethod
    def clean_full_name(cls, value: str) -> str:
        value = value.strip()

        if not value:
            raise ValueError("Full name cannot be empty")

        return value

    @field_validator(
        "employee_id",
        "designation",
        "specialization",
        "qualification",
        "office_location",
        "bio",
    )
    @classmethod
    def clean_optional_text(cls, value: str | None) -> str | None:
        if value is None:
            return None

        value = value.strip()
        return value or None


# ==================================================
# FACULTY CREATE RESPONSE
# ==================================================

class FacultyResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: str
    full_name: str
    email: EmailStr
    role: str
    college_id: str
    department_id: str | None

    employee_id: str | None
    designation: str | None
    specialization: str | None
    qualification: str | None
    experience_years: int | None
    office_location: str | None
    bio: str | None

    temporary_password: str
    must_change_password: bool = True


# ==================================================
# FACULTY PROFILE RESPONSE
# ==================================================

class FacultyProfileResponse(BaseModel):
    user_id: str
    full_name: str
    email: EmailStr
    role: str

    college_id: str | None
    college_name: str | None

    department_id: str | None
    department_name: str | None

    employee_id: str | None
    designation: str | None
    specialization: str | None
    qualification: str | None
    experience_years: int | None
    office_location: str | None
    bio: str | None


# ==================================================
# UPDATE FACULTY PROFILE
# ==================================================

class FacultyProfileUpdate(BaseModel):
    full_name: str | None = Field(
        default=None,
        min_length=2,
        max_length=150,
    )

    employee_id: str | None = Field(default=None, max_length=100)
    designation: str | None = Field(default=None, max_length=150)
    specialization: str | None = Field(default=None, max_length=200)
    qualification: str | None = Field(default=None, max_length=200)
    experience_years: int | None = Field(default=None, ge=0, le=60)
    office_location: str | None = Field(default=None, max_length=150)
    bio: str | None = Field(default=None, max_length=1000)

    @field_validator("full_name")
    @classmethod
    def clean_full_name(cls, value: str | None) -> str | None:
        if value is None:
            return None

        value = value.strip()

        if not value:
            raise ValueError("Full name cannot be empty")

        return value

    @field_validator(
        "employee_id",
        "designation",
        "specialization",
        "qualification",
        "office_location",
        "bio",
    )
    @classmethod
    def clean_optional_text(cls, value: str | None) -> str | None:
        if value is None:
            return None

        value = value.strip()
        return value or None


# ==================================================
# FACULTY STUDENT DIRECTORY
# ==================================================

class FacultyStudentItem(BaseModel):
    id: str
    full_name: str
    email: EmailStr

    department_id: str | None = None
    department_name: str | None = None

    roll_number: str | None = None
    current_semester: int | None = None
    section: str | None = None


class FacultyStudentListResponse(BaseModel):
    items: list[FacultyStudentItem]
    total: int
    skip: int
    limit: int

# Add this class at the end of backend/app/schemas/faculty.py.

class FacultyStudentProfileResponse(BaseModel):
    """Complete student profile visible to authorized department faculty."""

    id: str
    full_name: str
    email: EmailStr
    college_name: str | None = None
    department_id: str | None = None
    department_name: str | None = None
    roll_number: str | None = None
    enrollment_number: str | None = None
    admission_year: int | None = None
    graduation_year: int | None = None
    current_semester: int | None = None
    section: str | None = None
    bio: str | None = None
    skills: str | None = None
    github_url: str | None = None
    linkedin_url: str | None = None
    portfolio_url: str | None = None
