
import hashlib
import uuid
import zipfile

from datetime import datetime
from io import BytesIO
from pathlib import Path

from fastapi import (
    APIRouter,
    Depends,
    File,
    Form,
    HTTPException,
    UploadFile,
    status,
)

from sqlalchemy.ext.asyncio import AsyncSession

from app.api.deps import require_role
from app.database.session import get_db
from app.models import User, UserRole

from app.models.document import (
    Document,
    DocumentStatus,
    DocumentType,
)

from app.schemas.documents import DocumentUploadResponse

from app.services.document_service import (
    extract_pages_from_file,
    split_pages_into_chunks,
)

from app.services.vector_store_service import save_document_chunks


router = APIRouter(
    prefix="/documents",
    tags=["Documents"],
)


MAX_FILE_SIZE = 10 * 1024 * 1024

ALLOWED_EXTENSIONS = {
    ".pdf",
    ".docx",
    ".txt",
}


STORAGE_ROOT = (
    Path(__file__).resolve().parents[2]
    / "storage"
    / "college_documents"
)


@router.post(
    "/upload",
    response_model=DocumentUploadResponse,
    status_code=status.HTTP_201_CREATED,
)
async def upload_college_document(
    file: UploadFile = File(...),

    document_type: DocumentType = Form(
        default=DocumentType.OTHER
    ),

    published_at: datetime | None = Form(
        default=None
    ),

    current_user: User = Depends(
        require_role(
            UserRole.COLLEGE_ADMIN,
            UserRole.FACULTY,
        )
    ),

    db: AsyncSession = Depends(get_db),
):

    # --------------------------------------------------
    # 1. COLLEGE VALIDATION
    # --------------------------------------------------

    if current_user.college_id is None:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Your account is not associated with a college.",
        )

    # --------------------------------------------------
    # 2. FILE NAME VALIDATION
    # --------------------------------------------------

    original_name = Path(file.filename or "").name

    if not original_name:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="A valid filename is required.",
        )

    extension = Path(original_name).suffix.lower()

    if extension not in ALLOWED_EXTENSIONS:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Only PDF, DOCX and TXT files are allowed.",
        )

    saved_path = None

    try:

        # --------------------------------------------------
        # 3. READ AND VALIDATE FILE SIZE
        # --------------------------------------------------

        content = await file.read(MAX_FILE_SIZE + 1)

        if not content:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Uploaded file is empty.",
            )

        if len(content) > MAX_FILE_SIZE:
            raise HTTPException(
                status_code=status.HTTP_413_REQUEST_ENTITY_TOO_LARGE,
                detail="Maximum file size allowed is 10 MB.",
            )

        # --------------------------------------------------
        # 4. PDF VALIDATION
        # --------------------------------------------------

        if extension == ".pdf":

            if not content.startswith(b"%PDF-"):
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail="Invalid PDF file.",
                )

        # --------------------------------------------------
        # 5. DOCX VALIDATION
        # --------------------------------------------------

        if extension == ".docx":

            if not zipfile.is_zipfile(BytesIO(content)):
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail="Invalid DOCX file.",
                )

            with zipfile.ZipFile(BytesIO(content)) as archive:

                if "word/document.xml" not in archive.namelist():
                    raise HTTPException(
                        status_code=status.HTTP_400_BAD_REQUEST,
                        detail="Invalid DOCX document structure.",
                    )

        # --------------------------------------------------
        # 6. PAGE-WISE TEXT EXTRACTION
        # --------------------------------------------------

        try:

            pages, page_count = extract_pages_from_file(
                content,
                original_name,
            )

        except Exception as exc:

            raise HTTPException(
                status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
                detail="Unable to extract text from this document.",
            ) from exc

        if not pages:
            raise HTTPException(
                status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
                detail="No readable text found in the document.",
            )

        # --------------------------------------------------
        # 7. PAGE-AWARE CHUNKING
        # --------------------------------------------------

        chunks = split_pages_into_chunks(
            pages=pages,
            chunk_size=450,
            overlap=80,
        )

        if not chunks:
            raise HTTPException(
                status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
                detail="No text chunks could be generated.",
            )

        # --------------------------------------------------
        # 8. COLLEGE-WISE STORAGE DIRECTORY
        # --------------------------------------------------

        college_directory = (
            STORAGE_ROOT / str(current_user.college_id)
        )

        college_directory.mkdir(
            parents=True,
            exist_ok=True,
        )

        stored_filename = (
            f"{uuid.uuid4().hex}{extension}"
        )

        saved_path = college_directory / stored_filename

        saved_path.write_bytes(content)

        # --------------------------------------------------
        # 9. CREATE DOCUMENT DATABASE RECORD
        # --------------------------------------------------

        document = Document(
            college_id=current_user.college_id,
            uploaded_by=current_user.id,

            file_name=original_name,
            stored_path=str(saved_path),

            file_type=extension.lstrip("."),
            mime_type=(
                file.content_type
                or "application/octet-stream"
            ),

            file_size=len(content),

            checksum=hashlib.sha256(
                content
            ).hexdigest(),

            document_type=document_type.value,
            published_at=published_at,

            status=DocumentStatus.PROCESSING,

            page_count=page_count,
            chunk_count=0,
        )

        db.add(document)

        await db.flush()

        # --------------------------------------------------
        # 10. GENERATE EMBEDDINGS AND SAVE CHUNKS
        # --------------------------------------------------

        chunk_count = await save_document_chunks(
            db=db,
            document_id=document.id,
            college_id=current_user.college_id,
            chunks=chunks,
        )

        document.chunk_count = chunk_count

        document.status = DocumentStatus.COMPLETED

        # --------------------------------------------------
        # 11. COMMIT DATABASE TRANSACTION
        # --------------------------------------------------

        await db.commit()

        await db.refresh(document)

        print(
            f"[DOCUMENT] Upload completed: "
            f"{original_name} "
            f"({document_type.value}) "
            f"by {current_user.role}",
            flush=True,
        )

        return document

    # --------------------------------------------------
    # 12. HTTP EXCEPTION HANDLING
    # --------------------------------------------------

    except HTTPException:

        await db.rollback()

        if saved_path and saved_path.exists():
            saved_path.unlink()

        raise

    # --------------------------------------------------
    # 13. GENERAL EXCEPTION HANDLING
    # --------------------------------------------------

    except Exception as exc:

        await db.rollback()

        if saved_path and saved_path.exists():
            saved_path.unlink()

        print(
            f"[DOCUMENT] Processing error: {exc}",
            flush=True,
        )

        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Document processing failed. Please try again.",
        ) from exc

    # --------------------------------------------------
    # 14. CLOSE UPLOADED FILE
    # --------------------------------------------------

    finally:

        await file.close()
