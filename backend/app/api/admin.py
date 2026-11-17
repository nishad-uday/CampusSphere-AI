
from pathlib import Path
from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession



from app.api.deps import require_role
from app.database.session import get_db
from app.models import (
    College,
    Department,
    Document,
    FacultyProfile,
    StudentProfile,
    User,
    UserRole,
)
from app.models.document import DocumentStatus

from sqlalchemy.exc import IntegrityError

from app.schemas.department import (
    DepartmentCreate,
    DepartmentUpdate,
    DepartmentResponse,
)

from app.schemas.admin import (
    StudentDepartmentAssign,
    StudentDepartmentAssignResponse,
)

router = APIRouter(
    prefix="/admin",
    tags=["College Admin"],
)


def verify_college_admin(current_admin: User):
    if current_admin.college_id is None:
        raise HTTPException(
            status_code=400,
            detail="College Admin is not assigned to a college.",
        )


@router.get("/dashboard")
async def get_admin_dashboard(
    current_admin: User = Depends(
        require_role(UserRole.COLLEGE_ADMIN)
    ),
    db: AsyncSession = Depends(get_db),
):
    """Return dashboard statistics for the admin's college."""

    verify_college_admin(current_admin)
    college_id = current_admin.college_id

    college = await db.get(College, college_id)

    if college is None:
        raise HTTPException(
            status_code=404,
            detail="College not found.",
        )

    async def count_users(role):
        result = await db.scalar(
            select(func.count(User.id)).where(
                User.college_id == college_id,
                User.role == role,
            )
        )
        return result or 0

    students = await count_users(UserRole.STUDENT)
    faculty = await count_users(UserRole.FACULTY)

    departments = await db.scalar(
        select(func.count(Department.id)).where(
            Department.college_id == college_id,
            Department.is_active.is_(True),
        )
    )

    documents = await db.scalar(
        select(func.count(Document.id)).where(
            Document.college_id == college_id
        )
    )

    completed_documents = await db.scalar(
        select(func.count(Document.id)).where(
            Document.college_id == college_id,
            Document.status == DocumentStatus.COMPLETED,
        )
    )

    return {
        "college": {
            "id": str(college.id),
            "name": college.name,
            "code": college.code,
        },
        "statistics": {
            "total_students": students,
            "total_faculty": faculty,
            "total_departments": departments or 0,
            "total_documents": documents or 0,
            "completed_documents": completed_documents or 0,
        },
    }


@router.get("/faculty")
async def list_college_faculty(
    page: int = Query(1, ge=1),
    limit: int = Query(20, ge=1, le=100),
    current_admin: User = Depends(
        require_role(UserRole.COLLEGE_ADMIN)
    ),
    db: AsyncSession = Depends(get_db),
):
    """List faculty members belonging to the admin's college."""

    verify_college_admin(current_admin)

    base_query = (
        select(User, FacultyProfile, Department)
        .outerjoin(
            FacultyProfile,
            FacultyProfile.user_id == User.id,
        )
        .outerjoin(
            Department,
            Department.id == User.department_id,
        )
        .where(
            User.college_id == current_admin.college_id,
            User.role == UserRole.FACULTY,
        )
    )

    total = await db.scalar(
        select(func.count(User.id)).where(
            User.college_id == current_admin.college_id,
            User.role == UserRole.FACULTY,
        )
    )

    result = await db.execute(
        base_query
        .order_by(User.created_at.desc())
        .offset((page - 1) * limit)
        .limit(limit)
    )

    items = []

    for user, profile, department in result.all():
        items.append({
            "id": str(user.id),
            "full_name": user.full_name,
            "email": user.email,
            "is_active": user.is_active,
            "must_change_password": user.must_change_password,
            "department": department.name if department else None,
            "employee_id": profile.employee_id if profile else None,
            "designation": profile.designation if profile else None,
            "specialization": profile.specialization if profile else None,
            "qualification": profile.qualification if profile else None,
            "experience_years": profile.experience_years if profile else None,
            "created_at": user.created_at,
        })

    return {
        "items": items,
        "total": total or 0,
        "page": page,
        "limit": limit,
    }


