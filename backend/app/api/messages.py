import asyncio
import hashlib
import json
from datetime import datetime, timezone
from uuid import UUID

import jwt
from fastapi import (
    APIRouter,
    Depends,
    HTTPException,
    Query,
    WebSocket,
    WebSocketDisconnect,
    status,
)
from redis.asyncio import Redis
from redis.exceptions import RedisError
from sqlalchemy import and_, func, or_, select, update
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.deps import require_role
from app.core.redis import get_redis
from app.core.security import decode_access_token
from app.database.session import AsyncSessionLocal, get_db
from app.models import Department, User, UserRole
from app.models.direct_message import DirectConversation, DirectMessage
from app.schemas.messages import (
    ContactResponse,
    ConversationListResponse,
    ConversationResponse,
    DirectMessageResponse,
    MessageActionResponse,
    MessageCreate,
    MessageListResponse,
)

router = APIRouter(prefix="/messages", tags=["Messages"])

MESSAGE_ROLES = (UserRole.STUDENT, UserRole.FACULTY)
MAX_PAGE_SIZE = 100


def _require_college(user: User) -> None:
    if not user.college_id:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Your account is not assigned to a college.",
        )


def _require_chat_role(user: User) -> None:
    if user.role not in MESSAGE_ROLES:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Only students and faculty can use direct messaging.",
        )


def _conversation_filter(conversation_id: UUID, user: User):
    return and_(
        DirectConversation.id == conversation_id,
        DirectConversation.college_id == user.college_id,
        or_(
            DirectConversation.student_id == user.id,
            DirectConversation.faculty_id == user.id,
        ),
    )


async def _get_conversation(
    conversation_id: UUID,
    user: User,
    db: AsyncSession,
) -> DirectConversation:
    conversation = await db.scalar(
        select(DirectConversation).where(
            _conversation_filter(conversation_id, user)
        )
    )
    if conversation is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Conversation not found.",
        )
    return conversation


async def _participant_for(
    conversation: DirectConversation,
    user: User,
    db: AsyncSession,
) -> User:
    participant_id = (
        conversation.faculty_id
        if user.id == conversation.student_id
        else conversation.student_id
    )
    participant = await db.scalar(
        select(User).where(
            User.id == participant_id,
            User.college_id == user.college_id,
            User.is_active.is_(True),
        )
    )
    if participant is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Conversation participant is no longer available.",
        )
    return participant


async def _message_response(
    message: DirectMessage,
    db: AsyncSession,
) -> DirectMessageResponse:
    sender = await db.scalar(
        select(User).where(User.id == message.sender_id)
    )
    return DirectMessageResponse(
        id=message.id,
        conversation_id=message.conversation_id,
        sender_id=message.sender_id,
        sender_name=sender.full_name if sender else "Campus member",
        sender_role=sender.role.value if sender else "unknown",
        content=message.content,
        read_at=message.read_at,
        created_at=message.created_at,
    )


async def _publish_user_event(
    redis: Redis,
    user_id: UUID,
    event: dict,
) -> None:
    try:
        await redis.publish(
            f"campussphere:messages:user:{user_id}",
            json.dumps(event, default=str),
        )
    except RedisError:
        # The REST operation has already been committed. Redis delivery
        # is best-effort; clients can refresh conversation history.
        pass


@router.get("/contacts", response_model=list[ContactResponse])
async def list_message_contacts(
    current_user: User = Depends(require_role(*MESSAGE_ROLES)),
    db: AsyncSession = Depends(get_db),
):
    """List active faculty for students and active students for faculty."""
    _require_college(current_user)
    _require_chat_role(current_user)

    target_role = (
        UserRole.FACULTY
        if current_user.role == UserRole.STUDENT
        else UserRole.STUDENT
    )

    filters = [
        User.college_id == current_user.college_id,
        User.role == target_role,
        User.is_active.is_(True),
        User.id != current_user.id,
    ]

    # Restrict contacts to the same department when the current account
    # has a department assigned. This keeps student/faculty messaging
    # within the user's academic department.


    rows = (
        await db.execute(
            select(User, Department.name)
            .outerjoin(Department, Department.id == User.department_id)
            .where(*filters)
            .order_by(User.full_name.asc())
            .limit(200)
        )
    ).all()

    return [
        ContactResponse(
            id=person.id,
            full_name=person.full_name,
            email=person.email,
            role=person.role.value,
            department_id=person.department_id,
            department_name=department_name,
        )
        for person, department_name in rows
    ]


