
from uuid import UUID
from datetime import datetime, timedelta, timezone
import hashlib
import secrets
import uuid
from fastapi import APIRouter, Depends, HTTPException, status
from fastapi.security import HTTPAuthorizationCredentials
from pydantic import BaseModel, EmailStr, Field

from sqlalchemy import select, func
from sqlalchemy.exc import IntegrityError
from sqlalchemy.ext.asyncio import AsyncSession

from redis.asyncio import Redis
from redis.exceptions import RedisError

from app.api.deps import (
    bearer_scheme,
    get_current_user,
    get_current_active_user,
    require_role,
)

from app.core.redis import get_redis

from app.core.security import (
    hash_password,
    verify_password,
    create_access_token,
    decode_access_token,
)

from app.core.config import settings
from app.database.session import get_db

from app.models import (
    College,
    User,
    UserRole,
    StudentProfile,
)
from app.models.department import Department

from app.schemas.auth import (
    UserRegister,
    CollegeAdminRegister,
    UserLogin,
    UserResponse,
    TokenResponse,
    StudentProfileResponse,
    StudentProfileUpdate,
)


router = APIRouter(
    prefix="/auth",
    tags=["Authentication"],
)

# --------------------------------------------------
# PUBLIC COLLEGE AND DEPARTMENT LISTS
# --------------------------------------------------

@router.get("/colleges")
async def list_public_colleges(
    db: AsyncSession = Depends(get_db),
):
    result = await db.scalars(
        select(College)
        .where(College.is_active.is_(True))
        .order_by(College.name)
    )

    colleges = result.all()

    return {
        "items": [
            {
                "id": str(college.id),
                "name": college.name,
                "code": college.code,
            }
            for college in colleges
        ],
        "total": len(colleges),
    }


@router.get("/colleges/{college_id}/departments")
async def list_public_departments(
    college_id: uuid.UUID,
    db: AsyncSession = Depends(get_db),
):
    college = await db.scalar(
        select(College).where(
            College.id == college_id,
            College.is_active.is_(True),
        )
    )

    if not college:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="College not found or inactive.",
        )

    result = await db.scalars(
        select(Department)
        .where(
            Department.college_id == college_id,
            Department.is_active.is_(True),
        )
        .order_by(Department.name)
    )

    departments = result.all()

    return {
        "items": [
            {
                "id": str(department.id),
                "name": department.name,
                "code": department.code,
            }
            for department in departments
        ],
        "total": len(departments),
    }

# --------------------------------------------------
# PASSWORD REQUEST SCHEMAS
# --------------------------------------------------

class ForgotPasswordRequest(BaseModel):
    email: EmailStr


class ResetPasswordRequest(BaseModel):
    token: str = Field(min_length=20, max_length=256)
    new_password: str = Field(min_length=8, max_length=128)


class ChangePasswordRequest(BaseModel):
    current_password: str = Field(min_length=8, max_length=128)
    new_password: str = Field(min_length=8, max_length=128)


# --------------------------------------------------
# STUDENT REGISTRATION
# --------------------------------------------------

