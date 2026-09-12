"""
BM25 and semantic embedding indices.

BM25Index:
  Wraps rank_bm25.BM25Okapi over tokenised chunk texts.
  Serialised to data/bm25_index.pkl (pickle).

EmbeddingIndex:
  Encodes chunk texts with sentence-transformers (all-MiniLM-L6-v2).
  Saved as data/embeddings.npy (float32, shape N×384) +
        data/embedding_chunk_ids.json (chunk_id order).
  Cosine similarity via NumPy dot product on L2-normalised vectors.

Both indices are intentionally simple and do not require a vector DB.
"""

from __future__ import annotations

import json
import logging
import pickle
import re
from pathlib import Path
from typing import Optional

import numpy as np

from app.config import settings
from app.models import EvidenceChunk

logger = logging.getLogger(__name__)

_BM25_FILE = "bm25_index.pkl"
_EMB_FILE = "embeddings.npy"
_EMB_IDS_FILE = "embedding_chunk_ids.json"


# ─────────────────────────────────────────────────────────────────────────────
# Tokeniser (shared by BM25 and query preprocessing)
# ─────────────────────────────────────────────────────────────────────────────

_TOKEN_RE = re.compile(r"\b[a-z][a-z0-9_-]{1,}\b")

def tokenize(text: str) -> list[str]:
    """
    Lowercase, split on word boundaries, drop single-character tokens.
    Keeps hyphenated terms (e.g. 'part-time') as single tokens.
    """
    return _TOKEN_RE.findall(text.lower())


# ─────────────────────────────────────────────────────────────────────────────
# BM25 Index
# ─────────────────────────────────────────────────────────────────────────────

class BM25Index:
    """
    BM25 lexical retrieval over EvidenceChunks.

    build()  → tokenises all chunk texts and fits BM25Okapi
    query()  → returns [(chunk_id, bm25_score)] sorted descending
    save()   → pickle to disk
    load()   → classmethod; load from disk
    """

    def __init__(self) -> None:
        self._bm25 = None
        self._chunk_ids: list[str] = []

    @property
    def is_ready(self) -> bool:
        return self._bm25 is not None and bool(self._chunk_ids)

    def build(self, chunks: list[EvidenceChunk]) -> None:
        from rank_bm25 import BM25Okapi

        if not chunks:
            raise ValueError("Cannot build BM25 index from empty chunk list")

        corpus = [tokenize(c.text) for c in chunks]
        self._bm25 = BM25Okapi(corpus)
        self._chunk_ids = [c.id for c in chunks]
        logger.info("BM25 index built: %d documents", len(chunks))

    def query(self, query_text: str, top_k: int = 20) -> list[tuple[str, float]]:
        """Return [(chunk_id, score)] for top_k results, score descending."""
        if not self.is_ready:
            raise RuntimeError("BM25 index not built. Call build() or load() first.")
        tokens = tokenize(query_text)
        if not tokens:
            return []
        scores = self._bm25.get_scores(tokens)
        # Rank by score descending
        ranked = sorted(
            ((self._chunk_ids[i], float(scores[i])) for i in range(len(scores))),
            key=lambda x: x[1],
            reverse=True,
        )
        return ranked[:top_k]

    def save(self, index_dir: Path) -> None:
        index_dir.mkdir(parents=True, exist_ok=True)
        path = index_dir / _BM25_FILE
        with open(path, "wb") as f:
            pickle.dump({"bm25": self._bm25, "chunk_ids": self._chunk_ids}, f)
        logger.info("BM25 index saved → %s", path)

    @classmethod
    def load(cls, index_dir: Path) -> "BM25Index":
        path = index_dir / _BM25_FILE
        if not path.exists():
            raise FileNotFoundError(f"BM25 index not found: {path}. Run ingest.py first.")
        idx = cls()
        with open(path, "rb") as f:
            data = pickle.load(f)
        idx._bm25 = data["bm25"]
        idx._chunk_ids = data["chunk_ids"]
        logger.info("BM25 index loaded: %d documents", len(idx._chunk_ids))
        return idx


