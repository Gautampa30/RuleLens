"""
Tests for Pydantic models: EvidenceChunk, PolicyClaim, ContradictionPair, etc.

Covers:
- Valid models can be instantiated
- Required fields are enforced
- Validators catch invalid data
- Chunk ID formula is correct
- PolicyClaim ID formula is correct
"""

from __future__ import annotations

import pytest
from pydantic import ValidationError


# ─────────────────────────────────────────────────────────────────────────────
# EvidenceChunk
# ─────────────────────────────────────────────────────────────────────────────

def make_chunk(**overrides):
    from app.models import EvidenceChunk
    base = dict(
        id="abc123",
        source_file="academic_regulations.md",
        source_type="markdown",
        doc_title="Academic Regulations",
        section_path=["Chapter 5", "Section 5.3"],
        page_number=None,
        char_offset=1024,
        text="Late withdrawal requests must be approved by the Dean.",
        word_count=10,
    )
    base.update(overrides)
    return EvidenceChunk.model_validate(base)


def test_evidence_chunk_valid():
    c = make_chunk()
    assert c.id == "abc123"
    assert c.source_type == "markdown"
    assert c.page_number is None


def test_evidence_chunk_pdf_with_page():
    c = make_chunk(source_type="pdf", page_number=3)
    assert c.page_number == 3


def test_evidence_chunk_empty_text_rejected():
    with pytest.raises(ValidationError):
        make_chunk(text="")


def test_evidence_chunk_blank_text_rejected():
    with pytest.raises(ValidationError):
        make_chunk(text="   ")


def test_evidence_chunk_invalid_source_type():
    with pytest.raises(ValidationError):
        make_chunk(source_type="docx")


def test_chunk_id_formula_stability():
    """Same inputs must always produce the same ID."""
    from app.models import EvidenceChunk
    id1 = EvidenceChunk.make_id("foo.md", 100, "Some policy text here.")
    id2 = EvidenceChunk.make_id("foo.md", 100, "Some policy text here.")
    assert id1 == id2


def test_chunk_id_different_for_different_inputs():
    from app.models import EvidenceChunk
    id1 = EvidenceChunk.make_id("a.md", 0, "Text A")
    id2 = EvidenceChunk.make_id("b.md", 0, "Text A")
    id3 = EvidenceChunk.make_id("a.md", 1, "Text A")
    assert id1 != id2
    assert id1 != id3


def test_chunk_id_length():
    from app.models import EvidenceChunk
    cid = EvidenceChunk.make_id("test.md", 42, "Example text")
    assert len(cid) == 16, f"Expected 16-char ID; got {len(cid)}"


def test_evidence_chunk_section_path_defaults_to_list():
    from app.models import EvidenceChunk
    c = EvidenceChunk.model_validate({
        "id": "x",
        "source_file": "f.md",
        "source_type": "markdown",
        "doc_title": "T",
        "char_offset": 0,
        "text": "Some content here for the test.",
        "word_count": 6,
    })
    assert isinstance(c.section_path, list)


# ─────────────────────────────────────────────────────────────────────────────
# PolicyClaim
# ─────────────────────────────────────────────────────────────────────────────

def make_claim(**overrides):
    from app.models import PolicyClaim
    base = dict(
        id="claim001",
        chunk_id="abc123",
        source_file="academic_regulations.md",
        claim_type="approval",
        policy_subject="late_course_withdrawal_approval",
        affected_population="graduate",
        condition="after_week_8",
        attribute="approval_authority",
        operator="must",
        value="Dean of the student's faculty",
        value_unit="authority",
        negated=False,
        exceptions=[],
        raw_text="Late withdrawal requests must be reviewed and approved by the Dean.",
        extraction_confidence=0.95,
    )
    base.update(overrides)
    return PolicyClaim.model_validate(base)


def test_policy_claim_valid():
    claim = make_claim()
    assert claim.policy_subject == "late_course_withdrawal_approval"
    assert claim.claim_type == "approval"


def test_policy_claim_invalid_claim_type():
    with pytest.raises(ValidationError):
        make_claim(claim_type="unknown_type")


def test_policy_claim_invalid_confidence_high():
    with pytest.raises(ValidationError):
        make_claim(extraction_confidence=1.5)


def test_policy_claim_invalid_confidence_low():
    with pytest.raises(ValidationError):
        make_claim(extraction_confidence=-0.1)


def test_policy_claim_exceptions_defaults_to_list():
    c = make_claim(exceptions=None)
    # Pydantic should coerce None → [] or raise; must not crash
    assert isinstance(c.exceptions, list)


def test_policy_claim_id_formula():
    from app.models import PolicyClaim
    id1 = PolicyClaim.make_id("chunk001", "Late withdrawal must be approved by Dean.")
    id2 = PolicyClaim.make_id("chunk001", "Late withdrawal must be approved by Dean.")
    assert id1 == id2
    assert len(id1) == 12


def test_policy_claim_negated_defaults_false():
    claim = make_claim()
    assert claim.negated is False


def test_policy_claim_threshold_type():
    claim = make_claim(
        claim_type="threshold",
        policy_subject="undergraduate_good_academic_standing",
        value="2.0",
        value_unit="gpa",
        operator=">=",
    )
    assert claim.claim_type == "threshold"
    assert claim.value_unit == "gpa"


# ─────────────────────────────────────────────────────────────────────────────
# ContradictionPair and ConflictingClaimDetail
# ─────────────────────────────────────────────────────────────────────────────

def test_contradiction_pair_valid():
    from app.models import ContradictionPair, ConflictingClaimDetail
    detail = ConflictingClaimDetail(
        chunk_id="abc",
        source_file="a.md",
        section_path=["Ch 5"],
        page_number=None,
        passage_text="Dean approves.",
        policy_subject="late_withdrawal_approval",
        claim_type="approval",
        value="Dean",
        value_unit="authority",
        raw_text="Dean approves.",
    )
    pair = ContradictionPair(
        conflict_type="approval",
        policy_subject="late_withdrawal_approval",
        claim_a=detail,
        claim_b=detail,
        explanation="Source A and Source B name different approving authorities.",
    )
    assert pair.policy_subject == "late_withdrawal_approval"


# ─────────────────────────────────────────────────────────────────────────────
# QueryRequest / QueryResponse
# ─────────────────────────────────────────────────────────────────────────────

def test_query_request_min_length():
    from app.models import QueryRequest
    with pytest.raises(ValidationError):
        QueryRequest(question="ab")  # min_length=3


def test_query_request_max_length():
    from app.models import QueryRequest
    with pytest.raises(ValidationError):
        QueryRequest(question="x" * 1001)  # max_length=1000


def test_query_response_valid_states():
    from app.models import QueryResponse
    for state in ["ANSWERABLE", "UNKNOWN", "CONTRADICTORY"]:
        r = QueryResponse(state=state, answer="Test answer")
        assert r.state == state


def test_query_response_invalid_state():
    from app.models import QueryResponse
    with pytest.raises(ValidationError):
        QueryResponse(state="MAYBE", answer="Test")
