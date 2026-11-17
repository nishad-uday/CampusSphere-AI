import uuid
from pathlib import Path

from fastapi import APIRouter, Depends, File, Form, HTTPException, Query, UploadFile, status
from fastapi.responses import FileResponse
from sqlalchemy import select, or_
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.deps import require_role
from app.database.session import get_db
from app.models import User, UserRole, Department, StudentProfile
from app.models.learning_resource import LearningResource
from app.schemas.learning_resources import LearningResourceResponse, RESOURCE_CATEGORIES

router = APIRouter(prefix="/learning-resources", tags=["Learning Resources"])

MAX_FILE_SIZE = 20 * 1024 * 1024
ALLOWED_EXTENSIONS = {".pdf", ".doc", ".docx", ".ppt", ".pptx", ".txt", ".xls", ".xlsx"}
STORAGE_ROOT = Path(__file__).resolve().parents[2] / "storage" / "learning_resources"

def _response(resource, department_name=None, uploader_name=None):
    return LearningResourceResponse(
        id=resource.id, title=resource.title, description=resource.description,
        subject=resource.subject, category=resource.category,
        department_id=resource.department_id, department_name=department_name,
        semester=resource.semester, file_name=resource.file_name,
        mime_type=resource.mime_type, file_size=resource.file_size,
        uploaded_by=resource.uploaded_by, uploader_name=uploader_name,
        created_at=resource.created_at,
        download_url=f"/api/v1/learning-resources/{resource.id}/download",
    )

async def _get_department_name(db, department_id):
    if not department_id:
        return None
    return await db.scalar(select(Department.name).where(Department.id == department_id))

async def _get_uploader_name(db, uploader_id):
    if not uploader_id:
        return None
    return await db.scalar(select(User.full_name).where(User.id == uploader_id))

async def _check_department(db, department_id, college_id):
    if department_id is None:
        return
    department = await db.scalar(select(Department).where(
        Department.id == department_id,
        Department.college_id == college_id,
        Department.is_active.is_(True),
    ))
    if not department:
        raise HTTPException(status_code=400, detail="Invalid department for your college.")

@router.post("/upload", response_model=LearningResourceResponse, status_code=status.HTTP_201_CREATED)
async def upload_resource(
    title: str = Form(..., min_length=2, max_length=200),
    description: str | None = Form(None),
    subject: str | None = Form(None),
    category: str = Form("notes"),
    department_id: uuid.UUID | None = Form(None),
    semester: int | None = Form(None, ge=1, le=12),
    file: UploadFile = File(...),
    current_user: User = Depends(require_role(UserRole.COLLEGE_ADMIN, UserRole.FACULTY)),
    db: AsyncSession = Depends(get_db),
):
    if not current_user.college_id:
        raise HTTPException(status_code=403, detail="Your account is not associated with a college.")
    if category not in RESOURCE_CATEGORIES:
        raise HTTPException(status_code=400, detail=f"Category must be one of: {', '.join(sorted(RESOURCE_CATEGORIES))}.")
    target_department = department_id
    if current_user.role == UserRole.FACULTY:
        if not current_user.department_id:
            raise HTTPException(status_code=403, detail="Faculty must be assigned to a department.")
        if target_department and target_department != current_user.department_id:
            raise HTTPException(status_code=403, detail="Faculty can upload only to their assigned department.")
        target_department = current_user.department_id
    await _check_department(db, target_department, current_user.college_id)

    original_name = Path(file.filename or "").name
    extension = Path(original_name).suffix.lower()
    if not original_name or extension not in ALLOWED_EXTENSIONS:
        raise HTTPException(status_code=400, detail="Allowed formats: PDF, DOC, DOCX, PPT, PPTX, TXT, XLS and XLSX.")
    content = await file.read(MAX_FILE_SIZE + 1)
    await file.close()
    if not content:
        raise HTTPException(status_code=400, detail="Uploaded file is empty.")
    if len(content) > MAX_FILE_SIZE:
        raise HTTPException(status_code=413, detail="Maximum file size is 20 MB.")

    folder = STORAGE_ROOT / str(current_user.college_id)
    folder.mkdir(parents=True, exist_ok=True)
    saved_path = folder / f"{uuid.uuid4().hex}{extension}"
    saved_path.write_bytes(content)
    resource = LearningResource(
        college_id=current_user.college_id, department_id=target_department,
        uploaded_by=current_user.id, title=title.strip(),
        description=description.strip() if description else None,
        subject=subject.strip() if subject else None, category=category,
        semester=semester, file_name=original_name, stored_path=str(saved_path),
        mime_type=file.content_type or "application/octet-stream", file_size=len(content),
    )
    try:
        db.add(resource)
        await db.commit()
        await db.refresh(resource)
    except Exception:
        await db.rollback()
        saved_path.unlink(missing_ok=True)
        raise
    return _response(resource, await _get_department_name(db, resource.department_id), current_user.full_name)