@router.post(
    "/register",
    response_model=UserResponse,
    status_code=status.HTTP_201_CREATED,
)
async def register_student(
    user_data: UserRegister,
    db: AsyncSession = Depends(get_db),
):
    """Register a student with college, department and semester details."""

    try:
        # Check duplicate email
        email = str(user_data.email).strip().lower()

        existing_user = await db.scalar(
            select(User).where(
                func.lower(User.email) == email
            )
        )

        if existing_user:
            raise HTTPException(
                status_code=status.HTTP_409_CONFLICT,
                detail="Email is already registered.",
            )

        # Find active college by name
        college = await db.scalar(
            select(College).where(
                func.lower(College.name)
                == user_data.college_name.strip().lower(),
                College.is_active.is_(True),
            )
        )

        if not college:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="College not found or inactive.",
            )

        # Verify department belongs to selected college
        department = await db.scalar(
            select(Department).where(
                Department.id == user_data.department_id,
                Department.college_id == college.id,
                Department.is_active.is_(True),
            )
        )

        if not department:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Invalid department for the selected college.",
            )


        # Check duplicate roll number within college
        existing_roll = await db.scalar(
            select(StudentProfile)
            .join(
                User,
                StudentProfile.user_id == User.id,
            )
            .where(
                User.college_id == college.id,
                func.lower(StudentProfile.roll_number)
                == user_data.roll_number.strip().lower(),
            )
        )

        if existing_roll:
            raise HTTPException(
                status_code=status.HTTP_409_CONFLICT,
                detail="This roll number is already registered.",
            )

        # Create student account
        new_user = User(
            full_name=user_data.full_name.strip(),
            email=email,
            password_hash=hash_password(user_data.password),
            role=UserRole.STUDENT,
            college_id=college.id,
            department_id=department.id,
            is_active=True,
            is_verified=False,
            must_change_password=False,
        )

        db.add(new_user)
        await db.flush()

        # Create student profile
        student_profile = StudentProfile(
            user_id=new_user.id,
            roll_number=user_data.roll_number.strip(),
            current_semester=user_data.current_semester,
        )

        db.add(student_profile)

        await db.commit()
        await db.refresh(new_user)

        return UserResponse(
            id=str(new_user.id),
            full_name=new_user.full_name,
            email=new_user.email,
            role=new_user.role.value,
            college_id=str(new_user.college_id),
            department_id=str(new_user.department_id),
            is_active=new_user.is_active,
            is_verified=new_user.is_verified,
            must_change_password=new_user.must_change_password,
        )

    except HTTPException:
        await db.rollback()
        raise

    except IntegrityError:
        await db.rollback()

        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="Registration conflict. Email or roll number may already exist.",
        )

    except Exception:
        await db.rollback()
        raise


# --------------------------------------------------
# COLLEGE ADMIN SELF REGISTRATION
# --------------------------------------------------

@router.post(
    "/register/college-admin",
    response_model=UserResponse,
    status_code=status.HTTP_201_CREATED,
)
async def register_college_admin(
    user_data: CollegeAdminRegister,
    db: AsyncSession = Depends(get_db),
):
    """Register a College Admin for an existing active college."""

    try:
        email = str(user_data.email).strip().lower()

        # Check whether email is already registered.
        existing_user = await db.scalar(
            select(User).where(
                func.lower(User.email) == email
            )
        )

        if existing_user:
            raise HTTPException(
                status_code=status.HTTP_409_CONFLICT,
                detail="Email is already registered.",
            )

        # Verify that the selected college exists and is active.
        college = await db.scalar(
            select(College).where(
                College.id == user_data.college_id,
                College.is_active.is_(True),
            )
        )

        if not college:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="College not found or inactive.",
            )

        # Create College Admin account.
        new_user = User(
            full_name=user_data.full_name.strip(),
            email=email,
            password_hash=hash_password(user_data.password),
            role=UserRole.COLLEGE_ADMIN,
            college_id=college.id,
            department_id=None,
            is_active=True,
            is_verified=False,
            must_change_password=False,
        )

        db.add(new_user)
        await db.commit()
        await db.refresh(new_user)

        return UserResponse(
            id=str(new_user.id),
            full_name=new_user.full_name,
            email=new_user.email,
            role=new_user.role.value,
            college_id=str(new_user.college_id),
            department_id=None,
            is_active=new_user.is_active,
            is_verified=new_user.is_verified,
            must_change_password=new_user.must_change_password,
        )

    except HTTPException:
        await db.rollback()
        raise

    except IntegrityError:
        await db.rollback()
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="Registration conflict. This email may already exist.",
        )

    except Exception:
        await db.rollback()
        raise

# --------------------------------------------------
# USER LOGIN
# --------------------------------------------------