@router.get("/students")
async def list_college_students(
    page: int = Query(1, ge=1),
    limit: int = Query(20, ge=1, le=100),
    current_admin: User = Depends(
        require_role(UserRole.COLLEGE_ADMIN)
    ),
    db: AsyncSession = Depends(get_db),
):
    """List students belonging to the admin's college."""

    verify_college_admin(current_admin)

    query = (
        select(User, StudentProfile, Department)
        .outerjoin(
            StudentProfile,
            StudentProfile.user_id == User.id,
        )
        .outerjoin(
            Department,
            Department.id == User.department_id,
        )
        .where(
            User.college_id == current_admin.college_id,
            User.role == UserRole.STUDENT,
        )
    )

    total = await db.scalar(
        select(func.count(User.id)).where(
            User.college_id == current_admin.college_id,
            User.role == UserRole.STUDENT,
        )
    )

    result = await db.execute(
        query
        .order_by(User.created_at.desc())
        .offset((page - 1) * limit)
        .limit(limit)
    )

    items = []

    for user, profile, department in result.all():
        items.append({
            "id": str(user.id),
            "full_name": user.full_name,
            "email": user.email,
            "is_active": user.is_active,
            "is_verified": user.is_verified,
            "department": department.name if department else None,
            "department_id": str(user.department_id) if user.department_id else None,
            "roll_number": profile.roll_number if profile else None,
            "current_semester": profile.current_semester if profile else None,
            "section": profile.section if profile else None,
            "created_at": user.created_at,
        })

    return {
        "items": items,
        "total": total or 0,
        "page": page,
        "limit": limit,
    }


@router.patch(
    "/students/{student_id}/department",
    response_model=StudentDepartmentAssignResponse,
)
async def assign_student_department(
    student_id: UUID,
    department_data: StudentDepartmentAssign,
    current_admin: User = Depends(
        require_role(UserRole.COLLEGE_ADMIN)
    ),
    db: AsyncSession = Depends(get_db),
):
    """
    Assign or update a student's department.
    College Admin can only manage students and departments
    belonging to their own college.
    """

    verify_college_admin(current_admin)

    # Find student within the admin's college.
    student = await db.scalar(
        select(User).where(
            User.id == student_id,
            User.college_id == current_admin.college_id,
            User.role == UserRole.STUDENT,
        )
    )

    if student is None:
        raise HTTPException(
            status_code=404,
            detail="Student not found in your college.",
        )

    # Find an active department within the same college.
    department = await db.scalar(
        select(Department).where(
            Department.id == department_data.department_id,
            Department.college_id == current_admin.college_id,
            Department.is_active.is_(True),
        )
    )

    if department is None:
        raise HTTPException(
            status_code=404,
            detail="Active department not found in your college.",
        )

    # Assign or update department.
    student.department_id = department.id

    await db.commit()
    await db.refresh(student)

    return {
        "message": "Student department assigned successfully.",
        "student_id": student.id,
        "department_id": department.id,
        "department_name": department.name,
    }




@router.get("/documents")
async def list_college_documents(
    page: int = Query(1, ge=1),
    limit: int = Query(20, ge=1, le=100),
    current_admin: User = Depends(
        require_role(UserRole.COLLEGE_ADMIN)
    ),
    db: AsyncSession = Depends(get_db),
):
    """List documents belonging to the admin's college."""

    verify_college_admin(current_admin)

    query = (
        select(Document, User.full_name)
        .outerjoin(User, User.id == Document.uploaded_by)
        .where(Document.college_id == current_admin.college_id)
    )

    total = await db.scalar(
        select(func.count(Document.id)).where(
            Document.college_id == current_admin.college_id
        )
    )

    result = await db.execute(
        query
        .order_by(Document.created_at.desc())
        .offset((page - 1) * limit)
        .limit(limit)
    )

    items = []

    for document, uploaded_by in result.all():
        items.append({
            "id": str(document.id),
            "file_name": document.file_name,
            "file_type": document.file_type,
            "file_size": document.file_size,
            "status": document.status.value,
            "page_count": document.page_count,
            "chunk_count": document.chunk_count,
            "uploaded_by": uploaded_by,
            "created_at": document.created_at,
        })

    return {
        "items": items,
        "total": total or 0,
        "page": page,
        "limit": limit,
    }


@router.delete("/documents/{document_id}")
async def delete_college_document(
    document_id: UUID,
    current_admin: User = Depends(
        require_role(UserRole.COLLEGE_ADMIN)
    ),
    db: AsyncSession = Depends(get_db),
):
    """Delete a document and its associated vector chunks."""

    verify_college_admin(current_admin)

    document = await db.scalar(
        select(Document).where(
            Document.id == document_id,
            Document.college_id == current_admin.college_id,
        )
    )

    if document is None:
        raise HTTPException(
            status_code=404,
            detail="Document not found.",
        )

    storage_root = (
        Path(__file__).resolve().parents[2]
        / "storage"
        / "college_documents"
        / str(current_admin.college_id)
    ).resolve()

    stored_path = Path(document.stored_path).resolve()

    # Ensure the stored file belongs to this college's storage.
    if not stored_path.is_relative_to(storage_root):
        raise HTTPException(
            status_code=400,
            detail="Invalid document storage path.",
        )

    # Commit DB deletion first. PostgreSQL CASCADE removes chunks.
    await db.delete(document)
    await db.commit()

    # Physical file cleanup happens after successful DB deletion.
    try:
        if stored_path.is_file():
            stored_path.unlink()
    except OSError:
        # Database deletion succeeded; file cleanup can be retried.
        pass

    return {
        "message": "Document deleted successfully.",
        "document_id": str(document_id),
    }