# ─────────────────────────────────────────────────────────────────────────────
# Embedding Index
# ─────────────────────────────────────────────────────────────────────────────

class EmbeddingIndex:
    """
    Dense semantic retrieval using sentence-transformers.

    Embeddings are stored as a float32 numpy array normalised to unit length.
    Cosine similarity = dot product of unit vectors.

    The embedding text for each chunk prepends the section_path breadcrumb
    so that semantic search is context-aware:
      "Chapter 5 › Section 5.3  Late withdrawal requests must be …"
    """

    def __init__(self) -> None:
        self._embeddings: Optional[np.ndarray] = None  # shape (N, D)
        self._chunk_ids: list[str] = []
        self._model = None

    @property
    def is_ready(self) -> bool:
        return self._embeddings is not None and bool(self._chunk_ids)

    def _get_model(self):
        if self._model is None:
            from sentence_transformers import SentenceTransformer
            logger.info("Loading embedding model: %s", settings.embedding_model)
            self._model = SentenceTransformer(settings.embedding_model)
        return self._model

    @staticmethod
    def _embed_text(chunk: EvidenceChunk) -> str:
        """Prepend section breadcrumb to the chunk text for context-aware embedding."""
        if chunk.section_path:
            prefix = " › ".join(chunk.section_path)
            return f"{prefix}  {chunk.text}"
        return chunk.text

    def build(self, chunks: list[EvidenceChunk]) -> None:
        if not chunks:
            raise ValueError("Cannot build embedding index from empty chunk list")
        model = self._get_model()
        texts = [self._embed_text(c) for c in chunks]
        logger.info("Encoding %d chunks with %s …", len(chunks), settings.embedding_model)
        embeddings = model.encode(
            texts,
            normalize_embeddings=True,  # unit vectors → cosine sim = dot product
            batch_size=64,
            show_progress_bar=False,
            convert_to_numpy=True,
        )
        self._embeddings = embeddings.astype(np.float32)
        self._chunk_ids = [c.id for c in chunks]
        logger.info("Embedding index built: shape %s", self._embeddings.shape)

    def query(self, query_text: str, top_k: int = 20) -> list[tuple[str, float]]:
        """Return [(chunk_id, cosine_sim)] for top_k results, score descending."""
        if not self.is_ready:
            raise RuntimeError("Embedding index not built. Call build() or load() first.")
        model = self._get_model()
        q_emb = model.encode(
            [query_text],
            normalize_embeddings=True,
            convert_to_numpy=True,
        )[0].astype(np.float32)

        sims = self._embeddings @ q_emb   # (N,) cosine similarities
        top_idx = np.argsort(sims)[::-1][:top_k]
        return [(self._chunk_ids[int(i)], float(sims[i])) for i in top_idx]

    def save(self, index_dir: Path) -> None:
        index_dir.mkdir(parents=True, exist_ok=True)
        np.save(str(index_dir / _EMB_FILE), self._embeddings)
        (index_dir / _EMB_IDS_FILE).write_text(
            json.dumps(self._chunk_ids), encoding="utf-8"
        )
        logger.info("Embedding index saved → %s", index_dir / _EMB_FILE)

    @classmethod
    def load(cls, index_dir: Path) -> "EmbeddingIndex":
        emb_path = index_dir / _EMB_FILE
        ids_path = index_dir / _EMB_IDS_FILE
        if not emb_path.exists() or not ids_path.exists():
            raise FileNotFoundError(
                f"Embedding index not found in {index_dir}. Run ingest.py first."
            )
        idx = cls()
        idx._embeddings = np.load(str(emb_path)).astype(np.float32)
        idx._chunk_ids = json.loads(ids_path.read_text(encoding="utf-8"))
        logger.info(
            "Embedding index loaded: %d vectors, dim=%d",
            len(idx._chunk_ids),
            idx._embeddings.shape[1],
        )
        return idx
