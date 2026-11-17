
from app.schemas.auth import (
    UserRegister,
    UserLogin,
    UserResponse,
    TokenResponse,
)

from app.schemas.admin import (
    StudentDepartmentAssign,
    StudentDepartmentAssignResponse,
)

__all__ = [
    "UserRegister",
    "UserLogin",
    "UserResponse",
    "TokenResponse",
    "StudentDepartmentAssign",
    "StudentDepartmentAssignResponse",
]
