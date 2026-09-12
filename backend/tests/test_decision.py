"""
Tests for the deterministic three-state decision engine.

Covers:
- Empty evidence -> UNKNOWN (no_evidence)
- Low confidence score -> UNKNOWN (low_confidence)
- Solid consistent evidence -> ANSWERABLE
- Conflicting provisions for C-001 -> CONTRADICTORY
- Conflicting provisions for C-002 -> CONTRADICTORY
- Conflicting provisions for C-003 -> CONTRADICTORY
- Deterministic behavior
"""

from __future__ import annotations

import pytest
from app.models import EvidenceChunk, PolicyClaim, ScoredChunk
from app.services.decision import decide_state
from app.services.contradiction import find_contradiction_pairs


def test_empty_evidence_is_unknown():
    result = decide_state(evidence=[], claims_by_chunk_id={}, chunks_by_id={})
    assert result.state == "UNKNOWN"
    assert result.unknown_reason == "no_evidence"
    assert result.evidence == []
    assert result.contradiction_pairs == []


def test_low_confidence_is_unknown():
    chunk = EvidenceChunk(
        id="chunk_low",
        source_file="academic_regulations.md",
        source_type="markdown",
        doc_title="Academic Regulations",
        section_path=["General"],
        page_number=None,
        char_offset=0,
        text="A passing mention of some general guidance.",
        word_count=7,
    )
    # RRF score below normalized threshold
    evidence = [ScoredChunk(chunk=chunk, rrf_score=0.001, bm25_score=0.0, semantic_score=0.05)]
    result = decide_state(evidence=evidence, claims_by_chunk_id={}, chunks_by_id={chunk.id: chunk})
    assert result.state == "UNKNOWN"
    assert result.unknown_reason == "low_confidence"


def test_consistent_evidence_is_answerable():
    chunk = EvidenceChunk(
        id="chunk_ans",
        source_file="fee_schedule.md",
        source_type="markdown",
        doc_title="Fee Schedule",
        section_path=["Part C"],
        page_number=None,
        char_offset=0,
        text="[Table: Semester: Autumn | Due Date: 15 September | Notes: Standard Tuition]",
        word_count=11,
    )
    evidence = [ScoredChunk(chunk=chunk, rrf_score=0.032, bm25_score=14.0, semantic_score=0.75)]
    result = decide_state(evidence=evidence, claims_by_chunk_id={}, chunks_by_id={chunk.id: chunk})
    assert result.state == "ANSWERABLE"
    assert result.contradiction_pairs == []
    assert len(result.evidence) == 1


def test_c001_claims_trigger_contradictory():
    """C-001: Dean vs Graduate Studies Committee for late withdrawal."""
    c_ar = EvidenceChunk(
        id="c_ar_late",
        source_file="academic_regulations.md",
        source_type="markdown",
        doc_title="Academic Regulations",
        section_path=["Chapter 5", "Section 5.3"],
        page_number=None,
        char_offset=0,
        text="Late withdrawal requests must be reviewed and approved by the Dean of the student's faculty.",
        word_count=15,
    )
    c_gp = EvidenceChunk(
        id="c_gp_late",
        source_file="graduate_policies.md",
        source_type="markdown",
        doc_title="Graduate Policies",
        section_path=["Section 2", "Section 2.6"],
        page_number=None,
        char_offset=0,
        text="Such requests must be reviewed and approved by the Graduate Studies Committee.",
        word_count=12,
    )
    claim_ar = PolicyClaim(
        id="cl_ar_01",
        chunk_id=c_ar.id,
        source_file=c_ar.source_file,
        claim_type="approval",
        policy_subject="late_course_withdrawal_approval",
        affected_population="all_students",
        condition="after_week_8",
        attribute="approval_authority",
        operator="must",
        value="Dean of the student's faculty",
        value_unit="authority",
        raw_text=c_ar.text,
    )
    claim_gp = PolicyClaim(
        id="cl_gp_01",
        chunk_id=c_gp.id,
        source_file=c_gp.source_file,
        claim_type="approval",
        policy_subject="late_course_withdrawal_approval",
        affected_population="graduate",
        condition="after_week_8",
        attribute="approval_authority",
        operator="must",
        value="Graduate Studies Committee",
        value_unit="authority",
        raw_text=c_gp.text,
    )
    evidence = [
        ScoredChunk(chunk=c_ar, rrf_score=0.032, bm25_score=15.0, semantic_score=0.78),
        ScoredChunk(chunk=c_gp, rrf_score=0.031, bm25_score=14.5, semantic_score=0.76),
    ]
    claims_by_chunk_id = {c_ar.id: [claim_ar], c_gp.id: [claim_gp]}
    chunks_by_id = {c_ar.id: c_ar, c_gp.id: c_gp}

    result = decide_state(evidence=evidence, claims_by_chunk_id=claims_by_chunk_id, chunks_by_id=chunks_by_id)
    assert result.state == "CONTRADICTORY"
    assert len(result.contradiction_pairs) == 1
    pair = result.contradiction_pairs[0]
    assert pair.conflict_type == "approval"
    assert pair.policy_subject == "late_course_withdrawal_approval"


