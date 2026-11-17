
import uuid

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy import select, desc, delete
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.deps import require_role
from app.database.session import get_db
from app.models import User, UserRole
from app.models.chat import AssistantChat
from app.models.assistant_message import (
    AssistantMessage,
    MessageRole,
)
from app.schemas.assistant import (
    AssistantAskRequest,
    AssistantAskResponse,
    AssistantChatSummary,
    AssistantMessageResponse,
)
from app.services.rag_service import ask_campus_assistant


router = APIRouter(
    prefix="/assistant",
    tags=["AI Assistant"],
)

MAX_HISTORY_MESSAGES = 10
ASSISTANT_ROLES = (UserRole.STUDENT, UserRole.FACULTY)


# --------------------------------------------------
# Helper: Verify authenticated user's college association
# --------------------------------------------------

def get_user_college_id(current_user: User) -> uuid.UUID:
    if current_user.college_id is None:
        raise HTTPException(
            status_code=403,
            detail="Your account is not associated with a college.",
        )

    return current_user.college_id


# --------------------------------------------------
# Helper: Get conversation history
# --------------------------------------------------

async def get_conversation_history(
    db: AsyncSession,
    chat_id: uuid.UUID,
    user_id: uuid.UUID,
    college_id: uuid.UUID,
) -> list[dict]:

    result = await db.execute(
        select(AssistantMessage)
        .where(
            AssistantMessage.chat_id == chat_id,
            AssistantMessage.user_id == user_id,
            AssistantMessage.college_id == college_id,
        )
        .order_by(desc(AssistantMessage.created_at))
        .limit(MAX_HISTORY_MESSAGES)
    )

    recent_messages = list(result.scalars().all())
    recent_messages.reverse()

    return [
        {
            "role": message.role.value,
            "content": message.content,
        }
        for message in recent_messages
    ]


# --------------------------------------------------
# POST: Ask CampusSphere AI
# --------------------------------------------------

@router.post(
    "/ask",
    response_model=AssistantAskResponse,
)
async def ask_assistant(
    request: AssistantAskRequest,
    current_user: User = Depends(
        require_role(*ASSISTANT_ROLES)
    ),
    db: AsyncSession = Depends(get_db),
):

    college_id = get_user_college_id(current_user)

    question = request.question.strip()

    if not question:
        raise HTTPException(
            status_code=422,
            detail="Question cannot be empty.",
        )

    try:

        # Find existing chat or create a new one
        if request.chat_id:

            result = await db.execute(
                select(AssistantChat).where(
                    AssistantChat.id == request.chat_id,
                    AssistantChat.user_id == current_user.id,
                    AssistantChat.college_id == college_id,
                    AssistantChat.is_active.is_(True),
                )
            )

            chat = result.scalar_one_or_none()

            if chat is None:
                raise HTTPException(
                    status_code=404,
                    detail="Chat not found.",
                )

        else:

            chat = AssistantChat(
                college_id=college_id,
                user_id=current_user.id,
                title=question[:200],
            )

            db.add(chat)
            await db.flush()

        # Load previous conversation messages
        conversation_history = await get_conversation_history(
            db=db,
            chat_id=chat.id,
            user_id=current_user.id,
            college_id=college_id,
        )

        print(
            f"[ASSISTANT] Loaded "
            f"{len(conversation_history)} previous messages.",
            flush=True,
        )

        # Save the authenticated user's question
        user_message = AssistantMessage(
            chat_id=chat.id,
            college_id=college_id,
            user_id=current_user.id,
            role=MessageRole.USER,
            content=question,
        )

        db.add(user_message)
        await db.flush()

        # Generate AI response
        rag_result = await ask_campus_assistant(
            db=db,
            college_id=college_id,
            question=question,
            conversation_history=conversation_history,
        )

        answer = rag_result["answer"]
        sources = rag_result["sources"]
        response_mode = rag_result.get("mode", "general")

        print(
            f"[ASSISTANT] Response generated "
            f"using {response_mode} mode.",
            flush=True,
        )

        # Save AI response
        assistant_message = AssistantMessage(
            chat_id=chat.id,
            college_id=college_id,
            user_id=current_user.id,
            role=MessageRole.ASSISTANT,
            content=answer,
            sources=sources,
            model_name=f"Gemini Hybrid AI ({response_mode})",
        )

        db.add(assistant_message)

        # Commit transaction
        await db.commit()

        await db.refresh(user_message)
        await db.refresh(assistant_message)

        return AssistantAskResponse(
            chat_id=chat.id,
            question_message_id=user_message.id,
            answer_message_id=assistant_message.id,
            question=question,
            answer=answer,
            sources=sources,
            created_at=assistant_message.created_at,
        )

    except HTTPException:
        await db.rollback()
        raise

    except Exception as exc:
        await db.rollback()

        print(
            f"[ASSISTANT] Error: {exc}",
            flush=True,
        )

        raise HTTPException(
            status_code=500,
            detail="Unable to generate assistant response.",
        ) from exc


