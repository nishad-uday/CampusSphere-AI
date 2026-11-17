
import re
import uuid

from sqlalchemy.ext.asyncio import AsyncSession

from app.services.retrieval_service import search_relevant_chunks
from app.services.llm_service import (
    generate_general_answer,
    generate_rag_answer,
)


# ============================================================
# 1. COLLEGE CONTEXT PATTERNS
# ============================================================

# Questions referring to the user's own college,
# university, college policies, notices and administration.

COLLEGE_CONTEXT_PATTERNS = [
    # English
    r"\bmy college\b",
    r"\bour college\b",
    r"\bthis college\b",
    r"\bin my college\b",
    r"\bat my college\b",
    r"\bcollege document(s)?\b",
    r"\bcollege notice(s)?\b",
    r"\bcollege rules?\b",
    r"\bcollege polic(y|ies)\b",
    r"\bcollege timetable\b",
    r"\bcollege exam(s)?\b",
    r"\bcollege fee(s)?\b",
    r"\bcollege admission\b",
    r"\bcollege syllabus\b",
    r"\buniversity notice(s)?\b",
    r"\buniversity rules?\b",
    r"\buniversity polic(y|ies)\b",
    r"\bCSVTU\b",
    r"\bRIT Raipur\b",

    # Hindi / Hinglish
    r"\bmera college\b",
    r"\bmeri college\b",
    r"\bhamara college\b",
    r"\bhamare college\b",
    r"\bapne college\b",
    r"\bcollege ki fees\b",
    r"\bcollege ka fee\b",
    r"\bcollege ka notice\b",
    r"\bcollege ke notice\b",
    r"\bcollege ka rule\b",
    r"\bcollege ke rules\b",
    r"\bcollege ka timetable\b",
    r"\bcollege ki timetable\b",
    r"\bcollege ka exam\b",
    r"\bcollege ka syllabus\b",
    r"\buniversity ka notice\b",
    r"\bcollege mein\b",
]


# ============================================================
# 2. ACADEMIC DOCUMENT PATTERNS
# ============================================================

# Academic questions that generally require information
# from college-uploaded documents.

ACADEMIC_DOCUMENT_PATTERNS = [
    # Syllabus and subjects
    r"\bmy syllabus\b",
    r"\bsemester syllabus\b",
    r"\bsyllabus\b",
    r"\bsubject(s)? in (my|the) semester\b",
    r"\bsubject(s)? in (my|the) course\b",
    r"\bsubject list\b",
    r"\bsubject code\b",
    r"\bcourse objective(s)?\b",


    # Course credits and academic structure
    r"\bcredits?\b",
    r"\bcredit structure\b",
    r"\bhow many credits\b",
    r"\btotal credits\b",
    r"\bsubject credits?\b",
    r"\bcourse credits?\b",
    r"\bcredit distribution\b",
    r"\blecture hours?\b",
    r"\bL\s*:\s*\d+.*T\s*:\s*\d+",
    r"\bcourse code\b",
    r"\bsubject code\b",
    r"\bcourse structure\b",
    r"\bsubject details\b",
    r"\bsubject information\b",
    r"\bmarks distribution\b",
    r"\bmaximum marks\b",
    r"\bminimum marks\b",


    # Semester references
    r"\b1st semester\b",
    r"\b2nd semester\b",
    r"\b3rd semester\b",
    r"\b4th semester\b",
    r"\b5th semester\b",
    r"\b6th semester\b",
    r"\b7th semester\b",
    r"\b8th semester\b",

    r"\bsemester\s*[1-8]\b",
    r"\b[1-8](st|nd|rd|th)\s*sem(ester)?\b",
    r"\bsem\s*[1-8]\b",

    # Unit references
    r"\bunit\s*[1-5ivx]+\b",
    r"\bunit[- ]wise\b",
    r"\ball units\b",

    # Examinations
    r"\bexam pattern\b",
    r"\bexam timetable\b",
    r"\bexamination schedule\b",
    r"\bexam date(s)?\b",
    r"\bexam syllabus\b",
    r"\binternal marks\b",
    r"\bpractical exam\b",

    # Academic schedule
    r"\bclass timetable\b",
    r"\bacademic calendar\b",
    r"\battendance requirement\b",
    r"\battendance criteria\b",
    r"\bclass schedule\b",

    # Practical and project documents
    r"\bpractical list\b",
    r"\bpractical file\b",
    r"\blab manual\b",
    r"\bexperiment list\b",
    r"\bproject guidelines\b",
    r"\bproject submission\b",
    r"\bproject deadline\b",

    # Hindi / Hinglish
    r"\bmera syllabus\b",
    r"\bmeri syllabus\b",
    r"\bsemester ka syllabus\b",
    r"\bsemester ke subjects\b",
    r"\bunit\s*[1-5]\s*ke\b",
    r"\bexam kab hai\b",
    r"\bexam ki date\b",
    r"\bpractical ki list\b",
    r"\bpractical file ke\b",
    r"\binternal marks kab\b",
    r"\battendance kitni\b",
    r"\bclass ka timetable\b",
]


