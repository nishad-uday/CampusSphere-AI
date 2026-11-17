
from datetime import datetime, timezone
from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.deps import require_role
from app.database.session import get_db
from app.models import Notice, User, UserRole
from app.schemas.notices import (
    NoticeCreate,
    NoticeUpdate,
    NoticeResponse,
    NoticeListResponse,
    NoticeActionResponse,
)

router = APIRouter(
    prefix="/notices",
    tags=["Notices & Announcements"],
)

# Faculty and Students can read published notices.
student_faculty = (
    UserRole.STUDENT,
    UserRole.FACULTY,
)

# Faculty and College Admin can manage notices.
notice_managers = (
    UserRole.COLLEGE_ADMIN,
    UserRole.FACULTY,
)


def _require_college(user: User):
    if not user.college_id:
        raise HTTPException(
            status_code=400,
            detail="Your account is not assigned to a college.",
        )


async def _get_notice(
    notice_id: UUID,
    college_id: UUID,
    db: AsyncSession,
) -> Notice:
    notice = await db.scalar(
        select(Notice).where(
            Notice.id == notice_id,
            Notice.college_id == college_id,
        )
    )

    if notice is None:
        raise HTTPException(
            status_code=404,
            detail="Notice not found.",
        )

    return notice


async def _response(
    notice: Notice,
    db: AsyncSession,
) -> NoticeResponse:
    author = await db.scalar(
        select(User.full_name).where(
            User.id == notice.created_by
        )
    )

    return NoticeResponse(
        id=notice.id,
        college_id=notice.college_id,
        created_by=notice.created_by,
        author_name=author or "College Admin",
        title=notice.title,
        content=notice.content,
        category=notice.category,
        priority=notice.priority,
        is_published=notice.is_published,
        published_at=notice.published_at,
        expires_at=notice.expires_at,
        created_at=notice.created_at,
        updated_at=notice.updated_at,
    )


# =====================================================
# FACULTY + COLLEGE ADMIN MANAGEMENT ENDPOINTS
# =====================================================


# CREATE NOTICE
@router.post(
    "",
    response_model=NoticeResponse,
    status_code=status.HTTP_201_CREATED,
)
async def create_notice(
    payload: NoticeCreate,
    current_user: User = Depends(
        require_role(*notice_managers)
    ),
    db: AsyncSession = Depends(get_db),
):
    _require_college(current_user)

    now = datetime.now(timezone.utc)

    if payload.expires_at and payload.expires_at <= now:
        raise HTTPException(
            status_code=400,
            detail="Expiry date must be in the future.",
        )

    notice = Notice(
        college_id=current_user.college_id,
        created_by=current_user.id,
        title=payload.title,
        content=payload.content,
        category=payload.category,
        priority=payload.priority,
        is_published=payload.is_published,
        published_at=now if payload.is_published else None,
        expires_at=payload.expires_at,
    )

    db.add(notice)

    await db.commit()
    await db.refresh(notice)

    return await _response(notice, db)


# LIST ALL NOTICES FOR FACULTY AND COLLEGE ADMIN
@router.get(
    "/admin",
    response_model=NoticeListResponse,
)
async def list_admin_notices(
    skip: int = Query(0, ge=0),
    limit: int = Query(20, ge=1, le=100),
    current_user: User = Depends(
        require_role(*notice_managers)
    ),
    db: AsyncSession = Depends(get_db),
):
    _require_college(current_user)

    query = select(Notice).where(
        Notice.college_id == current_user.college_id
    )

    total = await db.scalar(
        select(func.count(Notice.id)).where(
            Notice.college_id == current_user.college_id
        )
    )

    rows = (
        await db.scalars(
            query.order_by(
                Notice.created_at.desc()
            )
            .offset(skip)
            .limit(limit)
        )
    ).all()

    return NoticeListResponse(
        items=[
            await _response(notice, db)
            for notice in rows
        ],
        total=total or 0,
        skip=skip,
        limit=limit,
    )


