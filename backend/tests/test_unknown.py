"""
Tests for UNKNOWN query handling and near-miss identification.

Covers:
- Nonsense and unrelated queries yield UNKNOWN state
- Plausible near-miss questions from the corpus yield UNKNOWN state
- Unknown reason is machine-readable ('no_evidence' or 'low_confidence')
- Related evidence is attached to QueryResponse when state is UNKNOWN
"""

from __future__ import annotations

import pytest
from app.models import EvidenceChunk, ScoredChunk, StateDecision
from app.services.decision import decide_state
from app.services.generation import generate_response
from app.services.retrieval import hybrid_search


def test_nonsense_query_retrieval_returns_empty(bm25_index, emb_index, chunks_by_id):
    """Nonsense query with no vocabulary overlap returns empty results."""
    results = hybrid_search(
        query="qwertyuiop asdfghjkl zxcvbnm completely unrelated nonexistent query",
        chunks_by_id=chunks_by_id,
        bm25_index=bm25_index,
        emb_index=emb_index,
        top_k=5,
    )
    assert len(results) == 0, "Nonsense query should be filtered out by threshold"


def test_nonsense_query_decision_is_unknown(bm25_index, emb_index, chunks_by_id):
    results = hybrid_search(
        query="qwertyuiop asdfghjkl zxcvbnm",
        chunks_by_id=chunks_by_id,
        bm25_index=bm25_index,
        emb_index=emb_index,
        top_k=5,
    )
    decision = decide_state(results, {}, chunks_by_id)
    assert decision.state == "UNKNOWN"
    assert decision.unknown_reason == "no_evidence"


def test_unknown_response_attaches_related_evidence():
    chunk = EvidenceChunk(
        id="rel_chunk_01",
        source_file="academic_regulations.md",
        source_type="markdown",
        doc_title="Academic Regulations",
        section_path=["Chapter 5"],
        page_number=None,
        char_offset=0,
        text="Standard leave of absence is permitted for up to one year.",
        word_count=11,
    )
    # Low confidence evidence (e.g., military leave asked, but only general leave found)
    evidence = [ScoredChunk(chunk=chunk, rrf_score=0.002, bm25_score=0.5, semantic_score=0.15)]
    decision = decide_state(evidence, {}, {chunk.id: chunk})
    assert decision.state == "UNKNOWN"

    response = generate_response(
        question="What is the policy on military leave of absence?",
        decision=decision,
        chunks_by_id={chunk.id: chunk},
    )
    assert response.state == "UNKNOWN"
    assert len(response.related_evidence) == 1
    assert response.related_evidence[0].id == chunk.id
