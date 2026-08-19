from abc import ABC, abstractmethod
from pathlib import Path
from typing import Any


class DocumentParser(ABC):
    @abstractmethod
    def parse(self, path: Path, mime_type: str) -> dict[str, Any]:
        raise NotImplementedError


class OCRProvider(ABC):
    @abstractmethod
    def extract_text(self, path: Path) -> str:
        raise NotImplementedError


class LLMProvider(ABC):
    @abstractmethod
    def summarize(self, text: str) -> str:
        raise NotImplementedError

    @abstractmethod
    def extract_structured(self, text: str, schema_name: str) -> dict[str, Any]:
        raise NotImplementedError


class EmbeddingProvider(ABC):
    @abstractmethod
    def embed(self, texts: list[str]) -> list[list[float]]:
        raise NotImplementedError


class LocalTextParser(DocumentParser):
    def parse(self, path: Path, mime_type: str) -> dict[str, Any]:
        try:
            text = path.read_text(encoding="utf-8", errors="ignore")
        except OSError:
            text = ""
        return {
            "text": text,
            "metadata": {
                "filename": path.name,
                "mime_type": mime_type,
                "size_bytes": path.stat().st_size if path.exists() else 0,
            },
        }


class MockOCRProvider(OCRProvider):
    def extract_text(self, path: Path) -> str:
        return f"OCR text unavailable in local mock mode for {path.name}."


class MockLLMProvider(LLMProvider):
    def summarize(self, text: str) -> str:
        clean = " ".join(text.split())
        if not clean:
            return "No readable text was extracted."
        return clean[:280]

    def extract_structured(self, text: str, schema_name: str) -> dict[str, Any]:
        return {"schema": schema_name, "mode": "mock", "text_length": len(text)}


class DeterministicEmbeddingProvider(EmbeddingProvider):
    def embed(self, texts: list[str]) -> list[list[float]]:
        vectors: list[list[float]] = []
        for text in texts:
            buckets = [0.0] * 16
            for index, char in enumerate(text.lower()):
                buckets[index % 16] += (ord(char) % 37) / 37.0
            total = sum(buckets) or 1.0
            vectors.append([round(value / total, 6) for value in buckets])
        return vectors