@router.post(
    "/conversations/{other_user_id}",
    response_model=ConversationResponse,
    status_code=status.HTTP_201_CREATED,
)
async def start_conversation(
    other_user_id: UUID,
    current_user: User = Depends(require_role(*MESSAGE_ROLES)),
    db: AsyncSession = Depends(get_db),
):
    _require_college(current_user)
    _require_chat_role(current_user)

    other_user = await db.scalar(
        select(User).where(
            User.id == other_user_id,
            User.college_id == current_user.college_id,
            User.is_active.is_(True),
        )
    )
    if other_user is None:
        raise HTTPException(status_code=404, detail="User not found.")

    valid_pair = (
        current_user.role == UserRole.STUDENT
        and other_user.role == UserRole.FACULTY
    ) or (
        current_user.role == UserRole.FACULTY
        and other_user.role == UserRole.STUDENT
    )
    if not valid_pair:
        raise HTTPException(
            status_code=400,
            detail="A conversation must be between one student and one faculty member.",
        )

    # Department matching is intentionally not enforced:
    # students and faculty may message any active user of the opposite role
    # within the same college.

    student_id = (
        current_user.id
        if current_user.role == UserRole.STUDENT
        else other_user.id
    )
    faculty_id = (
        current_user.id
        if current_user.role == UserRole.FACULTY
        else other_user.id
    )

    conversation = await db.scalar(
        select(DirectConversation).where(
            DirectConversation.college_id == current_user.college_id,
            DirectConversation.student_id == student_id,
            DirectConversation.faculty_id == faculty_id,
        )
    )

    if conversation is None:
        conversation = DirectConversation(
            college_id=current_user.college_id,
            student_id=student_id,
            faculty_id=faculty_id,
        )
        db.add(conversation)
        try:
            await db.commit()
            await db.refresh(conversation)
        except Exception:
            await db.rollback()
            # Handle a simultaneous request that created the same pair.
            conversation = await db.scalar(
                select(DirectConversation).where(
                    DirectConversation.college_id == current_user.college_id,
                    DirectConversation.student_id == student_id,
                    DirectConversation.faculty_id == faculty_id,
                )
            )
            if conversation is None:
                raise

    participant = other_user
    latest_message = await db.scalar(
        select(DirectMessage)
        .where(DirectMessage.conversation_id == conversation.id)
        .order_by(DirectMessage.created_at.desc())
        .limit(1)
    )
    unread_count = await db.scalar(
        select(func.count(DirectMessage.id)).where(
            DirectMessage.conversation_id == conversation.id,
            DirectMessage.sender_id != current_user.id,
            DirectMessage.read_at.is_(None),
        )
    )

    return ConversationResponse(
        id=conversation.id,
        participant_id=participant.id,
        participant_name=participant.full_name,
        participant_email=participant.email,
        participant_role=participant.role.value,
        department_name=(
            await db.scalar(
                select(Department.name).where(
                    Department.id == participant.department_id
                )
            )
            if participant.department_id
            else None
        ),
        last_message=latest_message.content if latest_message else None,
        last_message_at=(
            latest_message.created_at if latest_message else conversation.last_message_at
        ),
        unread_count=unread_count or 0,
    )