@router.post(
    "/login",
    response_model=TokenResponse,
    status_code=status.HTTP_200_OK,
)
async def login_user(
    login_data: UserLogin,
    db: AsyncSession = Depends(get_db),
):
    """Authenticate user and return JWT access token."""

    email = str(login_data.email).strip().lower()

    user = await db.scalar(
        select(User).where(
            func.lower(User.email) == email
        )
    )

    if not user:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid email or password.",
            headers={"WWW-Authenticate": "Bearer"},
        )

    # Verify password
    if not verify_password(
        login_data.password,
        user.password_hash,
    ):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid email or password.",
            headers={"WWW-Authenticate": "Bearer"},
        )

    # Check account status
    if not user.is_active:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Your account is inactive. Contact your college administrator.",
        )

    # Generate access token
    expires_delta = timedelta(
        minutes=settings.access_token_expire_minutes
    )

    access_token = create_access_token(
        subject=str(user.id),
        expires_delta=expires_delta,
        additional_claims={
            "role": user.role.value,
            "college_id": (
                str(user.college_id)
                if user.college_id
                else None
            ),
        },
    )

    return TokenResponse(
        access_token=access_token,
        token_type="bearer",
        expires_in=settings.access_token_expire_minutes * 60,
        user=UserResponse(
            id=str(user.id),
            full_name=user.full_name,
            email=user.email,
            role=user.role.value,
            college_id=(
                str(user.college_id)
                if user.college_id
                else None
            ),
            department_id=(
                str(user.department_id)
                if user.department_id
                else None
            ),
            is_active=user.is_active,
            is_verified=user.is_verified,
            must_change_password=user.must_change_password,
        ),
    )


# --------------------------------------------------
# GET MY PROFILE
# --------------------------------------------------

@router.get(
    "/me",
    response_model=UserResponse,
)
async def get_my_profile(
    current_user: User = Depends(get_current_active_user),
):
    """Get currently authenticated user's profile."""

    return UserResponse(
        id=str(current_user.id),
        full_name=current_user.full_name,
        email=current_user.email,
        role=current_user.role.value,
        college_id=(
            str(current_user.college_id)
            if current_user.college_id
            else None
        ),
        department_id=(
            str(current_user.department_id)
            if current_user.department_id
            else None
        ),
        is_active=current_user.is_active,
        is_verified=current_user.is_verified,
        must_change_password=current_user.must_change_password,
    )



# --------------------------------------------------
# STUDENT PROFILE DETAILS
# --------------------------------------------------

async def _get_student_profile_row(
    user_id: UUID,
    db: AsyncSession,
):
    """Load a student's account, college, department and profile."""

    result = await db.execute(
        select(User, College, Department, StudentProfile)
        .outerjoin(College, User.college_id == College.id)
        .outerjoin(Department, User.department_id == Department.id)
        .outerjoin(StudentProfile, StudentProfile.user_id == User.id)
        .where(User.id == user_id)
    )
    return result.first()


def _student_profile_response(row) -> StudentProfileResponse:
    user, college, department, profile = row

    return StudentProfileResponse(
        user_id=str(user.id),
        full_name=user.full_name,
        email=user.email,
        role=user.role.value,
        college_id=str(user.college_id) if user.college_id else None,
        college_name=college.name if college else None,
        department_id=str(user.department_id) if user.department_id else None,
        department_name=department.name if department else None,
        roll_number=profile.roll_number if profile else None,
        enrollment_number=profile.enrollment_number if profile else None,
        admission_year=profile.admission_year if profile else None,
        graduation_year=profile.graduation_year if profile else None,
        current_semester=profile.current_semester if profile else None,
        section=profile.section if profile else None,
        bio=profile.bio if profile else None,
        skills=profile.skills if profile else None,
        github_url=profile.github_url if profile else None,
        linkedin_url=profile.linkedin_url if profile else None,
        portfolio_url=profile.portfolio_url if profile else None,
    )


