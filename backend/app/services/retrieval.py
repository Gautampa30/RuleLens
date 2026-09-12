"""
Hybrid retrieval: BM25 + semantic → Reciprocal Rank Fusion (RRF).

Pipeline:
  1. BM25 retrieval  → top-20 candidates with lexical scores
  2. Semantic retrieval → top-20 candidates with cosine similarity
  3. RRF fusion  → fused_score = 1/(k+rank_bm25) + 1/(k+rank_sem)
     where k=60 (standard RRF constant, avoids division-by-zero, reduces
     sensitivity to top-1 outliers)
  4. Deduplicate by chunk_id (union of both candidate sets)
  5. Sort by fused score descending → return top_k

Why RRF:
  - Combines two very different score scales without calibration.
  - Robust: a chunk that ranks well in both methods wins consistently.
  - Deterministic for the same corpus and query.

Threshold filter:
  Chunks where max(bm25_score, semantic_score) < absolute minimum are
  dropped before returning, but the RRF ranking determines the order.
"""

from __future__ import annotations

import logging

from app.config import settings
from app.models import EvidenceChunk, ScoredChunk
from app.storage.index import BM25Index, EmbeddingIndex

logger = logging.getLogger(__name__)


def _rrf_score(rank_bm25: int, rank_sem: int, k: int) -> float:
    """
    Reciprocal Rank Fusion score.

    Both ranks are 0-indexed. Adding 1 makes them 1-indexed before
    applying the formula: 1/(k+rank).
    """
    return 1.0 / (k + rank_bm25 + 1) + 1.0 / (k + rank_sem + 1)


def hybrid_search(
    query: str,
    chunks_by_id: dict[str, EvidenceChunk],
    bm25_index: BM25Index,
    emb_index: EmbeddingIndex,
    top_k: int | None = None,
    candidate_k: int = 20,
) -> list[ScoredChunk]:
    """
    Hybrid BM25 + semantic retrieval with RRF fusion.

    Parameters
    ----------
    query        : natural-language question
    chunks_by_id : chunk_id → EvidenceChunk lookup (from store.build_lookups)
    bm25_index   : built/loaded BM25 index
    emb_index    : built/loaded embedding index
    top_k        : number of results to return (default: settings.top_k)
    candidate_k  : number of candidates from each retriever (default: 20)

    Returns
    -------
    List of ScoredChunk sorted by rrf_score descending.
    """
    if top_k is None:
        top_k = settings.top_k
    k = settings.rrf_k

    # ── Step 1: retrieve candidates from each retriever ──────────────────
    bm25_results: list[tuple[str, float]] = []
    sem_results: list[tuple[str, float]] = []

    if bm25_index.is_ready:
        try:
            bm25_results = bm25_index.query(query, top_k=candidate_k)
        except Exception as exc:
            logger.warning("BM25 retrieval failed: %s", exc)

    if emb_index.is_ready:
        try:
            sem_results = emb_index.query(query, top_k=candidate_k)
        except Exception as exc:
            logger.warning("Semantic retrieval failed: %s", exc)

    if not bm25_results and not sem_results:
        logger.warning("Both retrievers returned empty results for query: %s", query[:80])
        return []

    # ── Step 2: build rank maps ───────────────────────────────────────────
    # rank 0 = best
    bm25_rank: dict[str, int] = {cid: r for r, (cid, _) in enumerate(bm25_results)}
    sem_rank: dict[str, int] = {cid: r for r, (cid, _) in enumerate(sem_results)}
    bm25_scores: dict[str, float] = {cid: s for cid, s in bm25_results}
    sem_scores: dict[str, float] = {cid: s for cid, s in sem_results}

    # ── Step 3: RRF fusion over the union of candidates ───────────────────
    all_ids = set(bm25_rank.keys()) | set(sem_rank.keys())
    n_bm25 = len(bm25_results)
    n_sem = len(sem_results)

    scored: list[ScoredChunk] = []
    for chunk_id in all_ids:
        chunk = chunks_by_id.get(chunk_id)
        if chunk is None:
            logger.debug("chunk_id %s in index but not in chunks_by_id — skipping", chunk_id)
            continue

        bm_s = bm25_scores.get(chunk_id, 0.0)
        sem_s = sem_scores.get(chunk_id, 0.0)

        # Threshold filter: drop candidates with no lexical match and sub-threshold semantic similarity
        if bm_s <= 0.0 and sem_s < settings.relevance_threshold:
            continue

        rrf_bm25 = 1.0 / (k + bm25_rank[chunk_id] + 1) if chunk_id in bm25_rank else 0.0
        rrf_sem = 1.0 / (k + sem_rank[chunk_id] + 1) if chunk_id in sem_rank else 0.0
        rrf = rrf_bm25 + rrf_sem

        scored.append(
            ScoredChunk(
                chunk=chunk,
                bm25_score=bm_s,
                semantic_score=sem_s,
                rrf_score=rrf,
            )
        )

    # ── Step 4: sort by RRF score descending ─────────────────────────────
    scored.sort(key=lambda x: x.rrf_score, reverse=True)

    result = scored[:top_k]
    logger.debug(
        "Hybrid search '%s…' → %d results (top rrf=%.4f)",
        query[:40],
        len(result),
        result[0].rrf_score if result else 0.0,
    )
    return result
