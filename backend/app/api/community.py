
from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy import func, select, exists
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.deps import require_role
from app.database.session import get_db
from app.models import (
    User,
    UserRole,
    CommunityPost,
    CommunityLike,
    CommunityComment,
)
from app.schemas.community import (
    CommunityPostCreate,
    CommunityPostResponse,
    CommunityFeedResponse,
    CommunityCommentCreate,
    CommunityCommentResponse,
    CommunityCommentListResponse,
    CommunityLikeResponse,
)


router = APIRouter(
    prefix="/community",
    tags=["Student Community"],
)

community_roles = (
    UserRole.STUDENT,
    UserRole.FACULTY,
)


async def get_accessible_post(
    post_id: UUID,
    current_user: User,
    db: AsyncSession,
) -> CommunityPost:
    post = await db.scalar(
        select(CommunityPost).where(
            CommunityPost.id == post_id,
            CommunityPost.college_id == current_user.college_id,
        )
    )

    if not post:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Community post not found.",
        )

    return post


# --------------------------------------------------
# CREATE POST
# --------------------------------------------------

@router.post(
    "/posts",
    response_model=CommunityPostResponse,
    status_code=status.HTTP_201_CREATED,
)
async def create_post(
    payload: CommunityPostCreate,
    current_user: User = Depends(
        require_role(*community_roles)
    ),
    db: AsyncSession = Depends(get_db),
):
    if not current_user.college_id:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Your account is not assigned to a college.",
        )

    post = CommunityPost(
        user_id=current_user.id,
        college_id=current_user.college_id,
        content=payload.content,
    )

    db.add(post)
    await db.commit()
    await db.refresh(post)

    return CommunityPostResponse(
        id=post.id,
        user_id=post.user_id,
        author_name=current_user.full_name,
        content=post.content,
        like_count=0,
        comment_count=0,
        has_liked=False,
        created_at=post.created_at,
    )


# --------------------------------------------------
# COMMUNITY FEED
# --------------------------------------------------

@router.get(
    "/posts",
    response_model=CommunityFeedResponse,
)
async def get_community_feed(
    skip: int = Query(0, ge=0),
    limit: int = Query(20, ge=1, le=100),
    current_user: User = Depends(
        require_role(*community_roles)
    ),
    db: AsyncSession = Depends(get_db),
):
    if not current_user.college_id:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Your account is not assigned to a college.",
        )

    base_filter = (
        CommunityPost.college_id == current_user.college_id
    )

    total = await db.scalar(
        select(func.count(CommunityPost.id)).where(base_filter)
    )

    like_count_query = (
        select(func.count(CommunityLike.id))
        .where(CommunityLike.post_id == CommunityPost.id)
        .correlate(CommunityPost)
        .scalar_subquery()
    )

    comment_count_query = (
        select(func.count(CommunityComment.id))
        .where(CommunityComment.post_id == CommunityPost.id)
        .correlate(CommunityPost)
        .scalar_subquery()
    )

    liked_query = (
        select(
            exists().where(
                CommunityLike.post_id == CommunityPost.id,
                CommunityLike.user_id == current_user.id,
            )
        )
        .correlate(CommunityPost)
        .scalar_subquery()
    )

    result = await db.execute(
        select(
            CommunityPost,
            User.full_name,
            like_count_query,
            comment_count_query,
            liked_query,
        )
        .join(User, User.id == CommunityPost.user_id)
        .where(base_filter)
        .order_by(CommunityPost.created_at.desc())
        .offset(skip)
        .limit(limit)
    )

    items = []

    for post, author_name, likes, comments, has_liked in result.all():
        items.append(
            CommunityPostResponse(
                id=post.id,
                user_id=post.user_id,
                author_name=author_name,
                content=post.content,
                like_count=likes or 0,
                comment_count=comments or 0,
                has_liked=bool(has_liked),
                created_at=post.created_at,
            )
        )

    return CommunityFeedResponse(
        items=items,
        total=total or 0,
        skip=skip,
        limit=limit,
    )


# --------------------------------------------------
# LIKE / UNLIKE POST
# --------------------------------------------------

