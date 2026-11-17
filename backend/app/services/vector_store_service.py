
import asyncio

from app.models.document_chunk import DocumentChunk
from app.services.embedding_service import generate_embedding


async def save_document_chunks(
    db,
    document_id,
    college_id,
    chunks: list[dict],
) -> int:

    if not chunks:
        return 0

    records = []

    for index, chunk in enumerate(chunks):

        chunk_text = chunk["content"]
        page_number = chunk.get("page_number")

        if not chunk_text.strip():
            continue

        print(
            f"[EMBEDDING] Processing chunk {index + 1}/{len(chunks)} "
            f"(Page: {page_number})",
            flush=True,
        )

        embedding = await asyncio.to_thread(
            generate_embedding,
            chunk_text,
        )

        record = DocumentChunk(
            document_id=document_id,
            college_id=college_id,
            chunk_index=index,
            content=chunk_text,
            page_number=page_number,
            embedding=embedding,
        )

        records.append(record)

    if records:
        db.add_all(records)
        await db.flush()

    return len(records)
