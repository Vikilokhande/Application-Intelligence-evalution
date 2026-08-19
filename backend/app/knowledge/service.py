from pathlib import Path
from typing import Any

from app.core.config import get_settings
from app.extraction.providers import DeterministicEmbeddingProvider


class KnowledgeBase:
    def index_directory(self) -> int:
        raise NotImplementedError

    def query(self, text: str, limit: int = 3) -> list[dict[str, Any]]:
        raise NotImplementedError


class LocalKnowledgeBase(KnowledgeBase):
    def __init__(self) -> None:
        self.settings = get_settings()
        self.embedding_provider = DeterministicEmbeddingProvider()
        self.documents: list[dict[str, str]] = []

    def index_directory(self) -> int:
        path = Path(self.settings.knowledge_path)
        if not path.exists():
            return 0
        self.documents = [
            {"source": item.name, "text": item.read_text(encoding="utf-8", errors="ignore")}
            for item in path.glob("*.md")
        ]
        return len(self.documents)

    def query(self, text: str, limit: int = 3) -> list[dict[str, Any]]:
        if not self.documents:
            self.index_directory()
        terms = set(text.lower().split())
        scored = []
        for document in self.documents:
            doc_terms = set(document["text"].lower().split())
            score = len(terms & doc_terms)
            scored.append({"source": document["source"], "score": score, "text": document["text"][:600]})
        return sorted(scored, key=lambda item: item["score"], reverse=True)[:limit]


class ChromaKnowledgeBase(KnowledgeBase):
    def __init__(self) -> None:
        self.settings = get_settings()
        self.local_fallback = LocalKnowledgeBase()
        self.embedding_provider = DeterministicEmbeddingProvider()
        self._collection: Any | None = None

    def _collection_or_none(self) -> Any | None:
        if self._collection is not None:
            return self._collection
        try:
            import chromadb  # type: ignore
        except ImportError:
            return None
        client = chromadb.PersistentClient(path=self.settings.chroma_path)
        self._collection = client.get_or_create_collection(name="scheme_knowledge")
        return self._collection

    def index_directory(self) -> int:
        collection = self._collection_or_none()
        if collection is None:
            return self.local_fallback.index_directory()
        path = Path(self.settings.knowledge_path)
        if not path.exists():
            return 0
        files = list(path.glob("*.md"))
        if not files:
            return 0
        ids = [item.stem for item in files]
        texts = [item.read_text(encoding="utf-8", errors="ignore") for item in files]
        embeddings = self.embedding_provider.embed(texts)
        metadatas = [{"source": item.name} for item in files]
        collection.upsert(ids=ids, documents=texts, embeddings=embeddings, metadatas=metadatas)
        return len(files)

    def query(self, text: str, limit: int = 3) -> list[dict[str, Any]]:
        collection = self._collection_or_none()
        if collection is None:
            return self.local_fallback.query(text, limit)
        embedding = self.embedding_provider.embed([text])[0]
        try:
            result = collection.query(query_embeddings=[embedding], n_results=limit)
        except Exception:  # noqa: BLE001
            self.index_directory()
            result = collection.query(query_embeddings=[embedding], n_results=limit)
        documents = result.get("documents", [[]])[0]
        metadatas = result.get("metadatas", [[]])[0]
        distances = result.get("distances", [[]])[0]
        return [
            {
                "source": (metadatas[index] or {}).get("source", "knowledge"),
                "score": distances[index] if index < len(distances) else None,
                "text": documents[index],
            }
            for index in range(len(documents))
        ]


knowledge_base = ChromaKnowledgeBase()

