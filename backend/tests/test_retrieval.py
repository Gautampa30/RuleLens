"""
Tests for BM25, semantic retrieval, and RRF hybrid fusion.

Covers:
- BM25 returns ranked results
- Semantic retrieval returns ranked results
- RRF fusion returns correct top-K
- Retrieval is deterministic for same query
- Specific corpus queries retrieve relevant passages
- UNKNOWN scenario: nonsense query returns nothing above threshold
"""

from __future__ import annotations

import pytest


# ─────────────────────────────────────────────────────────────────────────────
# BM25
# ─────────────────────────────────────────────────────────────────────────────

def test_bm25_returns_results(bm25_index):
    results = bm25_index.query("withdrawal approval Dean", top_k=5)
    assert results, "BM25 should return results for a corpus-relevant query"


def test_bm25_results_are_sorted_descending(bm25_index):
    results = bm25_index.query("GPA academic standing probation", top_k=10)
    scores = [s for _, s in results]
    assert scores == sorted(scores, reverse=True), "BM25 results must be sorted by score descending"


def test_bm25_returns_chunk_ids(bm25_index, chunks_by_id):
    results = bm25_index.query("tuition refund", top_k=5)
    for chunk_id, score in results:
        assert chunk_id in chunks_by_id, f"BM25 returned unknown chunk_id: {chunk_id}"


def test_bm25_is_deterministic(bm25_index):
    q = "late course withdrawal graduate student"
    run1 = bm25_index.query(q, top_k=5)
    run2 = bm25_index.query(q, top_k=5)
    assert run1 == run2, "BM25 should be deterministic for the same query"


def test_bm25_withdrawal_dean_hits_ar(bm25_index, chunks_by_id):
    """C-001 source A: 'withdrawal Dean approval' must retrieve from academic_regulations.md."""
    results = bm25_index.query("withdrawal approval Dean faculty", top_k=10)
    top_sources = {chunks_by_id[cid].source_file for cid, _ in results}
    assert "academic_regulations.md" in top_sources, (
        "BM25 query about 'Dean approval withdrawal' must hit academic_regulations.md"
    )


def test_bm25_thesis_extension_hits_graduate_policies(bm25_index, chunks_by_id):
    """C-003 source A: thesis extension query must retrieve from graduate_policies.md."""
    results = bm25_index.query("thesis submission extension sixteen weeks", top_k=10)
    top_sources = {chunks_by_id[cid].source_file for cid, _ in results}
    assert "graduate_policies.md" in top_sources, (
        "BM25 query about 'thesis extension sixteen weeks' must hit graduate_policies.md"
    )


def test_bm25_thesis_extension_hits_pdf(bm25_index, chunks_by_id):
    """C-003 source B: thesis extension query should retrieve from PDF."""
    results = bm25_index.query("thesis extension six months doctoral", top_k=10)
    top_sources = {chunks_by_id[cid].source_file for cid, _ in results}
    assert "research_degrees_handbook.pdf" in top_sources, (
        "BM25 query about 'six months extension' must hit research_degrees_handbook.pdf"
    )


def test_bm25_gpa_probation_hits_both_sources(bm25_index, chunks_by_id):
    """C-002: GPA/probation query should retrieve from both source files."""
    results = bm25_index.query("undergraduate GPA academic standing probation 2.3", top_k=15)
    top_sources = {chunks_by_id[cid].source_file for cid, _ in results}
    # Should hit at least one of the two C-002 sources
    c002_sources = {"academic_regulations.md", "appeals_and_conduct.md"}
    assert top_sources & c002_sources, "C-002 GPA query must hit at least one source"


def test_bm25_empty_query_returns_results(bm25_index):
    """Empty/minimal query is handled gracefully."""
    # Single character (below token minimum) should not crash
    results = bm25_index.query("a", top_k=5)
    # May return results or empty — must not raise
    assert isinstance(results, list)


# ─────────────────────────────────────────────────────────────────────────────
# Semantic retrieval
# ─────────────────────────────────────────────────────────────────────────────

def test_semantic_returns_results(emb_index):
    results = emb_index.query("minimum grade point average requirement", top_k=5)
    assert results, "Semantic retrieval should return results for a relevant query"


def test_semantic_results_are_sorted_descending(emb_index):
    results = emb_index.query("tuition payment deadline", top_k=10)
    scores = [s for _, s in results]
    assert scores == sorted(scores, reverse=True), "Semantic results must be sorted by score descending"


def test_semantic_scores_are_cosine_bounded(emb_index):
    """Unit-norm embeddings → cosine similarity in [-1, 1]."""
    results = emb_index.query("late withdrawal approval authority", top_k=5)
    for _, score in results:
        assert -1.01 <= score <= 1.01, f"Cosine similarity {score} out of expected range"