# ============================================================
# 3. FOLLOW-UP QUESTION PATTERNS
# ============================================================

# These patterns help identify short follow-up questions.
# Example:
# Previous: "Explain my 7th semester syllabus."
# Current:  "Explain this in detail."

FOLLOW_UP_PATTERNS = [
    r"^\s*(explain|elaborate|describe)\s+(this|that|it)\b",
    r"^\s*(tell me more|explain more|describe more)\b",
    r"^\s*(continue|go ahead|proceed)\b",
    r"^\s*(what about|and what about)\b",
    r"^\s*(give|show)\s+(more|details|examples)\b",
    r"^\s*(explain|describe)\s+in\s+(detail|details)\b",
    r"^\s*(isko|usko|ye|vo)\s+(detail|samjhao|explain)\b",
    r"^\s*(aur detail|thoda aur|iske baare mein)\b",
    r"^\s*(aur batao|samjhao|detail mein batao)\b",
    r"^\s*(haan|yes|okay|ok)\s*(please)?\s*$",
]


# ============================================================
# 4. QUESTION DETECTION HELPERS
# ============================================================

def matches_any_pattern(
    question: str,
    patterns: list[str],
) -> bool:
    """
    Check whether a question matches any supplied regex pattern.
    """

    return any(
        re.search(pattern, question, re.IGNORECASE)
        for pattern in patterns
    )


def is_college_related_question(question: str) -> bool:
    """
    Identify questions that require college-specific information.
    """

    return (
        matches_any_pattern(
            question,
            COLLEGE_CONTEXT_PATTERNS,
        )
        or
        matches_any_pattern(
            question,
            ACADEMIC_DOCUMENT_PATTERNS,
        )
    )


def is_follow_up_question(question: str) -> bool:
    """
    Identify short follow-up questions that depend on previous context.
    """

    return matches_any_pattern(
        question,
        FOLLOW_UP_PATTERNS,
    )


def get_previous_user_questions(
    conversation_history: list[dict] | None,
) -> list[str]:
    """
    Extract previous user questions from conversation history.

    Expected message format:
        {
            "role": "user",
            "content": "Explain my college syllabus."
        }
    """

    if not conversation_history:
        return []

    previous_questions = []

    for message in conversation_history:
        if not isinstance(message, dict):
            continue

        role = str(message.get("role", "")).lower()

        if role != "user":
            continue

        content = message.get("content", "")

        if not isinstance(content, str):
            continue

        content = content.strip()

        if content:
            previous_questions.append(content)

    return previous_questions


# ============================================================
# 5. HYBRID AI ROUTING DECISION
# ============================================================