@router.get("", response_model=list[LearningResourceResponse])
async def list_resources(
    category: str | None = Query(None),
    department_id: uuid.UUID | None = Query(None),
    semester: int | None = Query(None, ge=1, le=12),
    search: str | None = Query(None, max_length=100),
    current_user: User = Depends(require_role(UserRole.STUDENT, UserRole.FACULTY, UserRole.COLLEGE_ADMIN)),
    db: AsyncSession = Depends(get_db),
):
    if not current_user.college_id:
        return []
    query = select(LearningResource, Department.name, User.full_name).outerjoin(
        Department, Department.id == LearningResource.department_id
    ).outerjoin(User, User.id == LearningResource.uploaded_by).where(
        LearningResource.college_id == current_user.college_id
    )
    if current_user.role == UserRole.STUDENT:
        query = query.join(StudentProfile, StudentProfile.user_id == current_user.id).where(
            or_(LearningResource.department_id.is_(None), LearningResource.department_id == current_user.department_id),
            or_(LearningResource.semester.is_(None), LearningResource.semester == StudentProfile.current_semester),
        )
    elif current_user.role == UserRole.FACULTY:
        if not current_user.department_id:
            return []
        query = query.where(
            or_(LearningResource.department_id.is_(None), LearningResource.department_id == current_user.department_id)
        )
    if department_id:
        query = query.where(LearningResource.department_id == department_id)
    if semester:
        query = query.where(LearningResource.semester == semester)
    if category:
        query = query.where(LearningResource.category == category)
    if search and search.strip():
        term = f"%{search.strip()}%"
        query = query.where(or_(LearningResource.title.ilike(term), LearningResource.subject.ilike(term), LearningResource.description.ilike(term)))
    query = query.order_by(LearningResource.created_at.desc())
    rows = (await db.execute(query)).all()
    return [_response(resource, dept_name, uploader_name) for resource, dept_name, uploader_name in rows]

@router.get("/{resource_id}/download")
async def download_resource(
    resource_id: uuid.UUID,
    current_user: User = Depends(require_role(UserRole.STUDENT, UserRole.FACULTY, UserRole.COLLEGE_ADMIN)),
    db: AsyncSession = Depends(get_db),
):
    resource = await db.scalar(select(LearningResource).where(
        LearningResource.id == resource_id,
        LearningResource.college_id == current_user.college_id,
    ))
    if not resource:
        raise HTTPException(status_code=404, detail="Learning resource not found.")
    if current_user.role == UserRole.STUDENT:
        if resource.department_id and resource.department_id != current_user.department_id:
            raise HTTPException(status_code=403, detail="You cannot access this resource.")
        if resource.semester:
            student_semester = await db.scalar(select(StudentProfile.current_semester).where(StudentProfile.user_id == current_user.id))
            if student_semester != resource.semester:
                raise HTTPException(status_code=403, detail="This resource is for a different semester.")
    path = Path(resource.stored_path)
    if not path.is_file():
        raise HTTPException(status_code=404, detail="Resource file is missing from storage.")
    return FileResponse(path, filename=resource.file_name, media_type=resource.mime_type)

@router.delete("/{resource_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_resource(
    resource_id: uuid.UUID,
    current_user: User = Depends(require_role(UserRole.COLLEGE_ADMIN, UserRole.FACULTY)),
    db: AsyncSession = Depends(get_db),
):
    resource = await db.scalar(select(LearningResource).where(
        LearningResource.id == resource_id,
        LearningResource.college_id == current_user.college_id,
    ))
    if not resource:
        raise HTTPException(status_code=404, detail="Learning resource not found.")
    if current_user.role == UserRole.FACULTY and resource.uploaded_by != current_user.id:
        raise HTTPException(status_code=403, detail="Faculty can delete only resources they uploaded.")
    path = Path(resource.stored_path)
    await db.delete(resource)
    await db.commit()
    path.unlink(missing_ok=True)
    return None
