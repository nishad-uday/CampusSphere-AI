
import asyncio
import uuid

from sqlalchemy import select, func
from app.database.session import AsyncSessionLocal
from app.models.document_chunk import DocumentChunk


DOCUMENT_ID = uuid.UUID(
    "2777f0fb-d8c7-47f7-9012-27e08d096b1c"
)


async def main():
    async with AsyncSessionLocal() as db:

        total = await db.scalar(
            select(func.count())
            .select_from(DocumentChunk)
            .where(DocumentChunk.document_id == DOCUMENT_ID)
        )

        result = await db.execute(
            select(
                DocumentChunk.chunk_index,
                DocumentChunk.page_number,
                DocumentChunk.content,
            )
            .where(DocumentChunk.document_id == DOCUMENT_ID)
            .order_by(DocumentChunk.chunk_index)
        )

        chunks = result.all()

        print("\nDOCUMENT CHUNK VERIFICATION")
        print("----------------------------")
        print("Total chunks:", total)

        for chunk in chunks:
            print(
                f"\nChunk: {chunk.chunk_index}"
                f"\nPage: {chunk.page_number}"
                f"\nContent: {chunk.content[:150]}..."
            )


if __name__ == "__main__":
    asyncio.run(main())
