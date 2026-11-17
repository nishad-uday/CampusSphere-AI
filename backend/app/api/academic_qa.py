from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy import func, select, exists
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.deps import require_role
from app.database.session import get_db
from app.models import (
    User,
    UserRole,
    Department,
    AcademicQuestion,
    AcademicAnswer,
    AcademicAnswerLike,
)
from app.schemas.academic_qa import (
    AcademicQuestionCreate,
    AcademicQuestionResponse,
    AcademicQuestionFeedResponse,
    AcademicAnswerCreate,
    AcademicAnswerResponse,
    AcademicAnswerListResponse,
    AcademicLikeResponse,
    AcademicAcceptResponse,
    AcademicDeleteResponse,
)


router = APIRouter(
    prefix="/academic-qa",
    tags=["Academic Q&A"],
)

qa_roles = (
    UserRole.STUDENT,
    UserRole.FACULTY,
)


async def get_accessible_question(
    question_id: UUID,
    current_user: User,
    db: AsyncSession,
) -> AcademicQuestion:
    question = await db.scalar(
        select(AcademicQuestion).where(
            AcademicQuestion.id == question_id,
            AcademicQuestion.college_id == current_user.college_id,
        )
    )

    if not question:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Question not found.",
        )

    return question


# --------------------------------------------------
# CREATE QUESTION
# --------------------------------------------------

@router.post(
    "/questions",
    response_model=AcademicQuestionResponse,
    status_code=status.HTTP_201_CREATED,
)
async def create_question(
    payload: AcademicQuestionCreate,
    current_user: User = Depends(require_role(UserRole.STUDENT)),
    db: AsyncSession = Depends(get_db),
):
    if not current_user.college_id:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Your account is not assigned to a college.",
        )

    department_name = None

    if current_user.department_id:
        department = await db.scalar(
            select(Department).where(
                Department.id == current_user.department_id,
                Department.college_id == current_user.college_id,
                Department.is_active.is_(True),
            )
        )
        if department:
            department_name = department.name

    question = AcademicQuestion(
        user_id=current_user.id,
        college_id=current_user.college_id,
        department_id=current_user.department_id,
        title=payload.title,
        content=payload.content,
    )

    db.add(question)
    await db.commit()
    await db.refresh(question)

    return AcademicQuestionResponse(
        id=question.id,
        user_id=question.user_id,
        author_name=current_user.full_name,
        department_id=question.department_id,
        department_name=department_name,
        title=question.title,
        content=question.content,
        answer_count=0,
        is_resolved=False,
        created_at=question.created_at,
    )


# --------------------------------------------------
# QUESTION FEED
# --------------------------------------------------

@router.get(
    "/questions",
    response_model=AcademicQuestionFeedResponse,
)
async def get_questions(
    skip: int = Query(0, ge=0),
    limit: int = Query(20, ge=1, le=100),
    department_id: UUID | None = Query(None),
    resolved: bool | None = Query(None),
    current_user: User = Depends(require_role(*qa_roles)),
    db: AsyncSession = Depends(get_db),
):
    if not current_user.college_id:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Your account is not assigned to a college.",
        )

    filters = [
        AcademicQuestion.college_id == current_user.college_id
    ]

    if department_id:
        filters.append(
            AcademicQuestion.department_id == department_id
        )

    if resolved is not None:
        filters.append(
            AcademicQuestion.is_resolved.is_(resolved)
        )

    total = await db.scalar(
        select(func.count(AcademicQuestion.id)).where(*filters)
    )

    answer_count_query = (
        select(func.count(AcademicAnswer.id))
        .where(AcademicAnswer.question_id == AcademicQuestion.id)
        .correlate(AcademicQuestion)
        .scalar_subquery()
    )

    result = await db.execute(
        select(
            AcademicQuestion,
            User.full_name,
            Department.name,
            answer_count_query,
        )
        .join(User, User.id == AcademicQuestion.user_id)
        .outerjoin(
            Department,
            Department.id == AcademicQuestion.department_id,
        )
        .where(*filters)
        .order_by(AcademicQuestion.created_at.desc())
        .offset(skip)
        .limit(limit)
    )

    items = []

    for question, author_name, department_name, answer_count in result.all():
        items.append(
            AcademicQuestionResponse(
                id=question.id,
                user_id=question.user_id,
                author_name=author_name,
                department_id=question.department_id,
                department_name=department_name,
                title=question.title,
                content=question.content,
                answer_count=answer_count or 0,
                is_resolved=question.is_resolved,
                created_at=question.created_at,
            )
        )

    return AcademicQuestionFeedResponse(
        items=items,
        total=total or 0,
        skip=skip,
        limit=limit,
    )


# --------------------------------------------------
# GET ANSWERS
# --------------------------------------------------

