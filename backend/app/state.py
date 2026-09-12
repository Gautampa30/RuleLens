"""
Application-level state singleton loaded at FastAPI startup.

Holds all in-memory indices and lookup dicts so routes can access them
without rebuilding them per request.
"""

from __future__ import annotations

from dataclasses import dataclass, field
from typing import Optional

from app.models import EvidenceChunk, PolicyClaim
from app.storage.index import BM25Index, EmbeddingIndex


@dataclass
class AppState:
    chunks: list[EvidenceChunk] = field(default_factory=list)
    chunks_by_id: dict[str, EvidenceChunk] = field(default_factory=dict)
    claims: list[PolicyClaim] = field(default_factory=list)
    claims_by_chunk_id: dict[str, list[PolicyClaim]] = field(default_factory=dict)
    bm25_index: Optional[BM25Index] = None
    emb_index: Optional[EmbeddingIndex] = None
    is_ready: bool = False

    @property
    def chunk_count(self) -> int:
        return len(self.chunks)

    @property
    def claim_count(self) -> int:
        return len(self.claims)


# Module-level singleton — all routes import this
app_state = AppState()