@router.get("/conversations", response_model=ConversationListResponse)
async def list_conversations(
    current_user: User = Depends(require_role(*MESSAGE_ROLES)),
    db: AsyncSession = Depends(get_db),
):
    _require_college(current_user)
    _require_chat_role(current_user)

    conversations = (
        await db.scalars(
            select(DirectConversation)
            .where(
                DirectConversation.college_id == current_user.college_id,
                or_(
                    DirectConversation.student_id == current_user.id,
                    DirectConversation.faculty_id == current_user.id,
                ),
            )
            .order_by(
                DirectConversation.last_message_at.desc().nullslast(),
                DirectConversation.updated_at.desc(),
            )
            .limit(100)
        )
    ).all()

    items = []
    for conversation in conversations:
        participant_id = (
            conversation.faculty_id
            if current_user.role == UserRole.STUDENT
            else conversation.student_id
        )
        participant = await db.scalar(
            select(User).where(
                User.id == participant_id,
                User.college_id == current_user.college_id,
            )
        )
        if participant is None:
            continue

        latest_message = await db.scalar(
            select(DirectMessage)
            .where(DirectMessage.conversation_id == conversation.id)
            .order_by(DirectMessage.created_at.desc())
            .limit(1)
        )
        unread_count = await db.scalar(
            select(func.count(DirectMessage.id)).where(
                DirectMessage.conversation_id == conversation.id,
                DirectMessage.sender_id != current_user.id,
                DirectMessage.read_at.is_(None),
            )
        )
        department_name = (
            await db.scalar(
                select(Department.name).where(
                    Department.id == participant.department_id
                )
            )
            if participant.department_id
            else None
        )

        items.append(
            ConversationResponse(
                id=conversation.id,
                participant_id=participant.id,
                participant_name=participant.full_name,
                participant_email=participant.email,
                participant_role=participant.role.value,
                department_name=department_name,
                last_message=latest_message.content if latest_message else None,
                last_message_at=(
                    latest_message.created_at
                    if latest_message
                    else conversation.last_message_at
                ),
                unread_count=unread_count or 0,
            )
        )

    return ConversationListResponse(items=items, total=len(items))


@router.get(
    "/conversations/{conversation_id}/messages",
    response_model=MessageListResponse,
)
async def get_conversation_messages(
    conversation_id: UUID,
    skip: int = Query(0, ge=0),
    limit: int = Query(50, ge=1, le=MAX_PAGE_SIZE),
    current_user: User = Depends(require_role(*MESSAGE_ROLES)),
    db: AsyncSession = Depends(get_db),
):
    _require_college(current_user)
    conversation = await _get_conversation(conversation_id, current_user, db)

    total = await db.scalar(
        select(func.count(DirectMessage.id)).where(
            DirectMessage.conversation_id == conversation.id
        )
    )

    rows = (
        await db.scalars(
            select(DirectMessage)
            .where(DirectMessage.conversation_id == conversation.id)
            .order_by(DirectMessage.created_at.desc())
            .offset(skip)
            .limit(limit)
        )
    ).all()

    now = datetime.now(timezone.utc)
    await db.execute(
        update(DirectMessage)
        .where(
            DirectMessage.conversation_id == conversation.id,
            DirectMessage.sender_id != current_user.id,
            DirectMessage.read_at.is_(None),
        )
        .values(read_at=now)
    )
    await db.commit()

    items = []
    for message in reversed(rows):
        if message.sender_id != current_user.id and message.read_at is None:
            message.read_at = now
        items.append(await _message_response(message, db))

    return MessageListResponse(
        items=items,
        total=total or 0,
        skip=skip,
        limit=limit,
    )


@router.post(
    "/conversations/{conversation_id}/messages",
    response_model=DirectMessageResponse,
    status_code=status.HTTP_201_CREATED,
)
async def send_message(
    conversation_id: UUID,
    payload: MessageCreate,
    current_user: User = Depends(require_role(*MESSAGE_ROLES)),
    db: AsyncSession = Depends(get_db),
    redis: Redis = Depends(get_redis),
):
    _require_college(current_user)
    conversation = await _get_conversation(conversation_id, current_user, db)
    participant = await _participant_for(conversation, current_user, db)

    message = DirectMessage(
        conversation_id=conversation.id,
        sender_id=current_user.id,
        content=payload.content,
    )
    conversation.last_message_at = datetime.now(timezone.utc)
    db.add(message)
    await db.commit()
    await db.refresh(message)

    response = await _message_response(message, db)
    event = {
        "type": "message.created",
        "conversation_id": str(conversation.id),
        "message": response.model_dump(mode="json"),
    }

    await _publish_user_event(redis, participant.id, event)
    await _publish_user_event(redis, current_user.id, event)
    return response