# --------------------------------------------------
# GET: Get all conversations for the authenticated user
# --------------------------------------------------

@router.get(
    "/chats",
    response_model=list[AssistantChatSummary],
)
async def get_my_chats(
    current_user: User = Depends(
        require_role(*ASSISTANT_ROLES)
    ),
    db: AsyncSession = Depends(get_db),
):

    college_id = get_user_college_id(current_user)

    result = await db.execute(
        select(AssistantChat)
        .where(
            AssistantChat.user_id == current_user.id,
            AssistantChat.college_id == college_id,
            AssistantChat.is_active.is_(True),
        )
        .order_by(desc(AssistantChat.created_at))
    )

    return result.scalars().all()


# --------------------------------------------------
# GET: Get messages of selected conversation
# --------------------------------------------------

@router.get(
    "/chats/{chat_id}/messages",
    response_model=list[AssistantMessageResponse],
)
async def get_chat_messages(
    chat_id: uuid.UUID,
    current_user: User = Depends(
        require_role(*ASSISTANT_ROLES)
    ),
    db: AsyncSession = Depends(get_db),
):

    college_id = get_user_college_id(current_user)

    chat_result = await db.execute(
        select(AssistantChat).where(
            AssistantChat.id == chat_id,
            AssistantChat.user_id == current_user.id,
            AssistantChat.college_id == college_id,
            AssistantChat.is_active.is_(True),
        )
    )

    chat = chat_result.scalar_one_or_none()

    if chat is None:
        raise HTTPException(
            status_code=404,
            detail="Chat not found.",
        )

    result = await db.execute(
        select(AssistantMessage)
        .where(
            AssistantMessage.chat_id == chat_id,
            AssistantMessage.user_id == current_user.id,
            AssistantMessage.college_id == college_id,
        )
        .order_by(AssistantMessage.created_at)
    )

    return result.scalars().all()


# --------------------------------------------------
# DELETE: Delete selected conversation
# --------------------------------------------------

@router.delete(
    "/chats/{chat_id}",
    status_code=200,
)
async def delete_chat(
    chat_id: uuid.UUID,
    current_user: User = Depends(
        require_role(*ASSISTANT_ROLES)
    ),
    db: AsyncSession = Depends(get_db),
):

    college_id = get_user_college_id(current_user)

    # Verify conversation ownership
    result = await db.execute(
        select(AssistantChat).where(
            AssistantChat.id == chat_id,
            AssistantChat.user_id == current_user.id,
            AssistantChat.college_id == college_id,
            AssistantChat.is_active.is_(True),
        )
    )

    chat = result.scalar_one_or_none()

    if chat is None:
        raise HTTPException(
            status_code=404,
            detail="Chat not found.",
        )

    try:

        # Delete all messages belonging to this conversation
        await db.execute(
            delete(AssistantMessage).where(
                AssistantMessage.chat_id == chat_id,
                AssistantMessage.user_id == current_user.id,
                AssistantMessage.college_id == college_id,
            )
        )

        # Delete the conversation
        await db.delete(chat)

        await db.commit()

        return {
            "message": "Conversation deleted successfully."
        }

    except Exception as exc:

        await db.rollback()

        print(
            f"[ASSISTANT] Chat deletion error: {exc}",
            flush=True,
        )

        raise HTTPException(
            status_code=500,
            detail="Unable to delete this conversation.",
        ) from exc