@router.get(
    "/me/profile",
    response_model=StudentProfileResponse,
)
async def get_student_profile_details(
    current_user: User = Depends(require_role(UserRole.STUDENT)),
    db: AsyncSession = Depends(get_db),
):
    """Return the authenticated student's complete profile."""

    row = await _get_student_profile_row(current_user.id, db)

    if not row or row[3] is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Student profile not found.",
        )

    return _student_profile_response(row)


@router.patch(
    "/me/profile",
    response_model=StudentProfileResponse,
)
async def update_student_profile_details(
    profile_data: StudentProfileUpdate,
    current_user: User = Depends(require_role(UserRole.STUDENT)),
    db: AsyncSession = Depends(get_db),
):
    """Update editable fields of the authenticated student's own profile."""

    row = await _get_student_profile_row(current_user.id, db)

    if not row or row[3] is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Student profile not found.",
        )

    user, college, department, student_profile = row
    updates = profile_data.model_dump(exclude_unset=True)

    try:
        if "full_name" in updates and updates["full_name"] is not None:
            user.full_name = updates.pop("full_name")
        else:
            updates.pop("full_name", None)

        # These fields are intentionally not accepted by the update schema:
        # email, role, college, department and roll_number remain read-only.
        allowed_profile_fields = {
            "enrollment_number",
            "admission_year",
            "graduation_year",
            "current_semester",
            "section",
            "bio",
            "skills",
            "github_url",
            "linkedin_url",
            "portfolio_url",
        }

        for field_name, value in updates.items():
            if field_name not in allowed_profile_fields:
                continue

            if field_name in {"github_url", "linkedin_url", "portfolio_url"}:
                value = str(value) if value is not None else None

            setattr(student_profile, field_name, value)

        await db.commit()

        updated_row = await _get_student_profile_row(current_user.id, db)
        if not updated_row or updated_row[3] is None:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Student profile not found after update.",
            )

        return _student_profile_response(updated_row)

    except HTTPException:
        await db.rollback()
        raise
    except Exception:
        await db.rollback()
        raise


# --------------------------------------------------
# ROLE-BASED ENDPOINTS
# --------------------------------------------------

@router.get("/student-only")
async def student_only(
    current_user: User = Depends(
        require_role(UserRole.STUDENT)
    ),
):
    return {
        "message": "Welcome to the Student Dashboard!",
        "user_id": str(current_user.id),
        "role": current_user.role.value,
    }


@router.get("/faculty-only")
async def faculty_only(
    current_user: User = Depends(
        require_role(UserRole.FACULTY)
    ),
):
    return {
        "message": "Welcome to the Faculty Dashboard!",
        "user_id": str(current_user.id),
        "role": current_user.role.value,
    }


@router.get("/college-admin-only")
async def college_admin_only(
    current_user: User = Depends(
        require_role(UserRole.COLLEGE_ADMIN)
    ),
):
    return {
        "message": "Welcome to the College Admin Dashboard!",
        "user_id": str(current_user.id),
        "role": current_user.role.value,
    }


@router.get("/super-admin-only")
async def super_admin_only(
    current_user: User = Depends(
        require_role(UserRole.SUPER_ADMIN)
    ),
):
    return {
        "message": "Welcome to the Super Admin Dashboard!",
        "user_id": str(current_user.id),
        "role": current_user.role.value,
    }


# --------------------------------------------------
# CHANGE PASSWORD
# --------------------------------------------------

@router.post("/change-password")
async def change_password(
    request: ChangePasswordRequest,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """
    Change password.

    This endpoint also handles mandatory first-login
    password changes for faculty accounts.
    """

    if not current_user.is_active:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="User account is inactive.",
        )

    # Verify current password
    if not verify_password(
        request.current_password,
        current_user.password_hash,
    ):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Current password is incorrect.",
        )

    # Prevent using the same password
    if request.current_password == request.new_password:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="New password must be different from current password.",
        )

    try:
        current_user.password_hash = hash_password(
            request.new_password
        )

        current_user.must_change_password = False

        await db.commit()
        await db.refresh(current_user)

        return {
            "message": "Password changed successfully.",
            "must_change_password": False,
        }

    except Exception:
        await db.rollback()
        raise


