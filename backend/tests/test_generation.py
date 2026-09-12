"""
Tests for Phase 4A: Grounded answer generation and invariants.

Invariants tested:
1. Deterministic state cannot be overridden by LLM output
2. ANSWERABLE responses contain valid citations
3. UNKNOWN does not fabricate an answer
4. CONTRADICTORY contains both conflicting provisions
5. Citation text exactly matches stored evidence
6. Missing/unavailable LLM provider does not break deterministic classification
"""

import pytest
from app.models import (
    ConflictingClaimDetail,
    ContradictionPair,
    EvidenceChunk,
    ScoredChunk,
    StateDecision,
)
from app.services.generation import generate_response
from app.services.llm import LLMUnavailableError


@pytest.fixture
def sample_chunk_a():
    return EvidenceChunk(
        id="chunk_test_a01",
        source_file="academic_regulations.md",
        source_type="markdown",
        doc_title="Ashford University Academic Regulations",
        section_path=["Chapter 5", "5.3 Late Course Withdrawal"],
        page_number=None,
        char_offset=100,
        text="Late withdrawal requests must be reviewed and approved by the Dean of the student's faculty.",
        word_count=15,
    )


@pytest.fixture
def sample_chunk_b():
    return EvidenceChunk(
        id="chunk_test_b02",
        source_file="graduate_policies.md",
        source_type="markdown",
        doc_title="Ashford University Graduate Studies Policy",
        section_path=["Section 2", "2.6 Late Course Withdrawal for Graduate Students"],
        page_number=None,
        char_offset=200,
        text="Such requests must be reviewed and approved by the Graduate Studies Committee, which meets bi-weekly.",
        word_count=15,
    )


def test_deterministic_state_cannot_be_overridden_by_llm_answerable(sample_chunk_a, monkeypatch):
    """Even if the LLM attempts to claim UNKNOWN or INSUFFICIENT_EVIDENCE, state remains ANSWERABLE."""
    chunks_by_id = {sample_chunk_a.id: sample_chunk_a}
    evidence = [ScoredChunk(chunk=sample_chunk_a, rrf_score=0.035, bm25_score=12.0, semantic_score=0.88)]
    decision = StateDecision(state="ANSWERABLE", evidence=evidence, contradiction_pairs=[])

    class RogueLLMClient:
        def generate_explanation(self, q, dec):
            # Attempt to override or claim insufficient evidence
            return ("INSUFFICIENT_EVIDENCE: I cannot answer this.", [])

    monkeypatch.setattr("app.services.generation.get_llm_client", lambda: RogueLLMClient())

    resp = generate_response("Who approves late withdrawal?", decision, chunks_by_id)
    assert resp.state == "ANSWERABLE"
    assert len(resp.citations) == 1
    assert resp.citations[0].chunk_id == sample_chunk_a.id


def test_unknown_state_never_changed_by_llm(sample_chunk_a, monkeypatch):
    """When decision is UNKNOWN, the LLM cannot mutate state to ANSWERABLE."""
    chunks_by_id = {sample_chunk_a.id: sample_chunk_a}
    evidence = [ScoredChunk(chunk=sample_chunk_a, rrf_score=0.01)]
    decision = StateDecision(state="UNKNOWN", unknown_reason="low_confidence", evidence=evidence)

    class HallucinatingLLMClient:
        def generate_explanation(self, q, dec):
            return ("Here is an invented answer claiming the rule is X.", [{"text": "Rule X", "chunk_id": sample_chunk_a.id}])

    monkeypatch.setattr("app.services.generation.get_llm_client", lambda: HallucinatingLLMClient())

    resp = generate_response("What is the military leave policy?", decision, chunks_by_id)
    assert resp.state == "UNKNOWN"
    assert "does not contain sufficient information" in resp.answer
    assert len(resp.citations) == 0
    assert len(resp.related_evidence) == 1