@router.post(
    "/posts/{post_id}/like",
    response_model=CommunityLikeResponse,
)
async def toggle_like(
    post_id: UUID,
    current_user: User = Depends(
        require_role(*community_roles)
    ),
    db: AsyncSession = Depends(get_db),
):
    await get_accessible_post(post_id, current_user, db)

    existing_like = await db.scalar(
        select(CommunityLike).where(
            CommunityLike.post_id == post_id,
            CommunityLike.user_id == current_user.id,
        )
    )

    if existing_like:
        await db.delete(existing_like)
        liked = False
        message = "Post unliked successfully."
    else:
        db.add(
            CommunityLike(
                post_id=post_id,
                user_id=current_user.id,
            )
        )
        liked = True
        message = "Post liked successfully."

    await db.flush()

    like_count = await db.scalar(
        select(func.count(CommunityLike.id)).where(
            CommunityLike.post_id == post_id
        )
    )

    await db.commit()

    return CommunityLikeResponse(
        liked=liked,
        like_count=like_count or 0,
        message=message,
    )


# --------------------------------------------------
# GET COMMENTS
# --------------------------------------------------

@router.get(
    "/posts/{post_id}/comments",
    response_model=CommunityCommentListResponse,
)
async def get_comments(
    post_id: UUID,
    current_user: User = Depends(
        require_role(*community_roles)
    ),
    db: AsyncSession = Depends(get_db),
):
    await get_accessible_post(post_id, current_user, db)

    result = await db.execute(
        select(CommunityComment, User.full_name)
        .join(User, User.id == CommunityComment.user_id)
        .where(CommunityComment.post_id == post_id)
        .order_by(CommunityComment.created_at.asc())
    )

    rows = result.all()

    items = [
        CommunityCommentResponse(
            id=comment.id,
            post_id=comment.post_id,
            user_id=comment.user_id,
            author_name=author_name,
            content=comment.content,
            created_at=comment.created_at,
        )
        for comment, author_name in rows
    ]

    return CommunityCommentListResponse(
        items=items,
        total=len(items),
    )


# --------------------------------------------------
# ADD COMMENT
# --------------------------------------------------

@router.post(
    "/posts/{post_id}/comments",
    response_model=CommunityCommentResponse,
    status_code=status.HTTP_201_CREATED,
)
async def add_comment(
    post_id: UUID,
    payload: CommunityCommentCreate,
    current_user: User = Depends(
        require_role(*community_roles)
    ),
    db: AsyncSession = Depends(get_db),
):
    await get_accessible_post(post_id, current_user, db)

    comment = CommunityComment(
        post_id=post_id,
        user_id=current_user.id,
        content=payload.content,
    )

    db.add(comment)
    await db.commit()
    await db.refresh(comment)

    return CommunityCommentResponse(
        id=comment.id,
        post_id=comment.post_id,
        user_id=comment.user_id,
        author_name=current_user.full_name,
        content=comment.content,
        created_at=comment.created_at,
    )


# --------------------------------------------------
# DELETE OWN POST
# --------------------------------------------------

@router.delete("/posts/{post_id}")
async def delete_post(
    post_id: UUID,
    current_user: User = Depends(
        require_role(*community_roles)
    ),
    db: AsyncSession = Depends(get_db),
):
    post = await get_accessible_post(post_id, current_user, db)

    if post.user_id != current_user.id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="You can delete only your own posts.",
        )

    await db.delete(post)
    await db.commit()

    return {"message": "Post deleted successfully."}


# --------------------------------------------------
# DELETE OWN COMMENT
# --------------------------------------------------

@router.delete("/comments/{comment_id}")
async def delete_comment(
    comment_id: UUID,
    current_user: User = Depends(
        require_role(*community_roles)
    ),
    db: AsyncSession = Depends(get_db),
):
    comment = await db.scalar(
        select(CommunityComment)
        .join(
            CommunityPost,
            CommunityPost.id == CommunityComment.post_id,
        )
        .where(
            CommunityComment.id == comment_id,
            CommunityPost.college_id == current_user.college_id,
        )
    )

    if not comment:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Comment not found.",
        )

    if comment.user_id != current_user.id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="You can delete only your own comments.",
        )

    await db.delete(comment)
    await db.commit()

    return {"message": "Comment deleted successfully."}
