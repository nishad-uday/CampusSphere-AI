
import asyncio
import re
import uuid

from sqlalchemy import case, func, or_, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.document import (
    Document,
    DocumentStatus,
    DocumentType,
)
from app.models.document_chunk import DocumentChunk
from app.services.embedding_service import generate_embedding


# --------------------------------------------------
# RETRIEVAL CONFIGURATION
# --------------------------------------------------

# Lower cosine distance means higher similarity.
MAX_COSINE_DISTANCE = 0.65

DEFAULT_TOP_K = 6


# --------------------------------------------------
# QUESTION CATEGORY DETECTION
# --------------------------------------------------

DOCUMENT_TYPE_PATTERNS = {
    DocumentType.NOTICE.value: [
        r"\bnotice(s)?\b",
        r"\bannouncement(s)?\b",
        r"\bcircular(s)?\b",
        r"\blatest college update(s)?\b",
        r"\bholiday notice\b",
        r"\bcollege ki notice\b",
        r"\bcollege ka notice\b",
        r"\bnew notice\b",
    ],

    DocumentType.SYLLABUS.value: [
        r"\bsyllabus\b",
        r"\bcourse content\b",
        r"\bsubject(s)?\b",
        r"\bunit\s*[1-5ivx]+\b",
        r"\bsemester syllabus\b",
        r"\bsemester ke subjects\b",
        r"\bmera syllabus\b",
    ],

    DocumentType.EXAMINATION.value: [
        r"\bexam(s)?\b",
        r"\bexamination\b",
        r"\bexam date(s)?\b",
        r"\bexam timetable\b",
        r"\badmit card\b",
        r"\bresult(s)?\b",
        r"\binternal marks\b",
    ],

    DocumentType.ACADEMIC_CALENDAR.value: [
        r"\bacademic calendar\b",
        r"\bholiday(s)?\b",
        r"\bacademic schedule\b",
        r"\bcollege calendar\b",
    ],

    DocumentType.RULES_REGULATIONS.value: [
        r"\brules?\b",
        r"\bregulations?\b",
        r"\battendance policy\b",
        r"\battendance requirement\b",
        r"\bcollege polic(y|ies)\b",
    ],

    DocumentType.ADMISSION.value: [
        r"\badmission\b",
        r"\badmission process\b",
        r"\beligibility criteria\b",
        r"\badmission fees\b",
    ],

    DocumentType.STUDY_MATERIAL.value: [
        r"\bstudy material\b",
        r"\bnotes\b",
        r"\blecture notes\b",
        r"\bquestion bank\b",
    ],
}


# --------------------------------------------------
# LEGACY DOCUMENT FILENAME CLASSIFICATION
# --------------------------------------------------

# These are plain filename keywords, NOT regex patterns.
# SQL ILIKE supports % and _, not Python regex syntax.

FILENAME_PATTERNS = {
    DocumentType.NOTICE.value: [
        "notice",
        "announcement",
        "circular",
        "holiday",
    ],

    DocumentType.SYLLABUS.value: [
        "syllabus",
        "curriculum",
    ],

    DocumentType.EXAMINATION.value: [
        "exam",
        "examination",
        "timetable",
        "admit",
        "result",
    ],

    DocumentType.ACADEMIC_CALENDAR.value: [
        "academic calendar",
        "academic_calendar",
        "calendar",
    ],

    DocumentType.RULES_REGULATIONS.value: [
        "rules",
        "regulation",
        "policy",
    ],

    DocumentType.ADMISSION.value: [
        "admission",
    ],

    DocumentType.STUDY_MATERIAL.value: [
        "study material",
        "study_material",
        "notes",
        "question bank",
        "question_bank",
    ],
}


def detect_document_type(question: str) -> str | None:
    """
    Detect the document category requested by the user.
    """

    normalized = question.strip().lower()

    for document_type, patterns in DOCUMENT_TYPE_PATTERNS.items():

        if any(
            re.search(pattern, normalized, re.IGNORECASE)
            for pattern in patterns
        ):
            return document_type

    return None


def get_filename_category_expression():
    """
    SQL CASE expression for identifying legacy documents
    using filename keywords.

    Explicit document_type always takes priority.
    """

    conditions = []

    for document_type, keywords in FILENAME_PATTERNS.items():

        for keyword in keywords:

            conditions.append(
                (
                    Document.file_name.ilike(f"%{keyword}%"),
                    document_type,
                )
            )

    return case(
        *conditions,
        else_=DocumentType.OTHER.value,
    )


# --------------------------------------------------
# DUPLICATE DOCUMENT FILTER
# --------------------------------------------------

def get_unique_document_ids(college_id: uuid.UUID):
    """
    Return one canonical document ID per SHA-256 checksum.

    If the same file was uploaded multiple times,
    the newest record with an available publication date
    is preferred.

    Documents with NULL checksums are handled separately.
    """

    ranked_documents = (
        select(
            Document.id.label("document_id"),

            func.row_number()
            .over(
                partition_by=[
                    Document.college_id,
                    Document.checksum,
                ],
                order_by=[
                    Document.published_at.desc().nullslast(),
                    Document.created_at.desc(),
                ],
            )
            .label("duplicate_rank"),
        )
        .where(
            Document.college_id == college_id,
            Document.status == DocumentStatus.COMPLETED,
            Document.checksum.is_not(None),
        )
        .subquery()
    )

    return (
        select(ranked_documents.c.document_id)
        .where(ranked_documents.c.duplicate_rank == 1)
    )


