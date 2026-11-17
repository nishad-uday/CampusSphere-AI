
from uuid import UUID

from pydantic import (
    BaseModel,
    ConfigDict,
    EmailStr,
    Field,
    field_validator,
    HttpUrl,
)


class UserRegister(BaseModel):
    full_name: str = Field(min_length=2, max_length=150)
    email: EmailStr
    password: str = Field(min_length=8, max_length=128)
    role: str = "student"
    college_name: str = Field(min_length=2, max_length=200)
    department_id: UUID
    roll_number: str = Field(min_length=1, max_length=100)
    current_semester: int = Field(ge=1, le=8)

    @field_validator("full_name", "college_name", "roll_number")
    @classmethod
    def validate_text_fields(cls, value: str) -> str:
        value = value.strip()
        if not value:
            raise ValueError("This field cannot be empty")
        return value

    @field_validator("role")
    @classmethod
    def validate_role(cls, value: str) -> str:
        if value != "student":
            raise ValueError(
                "Public registration is only allowed for students"
            )
        return value


class CollegeAdminRegister(BaseModel):
    full_name: str = Field(min_length=2, max_length=150)
    email: EmailStr
    password: str = Field(min_length=8, max_length=128)
    college_id: UUID

    @field_validator("full_name")
    @classmethod
    def validate_full_name(cls, value: str) -> str:
        value = value.strip()
        if not value:
            raise ValueError("Full name cannot be empty")
        return value


class UserLogin(BaseModel):
    email: EmailStr
    password: str = Field(min_length=1, max_length=128)


class UserResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: str
    full_name: str
    email: EmailStr
    role: str
    college_id: str | None
    department_id: str | None
    is_active: bool
    is_verified: bool
    must_change_password: bool = False


class TokenResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"
    expires_in: int
    user: UserResponse


class StudentProfileResponse(BaseModel):
    user_id: str
    full_name: str
    email: EmailStr
    role: str
    college_id: str | None = None
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


class StudentProfileUpdate(BaseModel):
    full_name: str | None = Field(default=None, min_length=2, max_length=150)
    enrollment_number: str | None = Field(default=None, max_length=100)
    admission_year: int | None = Field(default=None, ge=1950, le=2200)
    graduation_year: int | None = Field(default=None, ge=1950, le=2200)
    current_semester: int | None = Field(default=None, ge=1, le=12)
    section: str | None = Field(default=None, max_length=30)
    bio: str | None = Field(default=None, max_length=3000)
    skills: str | None = Field(default=None, max_length=3000)
    github_url: HttpUrl | None = None
    linkedin_url: HttpUrl | None = None
    portfolio_url: HttpUrl | None = None

    @field_validator(
        "full_name",
        "enrollment_number",
        "section",
        "bio",
        "skills",
        mode="before",
    )
    @classmethod
    def strip_optional_text(cls, value):
        if isinstance(value, str):
            value = value.strip()
            return value or None
        return value
