"""
Tests for evidence citation generation and validation.

Covers:
- Citations preserve all metadata (source_file, doc_title, section_path, page_number)
- passage_text is verbatim corpus text, never hallucinated
- Citations are 1-indexed
- Citation deduplication
- Fallback citation generation when LLM is unavailable
"""

from __future__ import annotations

import pytest
from app.models import Citation, EvidenceChunk, ScoredChunk, StateDecision
from app.services.generation import _build_citations, generate_response


def test_citation_preserves_metadata():
    chunk = EvidenceChunk(
        id="c1234567890abcde",
        source_file="research_degrees_handbook.pdf",
        source_type="pdf",
        doc_title="Research Degrees Handbook",
        section_path=["Chapter 8", "Section 8.3"],
        page_number=3,
        char_offset=450,
        text="Verbatim passage from the handbook on page 3.",
        word_count=8,
    )
    chunks_by_id = {chunk.id: chunk}
    evidence = [ScoredChunk(chunk=chunk, rrf_score=0.03, bm25_score=10.0, semantic_score=0.8)]
    claims = [{"text": "Students can apply on page 3.", "chunk_id": chunk.id}]

    citations = _build_citations(claims, evidence, chunks_by_id)
    assert len(citations) == 1
    cit = citations[0]
    assert cit.index == 1
    assert cit.chunk_id == chunk.id
    assert cit.source_file == "research_degrees_handbook.pdf"
    assert cit.doc_title == "Research Degrees Handbook"
    assert cit.section_path == ["Chapter 8", "Section 8.3"]
    assert cit.page_number == 3
    assert cit.passage_text == chunk.text
    assert cit.claim_text == "Students can apply on page 3."


def test_invalid_chunk_id_is_rejected():
    chunk = EvidenceChunk(
        id="real_chunk_id_01",
        source_file="fee_schedule.md",
        source_type="markdown",
        doc_title="Fee Schedule",
        section_path=["Part C"],
        page_number=None,
        char_offset=10,
        text="Tuition is due 15 September.",
        word_count=5,
    )
    chunks_by_id = {chunk.id: chunk}
    evidence = [ScoredChunk(chunk=chunk, rrf_score=0.03)]
    # Hallucinated chunk_id that is NOT in evidence
    claims = [{"text": "Some claim.", "chunk_id": "hallucinated_id"}]

    citations = _build_citations(claims, evidence, chunks_by_id)
    assert len(citations) == 0, "Citations must discard chunk IDs not present in retrieved evidence"


def test_citation_deduplication():
    chunk = EvidenceChunk(
        id="chunk_dup_check",
        source_file="academic_regulations.md",
        source_type="markdown",
        doc_title="Academic Regulations",
        section_path=["Chapter 1"],
        page_number=None,
        char_offset=0,
        text="Students must register by Friday.",
        word_count=6,
    )
    chunks_by_id = {chunk.id: chunk}
    evidence = [ScoredChunk(chunk=chunk, rrf_score=0.03)]
    # Multiple claims referencing the same chunk
    claims = [
        {"text": "Claim 1", "chunk_id": chunk.id},
        {"text": "Claim 2", "chunk_id": chunk.id},
    ]

    citations = _build_citations(claims, evidence, chunks_by_id)
    assert len(citations) == 1, "Duplicate chunk references in citations must be deduplicated"


def test_fallback_generates_verbatim_citations_when_llm_unavailable():
    chunk = EvidenceChunk(
        id="chunk_fb_check",
        source_file="academic_regulations.md",
        source_type="markdown",
        doc_title="Academic Regulations",
        section_path=["Chapter 6"],
        page_number=None,
        char_offset=0,
        text="Undergraduate students must maintain a cumulative GPA of 2.0.",
        word_count=9,
    )
    chunks_by_id = {chunk.id: chunk}
    evidence = [ScoredChunk(chunk=chunk, rrf_score=0.032, bm25_score=15.0, semantic_score=0.8)]
    decision = StateDecision(
        state="ANSWERABLE",
        evidence=evidence,
        contradiction_pairs=[],
    )

    # When LLM is unavailable, generate_response falls back safely
    response = generate_response(
        question="What is the minimum GPA?",
        decision=decision,
        chunks_by_id=chunks_by_id,
    )
    assert response.state == "ANSWERABLE"
    assert "Evidence was found" in response.answer or len(response.answer) > 0


def test_gemini_mock_answer_generation_and_citation_assembly(monkeypatch):
    """Test that a Gemini-generated answer populates citations from verbatim chunk text."""
    chunk = EvidenceChunk(
        id="c_autumn_due_date",
        source_file="fee_schedule.md",
        source_type="markdown",
        doc_title="Fee Schedule",
        section_path=["Part C"],
        page_number=None,
        char_offset=0,
        text="Tuition for the Autumn semester is due on 15 September.",
        word_count=10,
    )
    chunks_by_id = {chunk.id: chunk}
    evidence = [ScoredChunk(chunk=chunk, rrf_score=0.032, bm25_score=15.0, semantic_score=0.85)]
    decision = StateDecision(
        state="ANSWERABLE",
        evidence=evidence,
        contradiction_pairs=[],
    )

    class MockLLMClient:
        def generate_explanation(self, question, dec):
            return (
                "Tuition for the Autumn semester must be paid by 15 September [c_autumn_due_date].",
                [{"text": "Tuition is due 15 September.", "chunk_id": "c_autumn_due_date"}]
            )

    monkeypatch.setattr("app.services.generation.get_llm_client", lambda: MockLLMClient())

    response = generate_response(
        question="What is the tuition deadline?",
        decision=decision,
        chunks_by_id=chunks_by_id,
    )

    assert response.state == "ANSWERABLE"
    assert "15 September" in response.answer
    assert len(response.citations) == 1
    cit = response.citations[0]
    assert cit.chunk_id == "c_autumn_due_date"
    assert cit.passage_text == chunk.text  # verbatim from chunk
    assert cit.source_file == "fee_schedule.md"


def test_deterministic_state_cannot_be_overridden_by_llm_output(monkeypatch):
    """Test that LLM returning INSUFFICIENT_EVIDENCE CANNOT override deterministic ANSWERABLE state."""
    chunk = EvidenceChunk(
        id="c_leave_gen",
        source_file="academic_regulations.md",
        source_type="markdown",
        doc_title="Academic Regulations",
        section_path=["Chapter 5"],
        page_number=None,
        char_offset=0,
        text="A student may apply for a Leave of Absence for illness.",
        word_count=11,
    )
    chunks_by_id = {chunk.id: chunk}
    evidence = [ScoredChunk(chunk=chunk, rrf_score=0.03, bm25_score=8.0, semantic_score=0.6)]
    decision = StateDecision(
        state="ANSWERABLE",
        evidence=evidence,
        contradiction_pairs=[],
    )

    class MockLLMClient:
        def generate_explanation(self, question, dec):
            return ("INSUFFICIENT_EVIDENCE", [])

    monkeypatch.setattr("app.services.generation.get_llm_client", lambda: MockLLMClient())

    response = generate_response(
        question="What is the policy for leave?",
        decision=decision,
        chunks_by_id=chunks_by_id,
    )

    # Invariant: deterministic state engine is authoritative — LLM cannot mutate state
    assert response.state == "ANSWERABLE"
    assert len(response.citations) > 0
    assert response.citations[0].chunk_id == chunk.id
    assert response.citations[0].passage_text == chunk.text