@router.get(
    "/questions/{question_id}/answers",
    response_model=AcademicAnswerListResponse,
)
async def get_answers(
    question_id: UUID,
    current_user: User = Depends(require_role(*qa_roles)),
    db: AsyncSession = Depends(get_db),
):
    await get_accessible_question(question_id, current_user, db)

    like_count_query = (
        select(func.count(AcademicAnswerLike.id))
        .where(AcademicAnswerLike.answer_id == AcademicAnswer.id)
        .correlate(AcademicAnswer)
        .scalar_subquery()
    )

    liked_query = (
        select(
            exists().where(
                AcademicAnswerLike.answer_id == AcademicAnswer.id,
                AcademicAnswerLike.user_id == current_user.id,
            )
        )
        .correlate(AcademicAnswer)
        .scalar_subquery()
    )

    result = await db.execute(
        select(
            AcademicAnswer,
            User.full_name,
            User.role,
            like_count_query,
            liked_query,
        )
        .join(User, User.id == AcademicAnswer.user_id)
        .where(AcademicAnswer.question_id == question_id)
        .order_by(
            AcademicAnswer.is_accepted.desc(),
            AcademicAnswer.created_at.asc(),
        )
    )

    items = []

    for answer, author_name, author_role, likes, has_liked in result.all():
        items.append(
            AcademicAnswerResponse(
                id=answer.id,
                question_id=answer.question_id,
                user_id=answer.user_id,
                author_name=author_name,
                author_role=author_role.value,
                content=answer.content,
                like_count=likes or 0,
                has_liked=bool(has_liked),
                is_accepted=answer.is_accepted,
                created_at=answer.created_at,
            )
        )

    return AcademicAnswerListResponse(
        items=items,
        total=len(items),
    )


# --------------------------------------------------
# ADD ANSWER
# --------------------------------------------------

@router.post(
    "/questions/{question_id}/answers",
    response_model=AcademicAnswerResponse,
    status_code=status.HTTP_201_CREATED,
)
async def add_answer(
    question_id: UUID,
    payload: AcademicAnswerCreate,
    current_user: User = Depends(require_role(UserRole.FACULTY)),
    db: AsyncSession = Depends(get_db),
):
    question = await get_accessible_question(
        question_id, current_user, db
    )

    if question.is_resolved:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="This question is already resolved.",
        )

    answer = AcademicAnswer(
        question_id=question_id,
        user_id=current_user.id,
        content=payload.content,
    )

    db.add(answer)
    await db.commit()
    await db.refresh(answer)

    return AcademicAnswerResponse(
        id=answer.id,
        question_id=answer.question_id,
        user_id=answer.user_id,
        author_name=current_user.full_name,
        author_role=current_user.role.value,
        content=answer.content,
        like_count=0,
        has_liked=False,
        is_accepted=False,
        created_at=answer.created_at,
    )


# --------------------------------------------------
# UPDATE OWN ANSWER (FACULTY)
# --------------------------------------------------

@router.put(
    "/answers/{answer_id}",
    response_model=AcademicAnswerResponse,
)
async def update_answer(
    answer_id: UUID,
    payload: AcademicAnswerCreate,
    current_user: User = Depends(require_role(UserRole.FACULTY)),
    db: AsyncSession = Depends(get_db),
):
    answer = await db.scalar(
        select(AcademicAnswer)
        .join(
            AcademicQuestion,
            AcademicQuestion.id == AcademicAnswer.question_id,
        )
        .where(
            AcademicAnswer.id == answer_id,
            AcademicQuestion.college_id == current_user.college_id,
        )
    )

    if not answer:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Answer not found.",
        )

    if answer.user_id != current_user.id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="You can edit only your own answers.",
        )

    answer.content = payload.content
    await db.commit()
    await db.refresh(answer)

    like_count = await db.scalar(
        select(func.count(AcademicAnswerLike.id)).where(
            AcademicAnswerLike.answer_id == answer.id
        )
    )
    has_liked = await db.scalar(
        select(
            exists().where(
                AcademicAnswerLike.answer_id == answer.id,
                AcademicAnswerLike.user_id == current_user.id,
            )
        )
    )

    return AcademicAnswerResponse(
        id=answer.id,
        question_id=answer.question_id,
        user_id=answer.user_id,
        author_name=current_user.full_name,
        author_role=current_user.role.value,
        content=answer.content,
        like_count=like_count or 0,
        has_liked=bool(has_liked),
        is_accepted=answer.is_accepted,
        created_at=answer.created_at,
    )


# --------------------------------------------------
# RESOLVE QUESTION (FACULTY)
# --------------------------------------------------

@router.patch("/questions/{question_id}/resolve")
async def resolve_question(
    question_id: UUID,
    current_user: User = Depends(require_role(UserRole.FACULTY)),
    db: AsyncSession = Depends(get_db),
):
    question = await get_accessible_question(
        question_id, current_user, db
    )

    question.is_resolved = True
    await db.commit()

    return {
        "message": "Question marked as resolved.",
        "question_id": str(question.id),
        "is_resolved": True,
    }


# --------------------------------------------------
# REOPEN QUESTION (FACULTY)
# --------------------------------------------------

