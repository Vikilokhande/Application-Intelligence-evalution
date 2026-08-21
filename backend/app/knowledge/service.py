"""
knowledge/service.py
====================

Knowledge base for semantic retrieval of scheme documentation.

Production path: ChromaKnowledgeBase with configurable embedding provider.
- EMBEDDING_PROVIDER=sentence_transformers → real semantic search
- EMBEDDING_PROVIDER=local → deterministic hash fallback (dev only, with warning)

Chunking is applied to improve retrieval granularity.
Every chunk stores source, scheme, section, and chunk_id metadata.
"""

from __future__ import annotations

import logging
from pathlib import Path
from typing import Any

from app.core.config import get_settings
from app.extraction.providers import (
    EmbeddingProvider,
    LocalFallbackEmbeddingProvider,
    get_embedding_provider,
)

logger = logging.getLogger(__name__)


# ---------------------------------------------------------------------------
# Text chunking
# ---------------------------------------------------------------------------


def chunk_text(text: str, chunk_size: int = 500, overlap: int = 50) -> list[str]:
    """Split text into overlapping chunks for better retrieval granularity."""
    words = text.split()
    chunks: list[str] = []
    start = 0
    while start < len(words):
        end = min(start + chunk_size, len(words))
        chunks.append(" ".join(words[start:end]))
        if end >= len(words):
            break
        start += chunk_size - overlap
    return chunks


# ---------------------------------------------------------------------------
# Abstract base
# ---------------------------------------------------------------------------


class KnowledgeBase:
    def index_directory(self) -> int:
        raise NotImplementedError

    def query(self, text: str, limit: int = 3) -> list[dict[str, Any]]:
        raise NotImplementedError


# ---------------------------------------------------------------------------
# Local fallback (keyword-based, dev only)
# ---------------------------------------------------------------------------


class LocalKnowledgeBase(KnowledgeBase):
    """
    Keyword overlap-based search. Used as fallback when ChromaDB is unavailable.
    Logs a warning when used in production.
    """

    def __init__(self) -> None:
        self.settings = get_settings()
        self.documents: list[dict[str, str]] = []

    def index_directory(self) -> int:
        path = Path(self.settings.knowledge_path)
        if not path.exists():
            return 0
        self.documents = []
        for item in path.glob("*.md"):
            text = item.read_text(encoding="utf-8", errors="ignore")
            for chunk_idx, chunk in enumerate(chunk_text(text, chunk_size=400, overlap=40)):
                self.documents.append({
                    "source": item.name,
                    "scheme": item.stem,
                    "chunk_id": f"{item.stem}_{chunk_idx}",
                    "text": chunk,
                })
        return len(self.documents)

    def query(self, text: str, limit: int = 3) -> list[dict[str, Any]]:
        if not self.documents:
            self.index_directory()
        if not self.documents:
            return []

        terms = set(text.lower().split())
        scored = []
        for doc in self.documents:
            doc_terms = set(doc["text"].lower().split())
            score = len(terms & doc_terms) / max(len(terms), 1)
            scored.append({
                "source": doc["source"],
                "scheme": doc.get("scheme", ""),
                "chunk_id": doc.get("chunk_id", ""),
                "score": round(score, 4),
                "text": doc["text"][:800],
            })
        return sorted(scored, key=lambda item: item["score"], reverse=True)[:limit]


# ---------------------------------------------------------------------------
# ChromaDB (production)
# ---------------------------------------------------------------------------