def test_contradictory_state_never_resolved_by_llm(sample_chunk_a, sample_chunk_b, monkeypatch):
    """When decision is CONTRADICTORY, the LLM cannot resolve it or change state."""
    chunks_by_id = {sample_chunk_a.id: sample_chunk_a, sample_chunk_b.id: sample_chunk_b}
    pair = ContradictionPair(
        conflict_type="approval",
        policy_subject="late_course_withdrawal_approval",
        claim_a=ConflictingClaimDetail(
            chunk_id=sample_chunk_a.id,
            source_file=sample_chunk_a.source_file,
            section_path=sample_chunk_a.section_path,
            page_number=None,
            passage_text=sample_chunk_a.text,
            policy_subject="late_course_withdrawal_approval",
            claim_type="approval",
            affected_population="all_students",
            value="Dean of the student's faculty",
            value_unit="authority",
            raw_text=sample_chunk_a.text,
        ),
        claim_b=ConflictingClaimDetail(
            chunk_id=sample_chunk_b.id,
            source_file=sample_chunk_b.source_file,
            section_path=sample_chunk_b.section_path,
            page_number=None,
            passage_text=sample_chunk_b.text,
            policy_subject="late_course_withdrawal_approval",
            claim_type="approval",
            affected_population="graduate",
            value="Graduate Studies Committee",
            value_unit="authority",
            raw_text=sample_chunk_b.text,
        ),
        explanation="Conflicting approval authorities: Dean vs Graduate Studies Committee.",
    )
    decision = StateDecision(
        state="CONTRADICTORY",
        evidence=[ScoredChunk(chunk=sample_chunk_a), ScoredChunk(chunk=sample_chunk_b)],
        contradiction_pairs=[pair],
    )

    class BiasedLLMClient:
        def generate_explanation(self, q, dec):
            return ("The Dean alone has authority; the committee is wrong.", [])

    monkeypatch.setattr("app.services.generation.get_llm_client", lambda: BiasedLLMClient())

    resp = generate_response("Who approves late course withdrawal?", decision, chunks_by_id)
    assert resp.state == "CONTRADICTORY"
    assert len(resp.contradiction_pairs) == 1
    assert resp.contradiction_pairs[0].claim_a.value == "Dean of the student's faculty"
    assert resp.contradiction_pairs[0].claim_b.value == "Graduate Studies Committee"


def test_answerable_response_contains_valid_citations(sample_chunk_a):
    """ANSWERABLE responses always contain valid server-side citations."""
    chunks_by_id = {sample_chunk_a.id: sample_chunk_a}
    evidence = [ScoredChunk(chunk=sample_chunk_a, rrf_score=0.035, bm25_score=14.0, semantic_score=0.9)]
    decision = StateDecision(state="ANSWERABLE", evidence=evidence, contradiction_pairs=[])

    resp = generate_response("Who approves late withdrawal?", decision, chunks_by_id)
    assert resp.state == "ANSWERABLE"
    assert len(resp.citations) >= 1
    cit = resp.citations[0]
    assert cit.chunk_id == sample_chunk_a.id
    assert cit.source_file == sample_chunk_a.source_file
    assert cit.doc_title == sample_chunk_a.doc_title
    assert cit.section_path == sample_chunk_a.section_path
    assert cit.passage_text == sample_chunk_a.text


def test_citation_text_exactly_matches_stored_evidence(sample_chunk_a, sample_chunk_b):
    """Every citation's passage_text must strictly equal the verbatim stored chunk text."""
    chunks_by_id = {sample_chunk_a.id: sample_chunk_a, sample_chunk_b.id: sample_chunk_b}
    evidence = [
        ScoredChunk(chunk=sample_chunk_a, rrf_score=0.035),
        ScoredChunk(chunk=sample_chunk_b, rrf_score=0.030),
    ]
    decision = StateDecision(state="ANSWERABLE", evidence=evidence, contradiction_pairs=[])

    resp = generate_response("Test question", decision, chunks_by_id)
    for cit in resp.citations:
        original = chunks_by_id[cit.chunk_id]
        assert cit.passage_text == original.text
        assert cit.source_file == original.source_file


def test_missing_llm_provider_preserves_deterministic_classification(sample_chunk_a, monkeypatch):
    """When GEMINI_API_KEY is not set (LLM unavailable), system functions deterministically."""
    chunks_by_id = {sample_chunk_a.id: sample_chunk_a}
    evidence = [ScoredChunk(chunk=sample_chunk_a, rrf_score=0.035)]
    decision = StateDecision(state="ANSWERABLE", evidence=evidence, contradiction_pairs=[])

    class UnavailableClient:
        def generate_explanation(self, q, dec):
            raise LLMUnavailableError("GEMINI_API_KEY is not set.")

    monkeypatch.setattr("app.services.generation.get_llm_client", lambda: UnavailableClient())

    resp = generate_response("Test question", decision, chunks_by_id)
    assert resp.state == "ANSWERABLE"
    assert "LLM generation unavailable" in resp.answer
    assert len(resp.citations) == 1
    assert resp.citations[0].passage_text == sample_chunk_a.text
