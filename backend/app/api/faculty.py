from uuid import UUID
import secrets
import string

from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy import func, or_, select
from sqlalchemy.exc import IntegrityError
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.deps import require_role
from app.core.security import hash_password
from app.database.session import get_db

from app.models import (
    College,
    Department,
    FacultyProfile,
    StudentProfile,
    User,
    UserRole,
)

from app.schemas.faculty import (
    FacultyCreate,
    FacultyResponse,
    FacultyProfileResponse,
    FacultyProfileUpdate,
    FacultyStudentItem,
    FacultyStudentListResponse,
    FacultyStudentProfileResponse,
)


router = APIRouter(
    prefix="/faculty",
    tags=["Faculty Management"],
)


def generate_temporary_password(length: int = 16) -> str:
    """Generate a random temporary password."""

    alphabet = string.ascii_letters + string.digits + "!@#$%&*"

    while True:
        password = "".join(
            secrets.choice(alphabet) for _ in range(length)
        )

        if (
            any(c.islower() for c in password)
            and any(c.isupper() for c in password)
            and any(c.isdigit() for c in password)
            and any(c in "!@#$%&*" for c in password)
        ):
            return password


# ==================================================
# CREATE FACULTY (COLLEGE ADMIN)
# ==================================================

@router.post(
    "/create",
    response_model=FacultyResponse,
    status_code=status.HTTP_201_CREATED,
)
async def create_faculty(
    faculty_data: FacultyCreate,
    current_admin: User = Depends(
        require_role(UserRole.COLLEGE_ADMIN)
    ),
    db: AsyncSession = Depends(get_db),
):
    """Create a faculty account with a temporary password."""

    if current_admin.college_id is None:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="College Admin is not assigned to a college",
        )

    email = str(faculty_data.email).strip().lower()
    department_uuid = None

    existing_user = await db.scalar(
        select(User.id).where(
            func.lower(User.email) == email
        )
    )

    if existing_user is not None:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="Email is already registered",
        )

    if faculty_data.department_id:
        try:
            department_uuid = UUID(
                str(faculty_data.department_id)
            )
        except (ValueError, TypeError):
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Invalid department ID",
            )

        department = await db.scalar(
            select(Department).where(
                Department.id == department_uuid,
                Department.college_id == current_admin.college_id,
                Department.is_active.is_(True),
            )
        )

        if department is None:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Department not found in your college",
            )

    if faculty_data.employee_id:
        existing_employee = await db.scalar(
            select(FacultyProfile.id)
            .join(User, FacultyProfile.user_id == User.id)
            .where(
                User.college_id == current_admin.college_id,
                func.lower(FacultyProfile.employee_id)
                == faculty_data.employee_id.lower(),
            )
        )

        if existing_employee is not None:
            raise HTTPException(
                status_code=status.HTTP_409_CONFLICT,
                detail="Employee ID already exists in this college",
            )

    temporary_password = generate_temporary_password()

    try:
        faculty_user = User(
            full_name=faculty_data.full_name,
            email=email,
            password_hash=hash_password(temporary_password),
            role=UserRole.FACULTY,
            college_id=current_admin.college_id,
            department_id=department_uuid,
            is_active=True,
            is_verified=True,
            must_change_password=True,
        )

        db.add(faculty_user)
        await db.flush()

        profile = FacultyProfile(
            user_id=faculty_user.id,
            employee_id=faculty_data.employee_id,
            designation=faculty_data.designation,
            specialization=faculty_data.specialization,
            qualification=faculty_data.qualification,
            experience_years=faculty_data.experience_years,
            office_location=faculty_data.office_location,
            bio=faculty_data.bio,
        )

        db.add(profile)
        await db.flush()

        response = FacultyResponse(
            id=str(faculty_user.id),
            full_name=faculty_user.full_name,
            email=faculty_user.email,
            role=faculty_user.role.value,
            college_id=str(faculty_user.college_id),
            department_id=(
                str(faculty_user.department_id)
                if faculty_user.department_id else None
            ),
            employee_id=profile.employee_id,
            designation=profile.designation,
            specialization=profile.specialization,
            qualification=profile.qualification,
            experience_years=profile.experience_years,
            office_location=profile.office_location,
            bio=profile.bio,
            temporary_password=temporary_password,
            must_change_password=True,
        )

        await db.commit()
        return response

    except IntegrityError:
        await db.rollback()
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="Faculty account could not be created due to duplicate data",
        )

    except Exception:
        await db.rollback()
        raise