# --------------------------------------------------
# DEPARTMENT MANAGEMENT - COLLEGE ADMIN
# --------------------------------------------------


@router.get("/departments")
async def list_college_departments(
    current_admin: User = Depends(
        require_role(UserRole.COLLEGE_ADMIN)
    ),
    db: AsyncSession = Depends(get_db),
):
    """List departments belonging to the admin's college."""

    verify_college_admin(current_admin)

    result = await db.execute(
        select(Department)
        .where(
            Department.college_id == current_admin.college_id
        )
        .order_by(Department.name.asc())
    )

    departments = result.scalars().all()

    return {
        "items": [
            {
                "id": str(department.id),
                "name": department.name,
                "code": department.code,
                "college_id": str(department.college_id),
                "is_active": department.is_active,
            }
            for department in departments
        ],
        "total": len(departments),
    }


@router.post(
    "/departments",
    status_code=201,
    response_model=DepartmentResponse,
)
async def create_department(
    department_data: DepartmentCreate,
    current_admin: User = Depends(
        require_role(UserRole.COLLEGE_ADMIN)
    ),
    db: AsyncSession = Depends(get_db),
):
    """Create a department for the admin's college."""

    verify_college_admin(current_admin)

    code = department_data.code.strip().upper()

    existing = await db.scalar(
        select(Department).where(
            Department.college_id == current_admin.college_id,
            func.lower(Department.code) == code.lower(),
        )
    )

    if existing:
        raise HTTPException(
            status_code=409,
            detail="Department code already exists in your college.",
        )

    department = Department(
        college_id=current_admin.college_id,
        name=department_data.name.strip(),
        code=code,
        is_active=True,
    )

    try:
        db.add(department)
        await db.commit()
        await db.refresh(department)

        return department

    except IntegrityError:
        await db.rollback()
        raise HTTPException(
            status_code=409,
            detail="Department could not be created due to duplicate data.",
        )


@router.put(
    "/departments/{department_id}",
    response_model=DepartmentResponse,
)
async def update_department(
    department_id: UUID,
    department_data: DepartmentUpdate,
    current_admin: User = Depends(
        require_role(UserRole.COLLEGE_ADMIN)
    ),
    db: AsyncSession = Depends(get_db),
):
    """Update a department belonging to the admin's college."""

    verify_college_admin(current_admin)

    department = await db.scalar(
        select(Department).where(
            Department.id == department_id,
            Department.college_id == current_admin.college_id,
        )
    )

    if department is None:
        raise HTTPException(
            status_code=404,
            detail="Department not found.",
        )

    code = department_data.code.strip().upper()

    duplicate = await db.scalar(
        select(Department).where(
            Department.college_id == current_admin.college_id,
            func.lower(Department.code) == code.lower(),
            Department.id != department_id,
        )
    )

    if duplicate:
        raise HTTPException(
            status_code=409,
            detail="Department code already exists in your college.",
        )

    department.name = department_data.name.strip()
    department.code = code

    try:
        await db.commit()
        await db.refresh(department)
        return department

    except IntegrityError:
        await db.rollback()
        raise HTTPException(
            status_code=409,
            detail="Department update failed due to duplicate data.",
        )


@router.patch("/departments/{department_id}/deactivate")
async def deactivate_department(
    department_id: UUID,
    current_admin: User = Depends(
        require_role(UserRole.COLLEGE_ADMIN)
    ),
    db: AsyncSession = Depends(get_db),
):
    """Deactivate a department without deleting its records."""

    verify_college_admin(current_admin)

    department = await db.scalar(
        select(Department).where(
            Department.id == department_id,
            Department.college_id == current_admin.college_id,
        )
    )

    if department is None:
        raise HTTPException(
            status_code=404,
            detail="Department not found.",
        )

    if not department.is_active:
        raise HTTPException(
            status_code=400,
            detail="Department is already inactive.",
        )

    department.is_active = False

    await db.commit()

    return {
        "message": "Department deactivated successfully.",
        "department_id": str(department.id),
    }