# --------------------------------------------------
# USER LOGOUT
# --------------------------------------------------

@router.post("/logout")
async def logout_user(
    credentials: HTTPAuthorizationCredentials | None = Depends(
        bearer_scheme
    ),
    current_user: User = Depends(get_current_user),
    redis: Redis = Depends(get_redis),
):
    """Revoke the current JWT access token."""

    if credentials is None:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Authentication required.",
        )

    if not current_user.is_active:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="User account is inactive.",
        )

    token = credentials.credentials

    try:
        payload = decode_access_token(token)

        expiry_timestamp = int(payload["exp"])

        current_timestamp = int(
            datetime.now(timezone.utc).timestamp()
        )

        remaining_seconds = (
            expiry_timestamp - current_timestamp
        )

        if remaining_seconds <= 0:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Token has expired.",
            )

        token_key = hashlib.sha256(
            token.encode("utf-8")
        ).hexdigest()

        await redis.set(
            f"revoked:{token_key}",
            "1",
            ex=remaining_seconds,
        )

        return {
            "message": "Logout successful.",
            "user_id": str(current_user.id),
        }

    except RedisError:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="Logout service temporarily unavailable.",
        )


# --------------------------------------------------
# FORGOT PASSWORD
# --------------------------------------------------

@router.post("/forgot-password")
async def forgot_password(
    request: ForgotPasswordRequest,
    db: AsyncSession = Depends(get_db),
    redis: Redis = Depends(get_redis),
):
    """Generate a one-time password reset token."""

    email = str(request.email).strip().lower()

    try:
        user = await db.scalar(
            select(User).where(
                func.lower(User.email) == email
            )
        )

        response = {
            "message": (
                "If the account exists, a password reset "
                "request has been created."
            )
        }

        if not user or not user.is_active:
            return response

        reset_token = secrets.token_urlsafe(32)

        token_hash = hashlib.sha256(
            reset_token.encode("utf-8")
        ).hexdigest()

        await redis.set(
            f"password_reset:{token_hash}",
            str(user.id),
            ex=900,
        )

        # DEVELOPMENT ONLY.
        # Never expose reset tokens in production.
        response["reset_token"] = reset_token
        response["expires_in"] = 900

        return response

    except RedisError:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="Password reset service unavailable.",
        )


# --------------------------------------------------
# RESET PASSWORD
# --------------------------------------------------

@router.post("/reset-password")
async def reset_password(
    request: ResetPasswordRequest,
    db: AsyncSession = Depends(get_db),
    redis: Redis = Depends(get_redis),
):
    """Reset password using a valid one-time token."""

    token_hash = hashlib.sha256(
        request.token.encode("utf-8")
    ).hexdigest()

    redis_key = f"password_reset:{token_hash}"

    try:
        # Retrieve and delete token atomically
        user_id = await redis.getdel(redis_key)

        if not user_id:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Invalid or expired reset token.",
            )

        user = await db.scalar(
            select(User).where(
                User.id == UUID(user_id)
            )
        )

        if not user or not user.is_active:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Invalid password reset request.",
            )

        user.password_hash = hash_password(
            request.new_password
        )

        # A user who resets their password has chosen
        # a new password, so the temporary-password flag clears.
        user.must_change_password = False

        await db.commit()

        return {
            "message": "Password has been reset successfully. Please login again.",
            "must_change_password": False,
        }

    except HTTPException:
        raise

    except RedisError:
        await db.rollback()

        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="Password reset service unavailable.",
        )

    except Exception:
        await db.rollback()
        raise