# ==================================================
# HELPER: LOAD CURRENT FACULTY PROFILE
# ==================================================

async def get_faculty_profile_row(
    user_id: UUID,
    db: AsyncSession,
):
    result = await db.execute(
        select(
            User,
            College,
            Department,
            FacultyProfile,
        )
        .outerjoin(
            College,
            User.college_id == College.id,
        )
        .outerjoin(
            Department,
            User.department_id == Department.id,
        )
        .outerjoin(
            FacultyProfile,
            FacultyProfile.user_id == User.id,
        )
        .where(User.id == user_id)
    )

    return result.first()


def build_faculty_profile_response(row):
    user, college, department, profile = row

    return FacultyProfileResponse(
        user_id=str(user.id),
        full_name=user.full_name,
        email=user.email,
        role=user.role.value,

        college_id=(
            str(user.college_id)
            if user.college_id else None
        ),
        college_name=(
            college.name if college else None
        ),

        department_id=(
            str(user.department_id)
            if user.department_id else None
        ),
        department_name=(
            department.name if department else None
        ),

        employee_id=(
            profile.employee_id if profile else None
        ),
        designation=(
            profile.designation if profile else None
        ),
        specialization=(
            profile.specialization if profile else None
        ),
        qualification=(
            profile.qualification if profile else None
        ),
        experience_years=(
            profile.experience_years if profile else None
        ),
        office_location=(
            profile.office_location if profile else None
        ),
        bio=(
            profile.bio if profile else None
        ),
    )

# ==================================================
# GET STUDENTS OF FACULTY'S DEPARTMENT
# ==================================================

@router.get(
    "/students",
    response_model=FacultyStudentListResponse,
)
async def get_my_department_students(
    skip: int = Query(default=0, ge=0),
    limit: int = Query(default=50, ge=1, le=100),
    search: str | None = Query(default=None, max_length=100),
    current_faculty: User = Depends(
        require_role(UserRole.FACULTY)
    ),
    db: AsyncSession = Depends(get_db),
):
    """
    Return students belonging to the logged-in
    faculty's college and assigned department.
    """

    if not current_faculty.college_id:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Faculty is not assigned to a college.",
        )

    if not current_faculty.department_id:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="You are not assigned to any department. Please contact your College Admin.",
        )

    filters = [
        User.role == UserRole.STUDENT,
        User.college_id == current_faculty.college_id,
        User.department_id == current_faculty.department_id,
        User.is_active.is_(True),
    ]

    if search and search.strip():
        search_term = f"%{search.strip()}%"

        filters.append(
            or_(
                User.full_name.ilike(search_term),
                User.email.ilike(search_term),
                StudentProfile.roll_number.ilike(search_term),
            )
        )

    total = await db.scalar(
        select(func.count(User.id))
        .join(
            StudentProfile,
            StudentProfile.user_id == User.id,
        )
        .where(*filters)
    )

    result = await db.execute(
        select(
            User,
            StudentProfile,
            Department,
        )
        .join(
            StudentProfile,
            StudentProfile.user_id == User.id,
        )
        .outerjoin(
            Department,
            Department.id == User.department_id,
        )
        .where(*filters)
        .order_by(User.full_name.asc())
        .offset(skip)
        .limit(limit)
    )

    rows = result.all()

    items = []

    for user, student_profile, department in rows:
        items.append(
            FacultyStudentItem(
                id=str(user.id),
                full_name=user.full_name,
                email=user.email,
                department_id=(
                    str(user.department_id)
                    if user.department_id
                    else None
                ),
                department_name=(
                    department.name
                    if department
                    else None
                ),
                roll_number=student_profile.roll_number,
                current_semester=student_profile.current_semester,
                section=student_profile.section,
            )
        )

    return FacultyStudentListResponse(
        items=items,
        total=total or 0,
        skip=skip,
        limit=limit,
    )



# ==================================================
# GET INDIVIDUAL STUDENT PROFILE (FACULTY)
# ==================================================

