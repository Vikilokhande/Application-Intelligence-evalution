"""
tests/fixtures/mock_providers.py
=================================

TEST-ONLY mock providers for isolated unit testing.

These MUST NOT be imported in any production code path.
They exist here to support:
- Unit tests that do not require real LLM/OCR infrastructure
- Integration tests that mock external dependencies
"""

from __future__ import annotations

from pathlib import Path
from typing import Any

from app.extraction.providers import LLMProvider, OCRProvider, EmbeddingProvider


class MockLLMProvider(LLMProvider):
    """
    TEST USE ONLY.
    Returns deterministic, labelled mock responses.
    """

    def __init__(self, extraction_override: dict[str, Any] | None = None) -> None:
        self._extraction_override = extraction_override or {}

    def generate(self, prompt: str, system: str = "") -> str:
        return "[TEST-MOCK] mock response"

    def summarize(self, text: str) -> str:
        clean = " ".join(text.split())
        return clean[:280] if clean else "No readable text was extracted."

    def extract_structured(self, text: str, schema_name: str, **kwargs: Any) -> dict[str, Any]:
        # Return override fields if provided, otherwise empty dict
        return self._extraction_override

    def classify_document(self, text: str, filename: str, declared_type: str) -> dict[str, Any]:
        return {
            "document_type": declared_type or "OTHER",
            "confidence": 0.5,
            "reason": "mock classification",
            "signals": [],
            "provider": "mock",
        }


class MockOCRProvider(OCRProvider):
    """
    TEST USE ONLY.
    Returns empty OCR result (avoids Tesseract dependency in unit tests).
    """

    def extract_text(self, path: Path, language: str = "eng") -> dict[str, Any]:
        return {
            "text": "",
            "pages": [],
            "confidence": 0.0,
            "page_count": 0,
            "provider": "mock",
            "language": language,
            "status": "MOCK",
        }


class MockEmbeddingProvider(EmbeddingProvider):
    """TEST USE ONLY. Returns deterministic hash-based embeddings."""

    def embed(self, texts: list[str]) -> list[list[float]]:
        vectors: list[list[float]] = []
        for text in texts:
            buckets = [0.0] * 16
            for index, char in enumerate(text.lower()):
                buckets[index % 16] += (ord(char) % 37) / 37.0
            total = sum(buckets) or 1.0
            vectors.append([round(v / total, 6) for v in buckets])
        return vectors