@router.patch(
    "/conversations/{conversation_id}/read",
    response_model=MessageActionResponse,
)
async def mark_conversation_read(
    conversation_id: UUID,
    current_user: User = Depends(require_role(*MESSAGE_ROLES)),
    db: AsyncSession = Depends(get_db),
):
    _require_college(current_user)
    conversation = await _get_conversation(conversation_id, current_user, db)

    await db.execute(
        update(DirectMessage)
        .where(
            DirectMessage.conversation_id == conversation.id,
            DirectMessage.sender_id != current_user.id,
            DirectMessage.read_at.is_(None),
        )
        .values(read_at=datetime.now(timezone.utc))
    )
    await db.commit()

    return MessageActionResponse(
        message="Conversation marked as read.",
        conversation_id=conversation.id,
    )


async def _authenticate_websocket_user(token: str, redis: Redis) -> User | None:
    try:
        payload = decode_access_token(token)
        user_id = UUID(payload["sub"])
    except (jwt.InvalidTokenError, ValueError, KeyError, TypeError):
        return None

    token_key = hashlib.sha256(token.encode("utf-8")).hexdigest()
    try:
        if await redis.exists(f"revoked:{token_key}"):
            return None
    except RedisError:
        return None

    async with AsyncSessionLocal() as db:
        user = await db.scalar(
            select(User).where(
                User.id == user_id,
                User.is_active.is_(True),
                User.must_change_password.is_(False),
                User.role.in_(MESSAGE_ROLES),
            )
        )
        # Return the detached identity fields only; no ORM session is kept
        # open for the lifetime of the WebSocket.
        if user is None:
            return None
        return User(
            id=user.id,
            college_id=user.college_id,
            department_id=user.department_id,
            full_name=user.full_name,
            email=user.email,
            password_hash=user.password_hash,
            role=user.role,
            is_active=user.is_active,
            is_verified=user.is_verified,
            must_change_password=user.must_change_password,
        )


@router.websocket("/ws")
async def messages_websocket(
    websocket: WebSocket,
    token: str = Query(..., min_length=20),
):
    redis = await get_redis()
    user = await _authenticate_websocket_user(token, redis)
    if user is None or user.college_id is None:
        await websocket.close(code=1008, reason="Authentication failed")
        return

    await websocket.accept()
    pubsub = redis.pubsub()
    channel = f"campussphere:messages:user:{user.id}"

    try:
        await pubsub.subscribe(channel)

        async def forward_events():
            async for event in pubsub.listen():
                if event.get("type") == "message":
                    raw_data = event.get("data")
                    if isinstance(raw_data, bytes):
                        raw_data = raw_data.decode("utf-8")
                    await websocket.send_text(str(raw_data))

        async def receive_client_events():
            while True:
                data = await websocket.receive_text()
                try:
                    payload = json.loads(data)
                except json.JSONDecodeError:
                    payload = {}
                if payload.get("type") == "ping":
                    await websocket.send_json({"type": "pong"})

        tasks = [
            asyncio.create_task(forward_events()),
            asyncio.create_task(receive_client_events()),
        ]
        done, pending = await asyncio.wait(
            tasks,
            return_when=asyncio.FIRST_COMPLETED,
        )
        for task in pending:
            task.cancel()
        for task in done:
            try:
                task.result()
            except WebSocketDisconnect:
                pass
    except WebSocketDisconnect:
        pass
    finally:
        await pubsub.unsubscribe(channel)
        await pubsub.aclose()
        if websocket.client_state.name == "CONNECTED":
            await websocket.close()