class ChromaKnowledgeBase(KnowledgeBase):
    """
    Production knowledge base using ChromaDB + configurable embeddings.

    When EMBEDDING_PROVIDER=sentence_transformers: real semantic search.
    When EMBEDDING_PROVIDER=local: deterministic hash embeddings with a warning.
    Falls back to LocalKnowledgeBase if chromadb is not installed.
    """

    def __init__(self) -> None:
        self.settings = get_settings()
        self.local_fallback = LocalKnowledgeBase()
        self._embedding_provider: EmbeddingProvider | None = None
        self._collection: Any | None = None

    def _allow_local_fallback(self) -> bool:
        return self.settings.demo_mode or self.settings.embedding_provider == "local"

    def _get_embedding_provider(self) -> EmbeddingProvider:
        if self._embedding_provider is None:
            try:
                self._embedding_provider = get_embedding_provider(self.settings)
            except Exception as exc:
                if not self._allow_local_fallback():
                    raise
                logger.warning("Embedding provider unavailable; using local dev fallback: %s", exc)
                self._embedding_provider = LocalFallbackEmbeddingProvider()
        return self._embedding_provider

    def _collection_or_none(self) -> Any | None:
        if self._collection is not None:
            return self._collection
        try:
            import chromadb  # type: ignore
        except ImportError:
            if not self._allow_local_fallback():
                raise RuntimeError("chromadb is required when DEMO_MODE=false.") from None
            logger.warning("chromadb not installed. Knowledge base will use local keyword fallback.")
            return None
        try:
            client = chromadb.PersistentClient(path=self.settings.chroma_path)

            # Check for existing collection and validate its dimension
            existing = client.list_collections()
            existing_names = [
                c.name if hasattr(c, "name") else c
                for c in existing
            ]
            if "scheme_knowledge" in existing_names:
                try:
                    # Sample the existing dimension by checking its count
                    col = client.get_collection("scheme_knowledge")
                    meta = col.metadata or {}
                    # Get embedding provider dimension
                    ep = self._get_embedding_provider()
                    test_embed = ep.embed(["dimension_check"])[0]
                    expected_dim = len(test_embed)
                    # ChromaDB doesn't expose dimension directly; try a query
                    try:
                        col.query(query_embeddings=[test_embed], n_results=1)
                        # If no error, dimension matches — reuse collection
                        self._collection = col
                        return self._collection
                    except Exception:
                        # Dimension mismatch — recreate collection
                        logger.warning(
                            "ChromaDB 'scheme_knowledge' collection has dimension mismatch. "
                            "Deleting and recreating for embedding dimension=%d.",
                            expected_dim,
                        )
                        client.delete_collection("scheme_knowledge")
                except Exception as exc:
                    logger.warning("ChromaDB collection check failed: %s. Recreating.", exc)
                    try:
                        client.delete_collection("scheme_knowledge")
                    except Exception:
                        pass

            self._collection = client.get_or_create_collection(
                name="scheme_knowledge",
                metadata={"hnsw:space": "cosine"},
            )
            return self._collection
        except Exception as exc:
            if not self._allow_local_fallback():
                raise
            logger.warning("ChromaDB init failed: %s. Falling back to local search.", exc)
            return None

    def index_directory(self) -> int:
        collection = self._collection_or_none()
        if collection is None:
            return self.local_fallback.index_directory()

        path = Path(self.settings.knowledge_path)
        if not path.exists():
            logger.warning("Knowledge path does not exist: %s", path)
            return 0

        files = list(path.glob("*.md"))
        if not files:
            logger.info("No .md files found in knowledge path: %s", path)
            return 0

        embedding_provider = self._get_embedding_provider()
        all_ids: list[str] = []
        all_texts: list[str] = []
        all_embeddings: list[list[float]] = []
        all_metadatas: list[dict[str, Any]] = []

        for file in files:
            text = file.read_text(encoding="utf-8", errors="ignore")
            chunks = chunk_text(text, chunk_size=400, overlap=40)
            for chunk_idx, chunk in enumerate(chunks):
                chunk_id = f"{file.stem}_{chunk_idx}"
                try:
                    embedding = embedding_provider.embed([chunk])[0]
                except Exception as exc:
                    logger.warning("Embedding failed for chunk %s: %s", chunk_id, exc)
                    continue
                all_ids.append(chunk_id)
                all_texts.append(chunk)
                all_embeddings.append(embedding)
                all_metadatas.append({
                    "source": file.name,
                    "scheme": file.stem,
                    "chunk_id": chunk_id,
                    "chunk_index": chunk_idx,
                })

        if all_ids:
            collection.upsert(
                ids=all_ids,
                documents=all_texts,
                embeddings=all_embeddings,
                metadatas=all_metadatas,
            )
            logger.info(
                "Indexed %d chunks from %d knowledge files into ChromaDB.",
                len(all_ids), len(files),
            )

        return len(all_ids)

    def query(self, text: str, limit: int = 3) -> list[dict[str, Any]]:
        collection = self._collection_or_none()
        if collection is None:
            return self.local_fallback.query(text, limit)

        embedding_provider = self._get_embedding_provider()
        try:
            embedding = embedding_provider.embed([text])[0]
        except Exception as exc:
            if not self._allow_local_fallback():
                raise
            logger.warning("Embedding failed for query; using local dev fallback: %s", exc)
            return self.local_fallback.query(text, limit)

        try:
            result = collection.query(query_embeddings=[embedding], n_results=limit)
        except Exception:
            self.index_directory()
            try:
                result = collection.query(query_embeddings=[embedding], n_results=limit)
            except Exception as exc2:
                if not self._allow_local_fallback():
                    raise
                logger.warning("ChromaDB query failed: %s. Falling back to local.", exc2)
                return self.local_fallback.query(text, limit)

        documents = result.get("documents", [[]])[0]
        metadatas = result.get("metadatas", [[]])[0]
        distances = result.get("distances", [[]])[0]

        return [
            {
                "source": (metadatas[i] or {}).get("source", "knowledge"),
                "scheme": (metadatas[i] or {}).get("scheme", ""),
                "chunk_id": (metadatas[i] or {}).get("chunk_id", ""),
                "score": round(float(distances[i]), 4) if i < len(distances) else 0.0,
                "text": documents[i],
            }
            for i in range(len(documents))
        ]

    def health(self) -> dict[str, Any]:
        try:
            collection = self._collection_or_none()
            if collection is None:
                count = self.local_fallback.index_directory()
                return {
                    "status": "local_fallback",
                    "provider": "local_keyword",
                    "chunks": count,
                }
            return {
                "status": "ok",
                "provider": "chromadb",
                "embedding_provider": self.settings.embedding_provider,
                "chunks": collection.count(),
            }
        except Exception as exc:
            return {
                "status": "unavailable",
                "provider": "chromadb",
                "reason": str(exc),
            }


knowledge_base = ChromaKnowledgeBase()