@router.patch("/questions/{question_id}/reopen")
async def reopen_question(
    question_id: UUID,
    current_user: User = Depends(require_role(UserRole.FACULTY)),
    db: AsyncSession = Depends(get_db),
):
    question = await get_accessible_question(
        question_id, current_user, db
    )

    # Reopening a question also clears any previously accepted answer.
    answers = await db.scalars(
        select(AcademicAnswer).where(
            AcademicAnswer.question_id == question_id
        )
    )
    for answer in answers.all():
        answer.is_accepted = False

    question.is_resolved = False
    await db.commit()

    return {
        "message": "Question reopened successfully.",
        "question_id": str(question.id),
        "is_resolved": False,
    }


# --------------------------------------------------
# LIKE / UNLIKE ANSWER
# --------------------------------------------------

@router.post(
    "/answers/{answer_id}/like",
    response_model=AcademicLikeResponse,
)
async def toggle_answer_like(
    answer_id: UUID,
    current_user: User = Depends(require_role(*qa_roles)),
    db: AsyncSession = Depends(get_db),
):
    answer = await db.scalar(
        select(AcademicAnswer)
        .join(
            AcademicQuestion,
            AcademicQuestion.id == AcademicAnswer.question_id,
        )
        .where(
            AcademicAnswer.id == answer_id,
            AcademicQuestion.college_id == current_user.college_id,
        )
    )

    if not answer:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Answer not found.",
        )

    existing_like = await db.scalar(
        select(AcademicAnswerLike).where(
            AcademicAnswerLike.answer_id == answer_id,
            AcademicAnswerLike.user_id == current_user.id,
        )
    )

    if existing_like:
        await db.delete(existing_like)
        liked = False
        message = "Answer unliked successfully."
    else:
        db.add(
            AcademicAnswerLike(
                answer_id=answer_id,
                user_id=current_user.id,
            )
        )
        liked = True
        message = "Answer liked successfully."

    await db.flush()

    like_count = await db.scalar(
        select(func.count(AcademicAnswerLike.id)).where(
            AcademicAnswerLike.answer_id == answer_id
        )
    )

    await db.commit()

    return AcademicLikeResponse(
        liked=liked,
        like_count=like_count or 0,
        message=message,
    )


# --------------------------------------------------
# ACCEPT ANSWER
# --------------------------------------------------

@router.post(
    "/questions/{question_id}/accept/{answer_id}",
    response_model=AcademicAcceptResponse,
)
async def accept_answer(
    question_id: UUID,
    answer_id: UUID,
    current_user: User = Depends(require_role(UserRole.STUDENT)),
    db: AsyncSession = Depends(get_db),
):
    question = await get_accessible_question(
        question_id, current_user, db
    )

    if question.user_id != current_user.id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Only the question author can accept an answer.",
        )

    answer = await db.scalar(
        select(AcademicAnswer).where(
            AcademicAnswer.id == answer_id,
            AcademicAnswer.question_id == question_id,
        )
    )

    if not answer:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Answer not found for this question.",
        )

    previous_answers = await db.scalars(
        select(AcademicAnswer).where(
            AcademicAnswer.question_id == question_id
        )
    )

    for item in previous_answers.all():
        item.is_accepted = item.id == answer_id

    question.is_resolved = True

    await db.commit()

    return AcademicAcceptResponse(
        message="Answer accepted successfully.",
        question_id=question_id,
        accepted_answer_id=answer_id,
        is_resolved=True,
    )


# --------------------------------------------------
# DELETE OWN QUESTION
# --------------------------------------------------

@router.delete(
    "/questions/{question_id}",
    response_model=AcademicDeleteResponse,
)
async def delete_question(
    question_id: UUID,
    current_user: User = Depends(require_role(*qa_roles)),
    db: AsyncSession = Depends(get_db),
):
    question = await get_accessible_question(
        question_id, current_user, db
    )

    if question.user_id != current_user.id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="You can delete only your own questions.",
        )

    await db.delete(question)
    await db.commit()

    return AcademicDeleteResponse(
        message="Question deleted successfully."
    )


# --------------------------------------------------
# DELETE OWN ANSWER
# --------------------------------------------------

@router.delete(
    "/answers/{answer_id}",
    response_model=AcademicDeleteResponse,
)
async def delete_answer(
    answer_id: UUID,
    current_user: User = Depends(require_role(*qa_roles)),
    db: AsyncSession = Depends(get_db),
):
    answer = await db.scalar(
        select(AcademicAnswer)
        .join(
            AcademicQuestion,
            AcademicQuestion.id == AcademicAnswer.question_id,
        )
        .where(
            AcademicAnswer.id == answer_id,
            AcademicQuestion.college_id == current_user.college_id,
        )
    )

    if not answer:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Answer not found.",
        )

    if answer.user_id != current_user.id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="You can delete only your own answers.",
        )

    if answer.is_accepted:
        question = await db.get(
            AcademicQuestion, answer.question_id
        )
        if question:
            question.is_resolved = False

    await db.delete(answer)
    await db.commit()

    return AcademicDeleteResponse(
        message="Answer deleted successfully."
    )
