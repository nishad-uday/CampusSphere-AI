
import asyncio
import uuid

from sqlalchemy import select

from app.database.session import AsyncSessionLocal
from app.models.document import Document
from app.services.rag_service import ask_campus_assistant


DOCUMENT_ID = uuid.UUID(
    "2777f0fb-d8c7-47f7-9012-27e08d096b1c"
)


async def main():
    async with AsyncSessionLocal() as db:

        document = await db.scalar(
            select(Document).where(
                Document.id == DOCUMENT_ID
            )
        )

        if document is None:
            print("Document not found.")
            return

        result = await ask_campus_assistant(
            db=db,
            college_id=document.college_id,
            question=(
                "Which subjects are included in the "
                "BTech CSE 7th semester syllabus?"
            ),
        )

        print("\nQUESTION:")
        print(result["question"])

        print("\nAI ANSWER:")
        print(result["answer"])

        print("\nSOURCES:")

        for source in result["sources"]:
            print(source)


if __name__ == "__main__":
    asyncio.run(main())
