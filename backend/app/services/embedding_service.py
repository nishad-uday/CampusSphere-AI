
from google import genai
from google.genai import types

from app.core.config import settings

EMBEDDING_MODEL = "gemini-embedding-2"
EMBEDDING_DIMENSIONS = 768

_client = None


def get_gemini_client():
    global _client

    if not settings.gemini_api_key:
        raise RuntimeError("GEMINI_API_KEY is missing.")

    if _client is None:
        _client = genai.Client(
            api_key=settings.gemini_api_key
        )

    return _client


def generate_embedding(text: str) -> list[float]:
    if not text or not text.strip():
        raise ValueError("Text cannot be empty.")

    client = get_gemini_client()

    response = client.models.embed_content(
        model=EMBEDDING_MODEL,
        contents=text,
        config=types.EmbedContentConfig(
            output_dimensionality=EMBEDDING_DIMENSIONS
        ),
    )

    if not response.embeddings:
        raise RuntimeError("Gemini returned an empty embedding.")

    values = response.embeddings[0].values

    if values is None or len(values) != EMBEDDING_DIMENSIONS:
        raise RuntimeError("Unexpected embedding dimensions.")

    return list(values)


def generate_embeddings(texts: list[str]) -> list[list[float]]:
    return [
        generate_embedding(text)
        for text in texts
    ]