def test_c002_claims_trigger_contradictory():
    """C-002: 2.0 cumulative GPA vs 2.3 probation GPA for Good Standing."""
    c_ar = EvidenceChunk(
        id="c_ar_gpa",
        source_file="academic_regulations.md",
        source_type="markdown",
        doc_title="Academic Regulations",
        section_path=["Chapter 6", "Section 6.1"],
        page_number=None,
        char_offset=0,
        text="Undergraduate students must maintain a cumulative GPA of 2.0 or above to remain in Good Academic Standing.",
        word_count=17,
    )
    c_ac = EvidenceChunk(
        id="c_ac_gpa",
        source_file="appeals_and_conduct.md",
        source_type="markdown",
        doc_title="Appeals Policy",
        section_path=["Part 3", "Section 3.2"],
        page_number=None,
        char_offset=0,
        text="An undergraduate student on Academic Probation must achieve a term GPA of at least 2.3 in the probationary semester to be removed from probationary status.",
        word_count=24,
    )
    claim_ar = PolicyClaim(
        id="cl_ar_02",
        chunk_id=c_ar.id,
        source_file=c_ar.source_file,
        claim_type="threshold",
        policy_subject="undergraduate_good_academic_standing",
        affected_population="undergraduate",
        condition=None,
        attribute="minimum_gpa",
        operator=">=",
        value="2.0",
        value_unit="gpa",
        raw_text=c_ar.text,
    )
    claim_ac = PolicyClaim(
        id="cl_ac_02",
        chunk_id=c_ac.id,
        source_file=c_ac.source_file,
        claim_type="threshold",
        policy_subject="undergraduate_good_academic_standing",
        affected_population="undergraduate",
        condition=None,
        attribute="minimum_gpa",
        operator=">=",
        value="2.3",
        value_unit="gpa",
        raw_text=c_ac.text,
    )
    evidence = [
        ScoredChunk(chunk=c_ar, rrf_score=0.030, bm25_score=12.0, semantic_score=0.72),
        ScoredChunk(chunk=c_ac, rrf_score=0.029, bm25_score=11.5, semantic_score=0.70),
    ]
    claims_by_chunk_id = {c_ar.id: [claim_ar], c_ac.id: [claim_ac]}
    chunks_by_id = {c_ar.id: c_ar, c_ac.id: c_ac}

    result = decide_state(evidence=evidence, claims_by_chunk_id=claims_by_chunk_id, chunks_by_id=chunks_by_id)
    assert result.state == "CONTRADICTORY"
    assert len(result.contradiction_pairs) == 1
    assert result.contradiction_pairs[0].conflict_type == "threshold"


def test_c003_claims_trigger_contradictory():
    """C-003: 16 weeks (one term) vs 26 weeks (six months) for thesis extension."""
    c_gp = EvidenceChunk(
        id="c_gp_ext",
        source_file="graduate_policies.md",
        source_type="markdown",
        doc_title="Graduate Policies",
        section_path=["Section 5", "Section 5.4"],
        page_number=None,
        char_offset=0,
        text="The maximum extension that may be granted under this provision is one academic term (sixteen weeks).",
        word_count=16,
    )
    c_pdf = EvidenceChunk(
        id="c_pdf_ext",
        source_file="research_degrees_handbook.pdf",
        source_type="pdf",
        doc_title="Research Degrees Handbook",
        section_path=["Chapter 8", "Section 8.3"],
        page_number=3,
        char_offset=0,
        text="The Dean of Graduate Studies may grant an extension of up to six months.",
        word_count=14,
    )
    claim_gp = PolicyClaim(
        id="cl_gp_03",
        chunk_id=c_gp.id,
        source_file=c_gp.source_file,
        claim_type="duration",
        policy_subject="thesis_submission_extension",
        affected_population="graduate",
        condition=None,
        attribute="max_duration",
        operator="<=",
        value="16 weeks",
        value_unit="duration_weeks",
        raw_text=c_gp.text,
    )
    claim_pdf = PolicyClaim(
        id="cl_pdf_03",
        chunk_id=c_pdf.id,
        source_file=c_pdf.source_file,
        claim_type="duration",
        policy_subject="thesis_submission_extension",
        affected_population="doctoral",
        condition=None,
        attribute="max_duration",
        operator="<=",
        value="26 weeks",
        value_unit="duration_weeks",
        raw_text=c_pdf.text,
    )
    evidence = [
        ScoredChunk(chunk=c_gp, rrf_score=0.031, bm25_score=13.0, semantic_score=0.74),
        ScoredChunk(chunk=c_pdf, rrf_score=0.030, bm25_score=12.5, semantic_score=0.71),
    ]
    claims_by_chunk_id = {c_gp.id: [claim_gp], c_pdf.id: [claim_pdf]}
    chunks_by_id = {c_gp.id: c_gp, c_pdf.id: c_pdf}

    result = decide_state(evidence=evidence, claims_by_chunk_id=claims_by_chunk_id, chunks_by_id=chunks_by_id)
    assert result.state == "CONTRADICTORY"
    assert len(result.contradiction_pairs) == 1
    assert result.contradiction_pairs[0].conflict_type == "duration"