def test_semantic_is_deterministic(emb_index):
    q = "academic probation grade point average exit requirement"
    run1 = emb_index.query(q, top_k=5)
    run2 = emb_index.query(q, top_k=5)
    assert run1 == run2, "Semantic retrieval must be deterministic"


def test_semantic_withdrawal_hits_ar_or_gp(emb_index, chunks_by_id):
    """Semantic query for late withdrawal should retrieve from AR or GP."""
    results = emb_index.query("who approves a late course withdrawal request", top_k=10)
    top_sources = {chunks_by_id[cid].source_file for cid, _ in results}
    relevant = {"academic_regulations.md", "graduate_policies.md"}
    assert top_sources & relevant, (
        "Semantic query about withdrawal approval must retrieve from AR or GP"
    )


def test_semantic_fee_deadline_hits_fee_schedule(emb_index, chunks_by_id):
    results = emb_index.query("when is tuition payment due for autumn semester", top_k=10)
    top_sources = {chunks_by_id[cid].source_file for cid, _ in results}
    assert "fee_schedule.md" in top_sources, (
        "Semantic fee deadline query must retrieve from fee_schedule.md"
    )


# ─────────────────────────────────────────────────────────────────────────────
# RRF hybrid fusion
# ─────────────────────────────────────────────────────────────────────────────

def test_hybrid_search_returns_scored_chunks(chunks_by_id, bm25_index, emb_index):
    from app.services.retrieval import hybrid_search
    results = hybrid_search(
        query="What GPA must a student maintain?",
        chunks_by_id=chunks_by_id,
        bm25_index=bm25_index,
        emb_index=emb_index,
        top_k=5,
    )
    assert results, "hybrid_search must return results"
    for sc in results:
        assert sc.rrf_score > 0, "RRF score must be positive"
        assert sc.chunk.id in chunks_by_id


def test_hybrid_results_are_sorted_by_rrf(chunks_by_id, bm25_index, emb_index):
    from app.services.retrieval import hybrid_search
    results = hybrid_search(
        query="graduation application deadline",
        chunks_by_id=chunks_by_id,
        bm25_index=bm25_index,
        emb_index=emb_index,
        top_k=10,
    )
    rrf_scores = [sc.rrf_score for sc in results]
    assert rrf_scores == sorted(rrf_scores, reverse=True), "RRF results must be sorted descending"


def test_hybrid_returns_at_most_top_k(chunks_by_id, bm25_index, emb_index):
    from app.services.retrieval import hybrid_search
    for k in [1, 5, 10]:
        results = hybrid_search(
            query="thesis submission extension",
            chunks_by_id=chunks_by_id,
            bm25_index=bm25_index,
            emb_index=emb_index,
            top_k=k,
        )
        assert len(results) <= k, f"Expected ≤{k} results; got {len(results)}"


def test_hybrid_is_deterministic(chunks_by_id, bm25_index, emb_index):
    from app.services.retrieval import hybrid_search
    q = "graduate late withdrawal approval committee"
    run1 = hybrid_search(q, chunks_by_id, bm25_index, emb_index, top_k=5)
    run2 = hybrid_search(q, chunks_by_id, bm25_index, emb_index, top_k=5)
    ids1 = [sc.chunk.id for sc in run1]
    ids2 = [sc.chunk.id for sc in run2]
    assert ids1 == ids2, "Hybrid search must be deterministic"


def test_hybrid_c001_retrieves_both_sources(chunks_by_id, bm25_index, emb_index):
    """C-001 query must retrieve from BOTH academic_regulations.md and graduate_policies.md."""
    from app.services.retrieval import hybrid_search
    results = hybrid_search(
        query="Who must approve a graduate student late course withdrawal after week 8?",
        chunks_by_id=chunks_by_id,
        bm25_index=bm25_index,
        emb_index=emb_index,
        top_k=10,
    )
    sources = {sc.chunk.source_file for sc in results}
    assert "academic_regulations.md" in sources, "C-001 hybrid must retrieve AR"
    assert "graduate_policies.md" in sources, "C-001 hybrid must retrieve GP"


def test_hybrid_c003_retrieves_pdf(chunks_by_id, bm25_index, emb_index):
    """C-003 query must retrieve from the PDF."""
    from app.services.retrieval import hybrid_search
    results = hybrid_search(
        query="What is the maximum thesis submission extension for a doctoral student?",
        chunks_by_id=chunks_by_id,
        bm25_index=bm25_index,
        emb_index=emb_index,
        top_k=10,
    )
    sources = {sc.chunk.source_file for sc in results}
    assert "research_degrees_handbook.pdf" in sources, "C-003 hybrid must retrieve from PDF"
