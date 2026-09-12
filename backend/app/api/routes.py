"""
FastAPI routes.

Endpoints:
  GET  /health          → liveness + index readiness
  GET  /corpus/status   → per-document chunk/claim counts
  POST /query           → main question-answering endpoint
"""

from __future__ import annotations

import logging
import time
from typing import Optional

from fastapi import APIRouter, HTTPException, status

from app.config import settings
from app.models import (
    CorpusStatus,
    DocumentStatus,
    QueryRequest,
    QueryResponse,
)
from app.services.decision import decide_state
from app.services.generation import generate_response
from app.services.retrieval import hybrid_search
from app.state import app_state

logger = logging.getLogger(__name__)
router = APIRouter()


# ─────────────────────────────────────────────────────────────────────────────
# GET /health
# ─────────────────────────────────────────────────────────────────────────────

@router.get("/health", summary="Liveness check")
async def health() -> dict:
    return {
        "status": "ok",
        "index_ready": app_state.is_ready,
        "chunk_count": app_state.chunk_count,
        "claim_count": app_state.claim_count,
        "bm25_ready": app_state.bm25_index is not None and app_state.bm25_index.is_ready,
        "embeddings_ready": app_state.emb_index is not None and app_state.emb_index.is_ready,
        "gemini_configured": bool(settings.gemini_api_key),
    }


# ─────────────────────────────────────────────────────────────────────────────
# GET /corpus/status
# ─────────────────────────────────────────────────────────────────────────────

@router.get("/corpus/status", response_model=CorpusStatus, summary="Corpus index statistics")
async def corpus_status() -> CorpusStatus:
    # Aggregate chunk/claim counts per source file
    per_file: dict[str, dict] = {}
    for chunk in app_state.chunks:
        entry = per_file.setdefault(
            chunk.source_file,
            {"doc_title": chunk.doc_title, "chunks": 0, "claims": 0},
        )
        entry["chunks"] += 1
    for claim in app_state.claims:
        if claim.source_file in per_file:
            per_file[claim.source_file]["claims"] += 1

    documents = [
        DocumentStatus(
            file=fname,
            doc_title=info["doc_title"],
            chunks=info["chunks"],
            claims=info["claims"],
        )
        for fname, info in sorted(per_file.items())
    ]
    return CorpusStatus(
        documents=documents,
        total_chunks=app_state.chunk_count,
        total_claims=app_state.claim_count,
        embeddings_loaded=app_state.emb_index is not None and app_state.emb_index.is_ready,
        bm25_ready=app_state.bm25_index is not None and app_state.bm25_index.is_ready,
    )


# ─────────────────────────────────────────────────────────────────────────────
# POST /query
# ─────────────────────────────────────────────────────────────────────────────

@router.post(
    "/query",
    response_model=QueryResponse,
    summary="Ask a question about the academic regulations",
)
async def query(request: QueryRequest) -> QueryResponse:
    if not app_state.is_ready:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail={
                "error": "index_not_ready",
                "message": "Corpus index is not loaded. Run: python ingest.py",
            },
        )

    t0 = time.perf_counter()
    top_k = request.top_k or settings.top_k

    # ── 1. Hybrid retrieval ───────────────────────────────────────────────
    evidence = hybrid_search(
        query=request.question,
        chunks_by_id=app_state.chunks_by_id,
        bm25_index=app_state.bm25_index,
        emb_index=app_state.emb_index,
        top_k=top_k,
    )

    # ── 2. Deterministic state decision ───────────────────────────────────
    decision = decide_state(
        evidence=evidence,
        claims_by_chunk_id=app_state.claims_by_chunk_id,
        chunks_by_id=app_state.chunks_by_id,
        query=request.question,
    )

    # ── 3. LLM explanation generation (state is now locked) ──────────────
    response = generate_response(
        question=request.question,
        decision=decision,
        chunks_by_id=app_state.chunks_by_id,
    )

    total_ms = int((time.perf_counter() - t0) * 1000)
    response.metadata["total_ms"] = total_ms

    logger.info(
        "Query [%s] '%s…' → %s (%dms, %d evidence)",
        response.state,
        request.question[:50],
        response.state,
        total_ms,
        len(evidence),
    )
    return response