# --------------------------------------------------
# MAIN VECTOR SEARCH FUNCTION
# --------------------------------------------------

async def search_relevant_chunks(
    db: AsyncSession,
    college_id: uuid.UUID,
    question: str,
    top_k: int = DEFAULT_TOP_K,
) -> list[dict]:
    """
    Search college-specific document chunks using
    pgvector cosine distance.

    Features:
        - College-level data isolation.
        - Strict document category filtering.
        - Legacy filename classification.
        - Duplicate document filtering.
        - Cosine similarity filtering.
        - Latest publication date ranking for notices.
        - Page-level source information.
    """

    # --------------------------------------------------
    # 1. INPUT VALIDATION
    # --------------------------------------------------

    if not question or not question.strip():
        raise ValueError("Question cannot be empty.")

    if not 1 <= top_k <= 20:
        raise ValueError("top_k must be between 1 and 20.")

    normalized_question = question.strip()

    # --------------------------------------------------
    # 2. GENERATE QUESTION EMBEDDING
    # --------------------------------------------------

    query_embedding = await asyncio.to_thread(
        generate_embedding,
        normalized_question,
    )

    if len(query_embedding) != 768:
        raise ValueError(
            "Query embedding must contain exactly 768 dimensions."
        )

    # --------------------------------------------------
    # 3. CALCULATE COSINE DISTANCE
    # --------------------------------------------------

    distance = DocumentChunk.embedding.cosine_distance(
        query_embedding
    ).label("distance")

    # --------------------------------------------------
    # 4. DETECT REQUESTED CATEGORY
    # --------------------------------------------------

    requested_type = detect_document_type(
        normalized_question
    )

    filename_category = get_filename_category_expression()

    # Explicit classification takes priority.
    # Legacy OTHER documents use filename classification.

    effective_type = case(
        (
            Document.document_type != DocumentType.OTHER.value,
            Document.document_type,
        ),
        else_=filename_category,
    ).label("effective_type")

    # --------------------------------------------------
    # 5. DUPLICATE DOCUMENT IDS
    # --------------------------------------------------

    unique_document_ids = get_unique_document_ids(
        college_id
    )

    # --------------------------------------------------
    # 6. BASE VECTOR SEARCH QUERY
    # --------------------------------------------------

    statement = (
        select(
            DocumentChunk.id,
            DocumentChunk.document_id,
            DocumentChunk.content,
            DocumentChunk.page_number,

            Document.file_name,
            Document.document_type,
            Document.published_at,
            Document.created_at,

            distance,
            effective_type,
        )
        .join(
            Document,
            Document.id == DocumentChunk.document_id,
        )
        .where(
            DocumentChunk.college_id == college_id,
            Document.college_id == college_id,

            Document.status == DocumentStatus.COMPLETED,

            distance <= MAX_COSINE_DISTANCE,

            # Keep only one uploaded record for identical files.
            or_(
                Document.checksum.is_(None),
                Document.id.in_(unique_document_ids),
            ),
        )
    )

    # --------------------------------------------------
    # 7. STRICT CATEGORY FILTERING
    # --------------------------------------------------

    if requested_type:

        # IMPORTANT:
        # Do not allow unrelated document categories.
        #
        # Example:
        # Notice question -> Notice documents only.
        # Syllabus question -> Syllabus documents only.
        #
        # If no document matches, query returns an empty list.

        statement = statement.where(
            effective_type == requested_type
        )

    # --------------------------------------------------
    # 8. RESULT ORDERING
    # --------------------------------------------------

    if requested_type == DocumentType.NOTICE.value:

        # Latest publication date first.
        # Documents without publication dates are ranked
        # using their upload date as a secondary ordering.
        statement = statement.order_by(
            Document.published_at.desc().nullslast(),
            Document.created_at.desc(),
            distance.asc(),
        )

    else:

        # For all other categories, prioritize relevance.
        statement = statement.order_by(
            distance.asc()
        )

    # --------------------------------------------------
    # 9. LIMIT RESULTS
    # --------------------------------------------------

    statement = statement.limit(top_k)

    # --------------------------------------------------
    # 10. EXECUTE DATABASE QUERY
    # --------------------------------------------------

    result = await db.execute(statement)

    rows = result.all()

    # --------------------------------------------------
    # 11. RETURN RETRIEVED CHUNKS
    # --------------------------------------------------

    retrieved_chunks = []

    for row in rows:

        retrieved_chunks.append(
            {
                "chunk_id": str(row.id),

                "document_id": str(row.document_id),

                "file_name": row.file_name,

                "content": row.content,

                "page_number": row.page_number,

                "distance": float(row.distance),

                "document_type": row.effective_type,

                "published_at": row.published_at,

                "created_at": row.created_at,
            }
        )

    print(
        f"[RAG] Question category: {requested_type or 'general'} | "
        f"Retrieved chunks: {len(retrieved_chunks)}",
        flush=True,
    )

    return retrieved_chunks