# UPDATE NOTICE
@router.put(
    "/{notice_id}",
    response_model=NoticeResponse,
)
async def update_notice(
    notice_id: UUID,
    payload: NoticeUpdate,
    current_user: User = Depends(
        require_role(*notice_managers)
    ),
    db: AsyncSession = Depends(get_db),
):
    _require_college(current_user)

    notice = await _get_notice(
        notice_id,
        current_user.college_id,
        db,
    )

    now = datetime.now(timezone.utc)

    if payload.expires_at and payload.expires_at <= now:
        raise HTTPException(
            status_code=400,
            detail="Expiry date must be in the future.",
        )

    was_published = notice.is_published

    for field in (
        "title",
        "content",
        "category",
        "priority",
        "is_published",
        "expires_at",
    ):
        setattr(
            notice,
            field,
            getattr(payload, field),
        )

    if notice.is_published and not was_published:
        notice.published_at = now

    elif not notice.is_published:
        notice.published_at = None

    await db.commit()
    await db.refresh(notice)

    return await _response(notice, db)


# PUBLISH / UNPUBLISH NOTICE
@router.patch(
    "/{notice_id}/publish",
    response_model=NoticeResponse,
)
async def toggle_publish(
    notice_id: UUID,
    current_user: User = Depends(
        require_role(*notice_managers)
    ),
    db: AsyncSession = Depends(get_db),
):
    _require_college(current_user)

    notice = await _get_notice(
        notice_id,
        current_user.college_id,
        db,
    )

    notice.is_published = not notice.is_published

    notice.published_at = (
        datetime.now(timezone.utc)
        if notice.is_published
        else None
    )

    await db.commit()
    await db.refresh(notice)

    return await _response(notice, db)


# DELETE NOTICE
@router.delete(
    "/{notice_id}",
    response_model=NoticeActionResponse,
)
async def delete_notice(
    notice_id: UUID,
    current_user: User = Depends(
        require_role(*notice_managers)
    ),
    db: AsyncSession = Depends(get_db),
):
    _require_college(current_user)

    notice = await _get_notice(
        notice_id,
        current_user.college_id,
        db,
    )

    await db.delete(notice)
    await db.commit()

    return NoticeActionResponse(
        message="Notice deleted successfully.",
        notice_id=notice_id,
    )


# =====================================================
# STUDENT + FACULTY READ-ONLY PUBLISHED NOTICE FEED
# =====================================================


# LIST PUBLISHED NOTICES
@router.get(
    "",
    response_model=NoticeListResponse,
)
async def list_published_notices(
    skip: int = Query(0, ge=0),
    limit: int = Query(20, ge=1, le=100),
    category: str | None = Query(None, max_length=50),
    current_user: User = Depends(
        require_role(*student_faculty)
    ),
    db: AsyncSession = Depends(get_db),
):
    _require_college(current_user)

    now = datetime.now(timezone.utc)

    filters = [
        Notice.college_id == current_user.college_id,
        Notice.is_published.is_(True),
        (
            Notice.expires_at.is_(None)
            | (Notice.expires_at > now)
        ),
    ]

    if category:
        filters.append(
            Notice.category == category
        )

    total = await db.scalar(
        select(func.count(Notice.id)).where(
            *filters
        )
    )

    rows = (
        await db.scalars(
            select(Notice)
            .where(*filters)
            .order_by(
                Notice.priority.desc(),
                Notice.published_at.desc(),
            )
            .offset(skip)
            .limit(limit)
        )
    ).all()

    return NoticeListResponse(
        items=[
            await _response(notice, db)
            for notice in rows
        ],
        total=total or 0,
        skip=skip,
        limit=limit,
    )


# GET SINGLE PUBLISHED NOTICE
@router.get(
    "/{notice_id}",
    response_model=NoticeResponse,
)
async def get_published_notice(
    notice_id: UUID,
    current_user: User = Depends(
        require_role(*student_faculty)
    ),
    db: AsyncSession = Depends(get_db),
):
    _require_college(current_user)

    notice = await _get_notice(
        notice_id,
        current_user.college_id,
        db,
    )

    now = datetime.now(timezone.utc)

    if (
        not notice.is_published
        or (
            notice.expires_at
            and notice.expires_at <= now
        )
    ):
        raise HTTPException(
            status_code=404,
            detail="Notice not found.",
        )

    return await _response(notice, db)