@router.get(
    "/students/{student_id}",
    response_model=FacultyStudentProfileResponse,
)
async def get_department_student_profile(
    student_id: UUID,
    current_faculty: User = Depends(
        require_role(UserRole.FACULTY)
    ),
    db: AsyncSession = Depends(get_db),
):
    """
    Return a complete student profile only when the student
    belongs to the faculty member's college and department.
    """

    if current_faculty.college_id is None:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Faculty is not assigned to a college.",
        )

    if current_faculty.department_id is None:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=(
                "You are not assigned to any department. "
                "Please contact your College Admin."
            ),
        )

    result = await db.execute(
        select(
            User,
            StudentProfile,
            Department,
            College,
        )
        .join(
            StudentProfile,
            StudentProfile.user_id == User.id,
        )
        .outerjoin(
            Department,
            Department.id == User.department_id,
        )
        .outerjoin(
            College,
            College.id == User.college_id,
        )
        .where(
            User.id == student_id,
            User.role == UserRole.STUDENT,
            User.college_id == current_faculty.college_id,
            User.department_id == current_faculty.department_id,
            User.is_active.is_(True),
        )
    )

    row = result.first()

    # Do not reveal whether an out-of-scope student ID exists.
    if row is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Student not found in your assigned department.",
        )

    user, student_profile, department, college = row

    return FacultyStudentProfileResponse(
        id=str(user.id),
        full_name=user.full_name,
        email=user.email,
        college_name=college.name if college else None,
        department_id=(
            str(user.department_id)
            if user.department_id
            else None
        ),
        department_name=(
            department.name
            if department
            else None
        ),
        roll_number=student_profile.roll_number,
        enrollment_number=student_profile.enrollment_number,
        admission_year=student_profile.admission_year,
        graduation_year=student_profile.graduation_year,
        current_semester=student_profile.current_semester,
        section=student_profile.section,
        bio=student_profile.bio,
        skills=student_profile.skills,
        github_url=student_profile.github_url,
        linkedin_url=student_profile.linkedin_url,
        portfolio_url=student_profile.portfolio_url,
    )

# ==================================================
# GET MY FACULTY PROFILE
# ==================================================

@router.get(
    "/me",
    response_model=FacultyProfileResponse,
)
async def get_my_faculty_profile(
    current_faculty: User = Depends(
        require_role(UserRole.FACULTY)
    ),
    db: AsyncSession = Depends(get_db),
):
    """Get complete profile of the logged-in faculty."""

    row = await get_faculty_profile_row(
        current_faculty.id,
        db,
    )

    if not row:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Faculty account not found",
        )

    if row[3] is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Faculty profile not found",
        )

    return build_faculty_profile_response(row)


# ==================================================
# UPDATE MY FACULTY PROFILE
# ==================================================

@router.put(
    "/me/profile",
    response_model=FacultyProfileResponse,
)
async def update_my_faculty_profile(
    profile_data: FacultyProfileUpdate,
    current_faculty: User = Depends(
        require_role(UserRole.FACULTY)
    ),
    db: AsyncSession = Depends(get_db),
):
    """Update editable fields of the logged-in faculty."""

    row = await get_faculty_profile_row(
        current_faculty.id,
        db,
    )

    if not row or row[3] is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Faculty profile not found",
        )

    user, college, department, profile = row

    updates = profile_data.model_dump(
        exclude_unset=True
    )

    try:
        if "full_name" in updates:
            if updates["full_name"] is not None:
                user.full_name = updates["full_name"]

            updates.pop("full_name")

        allowed_fields = {
            "employee_id",
            "designation",
            "specialization",
            "qualification",
            "experience_years",
            "office_location",
            "bio",
        }

        for field_name, value in updates.items():
            if field_name in allowed_fields:
                setattr(profile, field_name, value)

        await db.commit()

        updated_row = await get_faculty_profile_row(
            current_faculty.id,
            db,
        )

        if not updated_row or updated_row[3] is None:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Faculty profile not found after update",
            )

        return build_faculty_profile_response(updated_row)

    except HTTPException:
        await db.rollback()
        raise

    except IntegrityError:
        await db.rollback()
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="Profile update conflicts with existing data",
        )

    except Exception:
        await db.rollback()
        raise
