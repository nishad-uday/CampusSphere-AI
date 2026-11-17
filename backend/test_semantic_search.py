
import asyncio
import uuid

from sqlalchemy import select

from app.database.session import AsyncSessionLocal
from app.models.document import Document
from app.services.retrieval_service import search_relevant_chunks


DOCUMENT_ID = uuid.UUID(
    "0bad5336-ca6c-4eb1-a656-6684a3c595dd"
)

QUESTION = "Which subjects are included in the BTech CSE 7th semester syllabus?"


async def main():
    async with AsyncSessionLocal() as db:

        # Get college ID from the uploaded document.
        document = await db.scalar(
            select(Document).where(
                Document.id == DOCUMENT_ID
            )
        )

        if document is None:
            print("Document not found.")
            return

        # Search only within this document's college.
        results = await search_relevant_chunks(
            db=db,
            college_id=document.college_id,
            question=QUESTION,
            top_k=5,
        )

        print("\nQuestion:", QUESTION)
        print("\nRetrieved chunks:", len(results))

        for index, item in enumerate(results, start=1):
            print(f"\n--- Result {index} ---")
            print("File:", item["file_name"])
            print("Distance:", item["distance"])
            print("Content:")
            print(item["content"])


if __name__ == "__main__":
    asyncio.run(main())
