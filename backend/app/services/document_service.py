
from pathlib import Path
from io import BytesIO

from pypdf import PdfReader
from docx import Document as DocxDocument


SUPPORTED_EXTENSIONS = {".pdf", ".docx", ".txt"}


def extract_pages_from_file(
    file_content: bytes,
    filename: str,
) -> tuple[list[dict], int | None]:
    """
    Extract text while preserving page numbers where available.

    Returns:
        pages: [{"page_number": int | None, "text": str}]
        page_count: Total PDF pages, or None for other formats.
    """

    extension = Path(filename).suffix.lower()

    if extension not in SUPPORTED_EXTENSIONS:
        raise ValueError("Unsupported document format")

    pages = []

    # PDF extraction: preserve actual page numbers.
    if extension == ".pdf":
        reader = PdfReader(BytesIO(file_content))

        for page_number, page in enumerate(reader.pages, start=1):
            text = page.extract_text() or ""

            if text.strip():
                pages.append({
                    "page_number": page_number,
                    "text": text.strip(),
                })

        return pages, len(reader.pages)

    # DOCX extraction: page numbers are not reliably available.
    if extension == ".docx":
        document = DocxDocument(BytesIO(file_content))

        paragraphs = [
            paragraph.text.strip()
            for paragraph in document.paragraphs
            if paragraph.text.strip()
        ]

        extracted_text = "\n".join(paragraphs)

        if extracted_text.strip():
            pages.append({
                "page_number": None,
                "text": extracted_text,
            })

        return pages, None

    # TXT extraction: no page information.
    if extension == ".txt":
        extracted_text = file_content.decode("utf-8-sig")

        if extracted_text.strip():
            pages.append({
                "page_number": None,
                "text": extracted_text.strip(),
            })

        return pages, None

    raise ValueError("Unsupported document format")


def split_pages_into_chunks(
    pages: list[dict],
    chunk_size: int = 450,
    overlap: int = 80,
) -> list[dict]:
    """
    Split each extracted page independently into overlapping chunks.

    Returns:
        [
            {
                "page_number": 1,
                "content": "..."
            }
        ]

    Each PDF chunk keeps its original page number.
    """

    if chunk_size <= 0:
        raise ValueError("chunk_size must be greater than zero")

    if overlap < 0 or overlap >= chunk_size:
        raise ValueError(
            "overlap must be between 0 and chunk_size"
        )

    chunks = []

    for page in pages:
        page_number = page.get("page_number")
        text = page.get("text", "")

        words = text.split()

        if not words:
            continue

        start = 0

        while start < len(words):
            end = min(start + chunk_size, len(words))

            chunk_text = " ".join(words[start:end])

            if chunk_text.strip():
                chunks.append({
                    "page_number": page_number,
                    "content": chunk_text,
                })

            if end == len(words):
                break

            start = end - overlap

    return chunks


# Backward-compatible helper.
# Existing code that expects a combined string can still use this.
def extract_text_from_file(
    file_content: bytes,
    filename: str,
) -> tuple[str, int | None]:

    pages, page_count = extract_pages_from_file(
        file_content,
        filename,
    )

    extracted_text = "\n\n".join(
        (
            f"[PAGE {page['page_number']}]\n{page['text']}"
            if page["page_number"] is not None
            else page["text"]
        )
        for page in pages
    )

    return extracted_text, page_count


# Backward-compatible helper for existing string-based code.
def split_text_into_chunks(
    text: str,
    chunk_size: int = 1200,
    overlap: int = 200,
) -> list[str]:

    if chunk_size <= 0:
        raise ValueError("chunk_size must be greater than zero")

    if overlap < 0 or overlap >= chunk_size:
        raise ValueError(
            "overlap must be between 0 and chunk_size"
        )

    words = text.split()

    if not words:
        return []

    chunks = []
    start = 0

    while start < len(words):
        end = min(start + chunk_size, len(words))

        chunks.append(" ".join(words[start:end]))

        if end == len(words):
            break

        start = end - overlap

    return chunks