def should_use_college_rag(
    question: str,
    conversation_history: list[dict] | None = None,
) -> bool:
    """
    Decide whether the current question needs college document retrieval.

    Routing logic:

    1. College-specific question:
       Use College RAG.

    2. Academic-document question:
       Use College RAG.

    3. Follow-up to a previous college-related question:
       Continue using College RAG.

    4. General question:
       Use Gemini General AI.
    """

    normalized_question = question.strip()

    if not normalized_question:
        return False

    # Check the current question first.
    if is_college_related_question(normalized_question):
        return True

    # If this is not a follow-up, use general AI.
    if not is_follow_up_question(normalized_question):
        return False

    # Check previous user questions for college context.
    previous_questions = get_previous_user_questions(
        conversation_history
    )

    # Search recent previous questions first.
    for previous_question in reversed(previous_questions[-10:]):

        if is_college_related_question(previous_question):
            return True

    return False


# ============================================================
# 6. MAIN CAMPUS ASSISTANT PIPELINE
# ============================================================

async def ask_campus_assistant(
    db: AsyncSession,
    college_id: uuid.UUID,
    question: str,
    conversation_history: list[dict] | None = None,
) -> dict:
    """
    Hybrid CampusSphere AI pipeline.

    ROUTE 1: GENERAL AI

        User Question
             |
             v
        Question Detection
             |
             v
        Gemini General AI
             |
             v
        Answer

    ROUTE 2: COLLEGE DOCUMENT RAG

        User Question
             |
             v
        Question Detection
             |
             v
        Vector Search
             |
             v
        College Documents
             |
             v
        Gemini RAG
             |
             v
        Answer + Sources

    Returns:
        {
            "question": str,
            "answer": str,
            "sources": list,
            "mode": str
        }
    """

    # --------------------------------------------------------
    # INPUT VALIDATION
    # --------------------------------------------------------

    if not isinstance(question, str) or not question.strip():
        raise ValueError("Question cannot be empty.")

    question = question.strip()

    # --------------------------------------------------------
    # ROUTING DECISION
    # --------------------------------------------------------

    use_college_rag = should_use_college_rag(
        question=question,
        conversation_history=conversation_history,
    )

    # --------------------------------------------------------
    # ROUTE 1: GENERAL GEMINI AI
    # --------------------------------------------------------

    if not use_college_rag:

        print(
            "[ASSISTANT] General question detected. "
            "Skipping college document retrieval.",
            flush=True,
        )

        answer = await generate_general_answer(
            question=question,
            conversation_history=conversation_history,
        )

        return {
            "question": question,
            "answer": answer,
            "sources": [],
            "mode": "general",
        }

    # --------------------------------------------------------
    # ROUTE 2: COLLEGE DOCUMENT RAG
    # --------------------------------------------------------

    print(
        "[ASSISTANT] College-related question detected. "
        "Searching college documents...",
        flush=True,
    )

    retrieved_chunks = await search_relevant_chunks(
        db=db,
        college_id=college_id,
        question=question,
        top_k=6,
    )

    # --------------------------------------------------------
    # GENERATE ANSWER USING RETRIEVED DOCUMENTS
    # --------------------------------------------------------

    answer = await generate_rag_answer(
        question=question,
        retrieved_chunks=retrieved_chunks,
        conversation_history=conversation_history,
    )

    # --------------------------------------------------------
    # PREPARE SOURCE INFORMATION
    # --------------------------------------------------------

    sources = []

    for index, chunk in enumerate(retrieved_chunks, start=1):

        sources.append(
            {
                "source_number": index,
                "document_id": chunk["document_id"],
                "file_name": chunk["file_name"],
                "chunk_id": chunk["chunk_id"],
                "page_number": chunk["page_number"],
            }
        )

    # --------------------------------------------------------
    # FINAL RESPONSE
    # --------------------------------------------------------

    return {
        "question": question,
        "answer": answer,
        "sources": sources,
        "mode": "college_rag",
    }
