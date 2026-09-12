"""
Tests for the deterministic contradiction detection logic.

Covers:
- Population overlap logic (all permutations)
- Condition mutual exclusion logic
- Value conflict detection for numeric, authority, and date units
- find_contradiction_pairs does not hard-code contradictions
- Conditional rules are NOT automatically flagged
- Cross-file vs same-file comparisons
- Decision engine state transitions
"""

from __future__ import annotations

import pytest


# ─────────────────────────────────────────────────────────────────────────────
# Population overlap
# ─────────────────────────────────────────────────────────────────────────────

def test_all_students_overlaps_with_any(  ):
    from app.services.contradiction import populations_overlap
    for pop in ["undergraduate", "graduate", "doctoral", "international", "part_time"]:
        assert populations_overlap("all_students", pop), f"all_students must overlap {pop}"


def test_undergraduate_does_not_overlap_graduate():
    from app.services.contradiction import populations_overlap
    assert not populations_overlap("undergraduate", "graduate")
    assert not populations_overlap("graduate", "undergraduate")


def test_doctoral_overlaps_graduate():
    from app.services.contradiction import populations_overlap
    assert populations_overlap("doctoral", "graduate")
    assert populations_overlap("graduate", "doctoral")


def test_doctoral_overlaps_all_students():
    from app.services.contradiction import populations_overlap
    assert populations_overlap("doctoral", "all_students")


def test_same_population_overlaps_itself():
    from app.services.contradiction import populations_overlap
    for pop in ["undergraduate", "graduate", "doctoral", "all_students"]:
        assert populations_overlap(pop, pop), f"{pop} must overlap itself"


# ─────────────────────────────────────────────────────────────────────────────
# Condition exclusion
# ─────────────────────────────────────────────────────────────────────────────

def test_null_conditions_not_exclusive():
    from app.services.contradiction import conditions_are_mutually_exclusive
    assert not conditions_are_mutually_exclusive(None, None)


def test_one_null_condition_not_exclusive():
    from app.services.contradiction import conditions_are_mutually_exclusive
    assert not conditions_are_mutually_exclusive(None, "after_week_8")
    assert not conditions_are_mutually_exclusive("on_probation", None)


def test_before_after_week_are_exclusive():
    from app.services.contradiction import conditions_are_mutually_exclusive
    assert conditions_are_mutually_exclusive("before_week_8", "after_week_8")
    assert conditions_are_mutually_exclusive("after week 8", "before week 4")


def test_probation_good_standing_exclusive():
    from app.services.contradiction import conditions_are_mutually_exclusive
    assert conditions_are_mutually_exclusive("on_probation", "in_good_standing")


def test_same_condition_not_exclusive():
    from app.services.contradiction import conditions_are_mutually_exclusive
    assert not conditions_are_mutually_exclusive("after_week_8", "after_week_8")


# ─────────────────────────────────────────────────────────────────────────────
# Value conflict
# ─────────────────────────────────────────────────────────────────────────────

def make_claim(policy_subject="test_rule", value="2.0", value_unit="gpa",
               claim_type="threshold", population="all_students",
               negated=False, condition=None, source_file="a.md", chunk_id="x"):
    from app.models import PolicyClaim
    return PolicyClaim(
        id="cid",
        chunk_id=chunk_id,
        source_file=source_file,
        claim_type=claim_type,
        policy_subject=policy_subject,
        affected_population=population,
        condition=condition,
        attribute="min_gpa",
        operator=">=",
        value=value,
        value_unit=value_unit,
        negated=negated,
        exceptions=[],
        raw_text=f"The rule is {value}.",
        extraction_confidence=0.9,
    )


def test_numeric_conflict_different_values():
    from app.services.contradiction import values_conflict
    a = make_claim(value="2.0", value_unit="gpa")
    b = make_claim(value="2.3", value_unit="gpa")
    assert values_conflict(a, b)


def test_numeric_no_conflict_same_value():
    from app.services.contradiction import values_conflict
    a = make_claim(value="2.0", value_unit="gpa")
    b = make_claim(value="2.0", value_unit="gpa")
    assert not values_conflict(a, b)


def test_authority_conflict_different_authorities():
    from app.services.contradiction import values_conflict
    a = make_claim(value="Dean of the faculty", value_unit="authority", claim_type="approval")
    b = make_claim(value="Graduate Studies Committee", value_unit="authority", claim_type="approval")
    assert values_conflict(a, b)


def test_authority_no_conflict_same_authority():
    from app.services.contradiction import values_conflict
    a = make_claim(value="Dean of the faculty", value_unit="authority", claim_type="approval")
    b = make_claim(value="dean of the faculty", value_unit="authority", claim_type="approval")
    # Normalised → same
    assert not values_conflict(a, b)


def test_negation_mismatch_is_conflict():
    from app.services.contradiction import values_conflict
    a = make_claim(negated=False)
    b = make_claim(negated=True)
    assert values_conflict(a, b)


def test_duration_conflict_weeks_vs_months():
    from app.services.contradiction import values_conflict
    a = make_claim(value="16", value_unit="duration_weeks", claim_type="duration")
    b = make_claim(value="26", value_unit="duration_weeks", claim_type="duration")
    assert values_conflict(a, b)


# ─────────────────────────────────────────────────────────────────────────────
# find_contradiction_pairs with synthetic claims
# ─────────────────────────────────────────────────────────────────────────────

def test_finds_approval_contradiction():
    """Simulate C-001: Dean vs Graduate Studies Committee."""
    from app.services.contradiction import find_contradiction_pairs
    claim_a = make_claim(
        policy_subject="late_course_withdrawal_approval",
        value="Dean",
        value_unit="authority",
        claim_type="approval",
        population="all_students",
        condition="after_week_8",
        source_file="academic_regulations.md",
        chunk_id="chunk_ar",
    )
    claim_b = make_claim(
        policy_subject="late_course_withdrawal_approval",
        value="Graduate Studies Committee",
        value_unit="authority",
        claim_type="approval",
        population="graduate",
        condition="after_week_8",
        source_file="graduate_policies.md",
        chunk_id="chunk_gp",
    )
    pairs = find_contradiction_pairs([claim_a, claim_b], {})
    assert len(pairs) == 1
    assert pairs[0].policy_subject == "late_course_withdrawal_approval"
    assert pairs[0].conflict_type == "approval"


def test_finds_threshold_contradiction():
    """Simulate C-002: 2.0 vs 2.3 GPA threshold."""
    from app.services.contradiction import find_contradiction_pairs
    claim_a = make_claim(
        policy_subject="undergraduate_good_academic_standing",
        value="2.0",
        value_unit="gpa",
        claim_type="threshold",
        population="undergraduate",
        source_file="academic_regulations.md",
        chunk_id="chunk_ar2",
    )
    claim_b = make_claim(
        policy_subject="undergraduate_good_academic_standing",
        value="2.3",
        value_unit="gpa",
        claim_type="threshold",
        population="undergraduate",
        source_file="appeals_and_conduct.md",
        chunk_id="chunk_ac",
    )
    pairs = find_contradiction_pairs([claim_a, claim_b], {})
    assert len(pairs) == 1
    assert pairs[0].policy_subject == "undergraduate_good_academic_standing"


def test_finds_duration_contradiction():
    """Simulate C-003: 16 weeks vs 26 weeks extension."""
    from app.services.contradiction import find_contradiction_pairs
    claim_a = make_claim(
        policy_subject="thesis_submission_extension",
        value="16",
        value_unit="duration_weeks",
        claim_type="duration",
        population="graduate",
        source_file="graduate_policies.md",
        chunk_id="chunk_gp3",
    )
    claim_b = make_claim(
        policy_subject="thesis_submission_extension",
        value="26",
        value_unit="duration_weeks",
        claim_type="duration",
        population="doctoral",
        source_file="research_degrees_handbook.pdf",
        chunk_id="chunk_pdf",
    )
    pairs = find_contradiction_pairs([claim_a, claim_b], {})
    assert len(pairs) == 1
    assert pairs[0].policy_subject == "thesis_submission_extension"


def test_same_file_claims_never_contradict():
    """Claims from the same source file must not be flagged."""
    from app.services.contradiction import find_contradiction_pairs
    claim_a = make_claim(
        policy_subject="test_rule", value="2.0", source_file="a.md", chunk_id="c1"
    )
    claim_b = make_claim(
        policy_subject="test_rule", value="3.0", source_file="a.md", chunk_id="c2"
    )
    pairs = find_contradiction_pairs([claim_a, claim_b], {})
    assert len(pairs) == 0, "Same-file claims must never be flagged as contradictions"


def test_mutually_exclusive_conditions_not_contradictory():
    """Conditional rules covering different situations must not be flagged."""
    from app.services.contradiction import find_contradiction_pairs
    claim_a = make_claim(
        policy_subject="withdrawal_process",
        value="allowed",
        source_file="a.md",
        chunk_id="ca",
        condition="before_week_8",
    )
    claim_b = make_claim(
        policy_subject="withdrawal_process",
        value="requires_approval",
        source_file="b.md",
        chunk_id="cb",
        condition="after_week_8",
    )
    pairs = find_contradiction_pairs([claim_a, claim_b], {})
    assert len(pairs) == 0, "Mutually exclusive conditions must not be flagged"


def test_no_duplicate_pairs():
    """Each contradiction pair must be reported exactly once."""
    from app.services.contradiction import find_contradiction_pairs
    claim_a = make_claim(
        policy_subject="test_rule", value="X", value_unit="authority",
        claim_type="approval", source_file="a.md", chunk_id="ca"
    )
    claim_b = make_claim(
        policy_subject="test_rule", value="Y", value_unit="authority",
        claim_type="approval", source_file="b.md", chunk_id="cb"
    )
    pairs = find_contradiction_pairs([claim_a, claim_b, claim_a, claim_b], {})
    assert len(pairs) == 1, "Duplicate pairs must be deduplicated"


# ─────────────────────────────────────────────────────────────────────────────
# Decision engine state transitions
# ─────────────────────────────────────────────────────────────────────────────

def test_decision_unknown_on_empty_evidence():
    from app.models import EvidenceChunk, ScoredChunk
    from app.services.decision import decide_state
    result = decide_state([], {}, {})
    assert result.state == "UNKNOWN"
    assert result.unknown_reason == "no_evidence"


def test_decision_unknown_on_low_confidence():
    from app.models import EvidenceChunk, ScoredChunk
    from app.services.decision import decide_state
    chunk = EvidenceChunk(
        id="c1", source_file="a.md", source_type="markdown",
        doc_title="T", section_path=[], page_number=None,
        char_offset=0, text="Some loosely related policy text here.", word_count=7,
    )
    evidence = [ScoredChunk(chunk=chunk, rrf_score=0.001, bm25_score=0.0, semantic_score=0.0)]
    result = decide_state(evidence, {}, {"c1": chunk})
    assert result.state == "UNKNOWN"
    assert result.unknown_reason == "low_confidence"


def test_decision_answerable_with_good_evidence():
    from app.models import EvidenceChunk, ScoredChunk
    from app.services.decision import decide_state
    chunk = EvidenceChunk(
        id="c1", source_file="a.md", source_type="markdown",
        doc_title="T", section_path=[], page_number=None,
        char_offset=0, text="Undergraduate students must maintain 2.0 GPA.", word_count=8,
    )
    evidence = [ScoredChunk(chunk=chunk, rrf_score=0.5, bm25_score=1.0, semantic_score=0.8)]
    result = decide_state(evidence, {}, {"c1": chunk})
    assert result.state == "ANSWERABLE"
    assert result.contradiction_pairs == []


def test_decision_contradictory_with_conflict_claims():
    """Inject synthetic contradictory claims and expect CONTRADICTORY state."""
    from app.models import EvidenceChunk, PolicyClaim, ScoredChunk
    from app.services.decision import decide_state

    chunk_a = EvidenceChunk(
        id="c1", source_file="academic_regulations.md", source_type="markdown",
        doc_title="T", section_path=[], page_number=None,
        char_offset=0, text="The Dean approves late withdrawals.", word_count=7,
    )
    chunk_b = EvidenceChunk(
        id="c2", source_file="graduate_policies.md", source_type="markdown",
        doc_title="T", section_path=[], page_number=None,
        char_offset=0, text="The Graduate Committee is the sole approving authority.", word_count=9,
    )
    claim_a = PolicyClaim(
        id="cl1", chunk_id="c1", source_file="academic_regulations.md",
        claim_type="approval", policy_subject="late_withdrawal_approval",
        affected_population="all_students", condition="after_week_8",
        operator="must", value="Dean", value_unit="authority",
        negated=False, exceptions=[], raw_text="The Dean approves late withdrawals.",
        extraction_confidence=0.95,
    )
    claim_b = PolicyClaim(
        id="cl2", chunk_id="c2", source_file="graduate_policies.md",
        claim_type="approval", policy_subject="late_withdrawal_approval",
        affected_population="graduate", condition="after_week_8",
        operator="must", value="Graduate Studies Committee", value_unit="authority",
        negated=False, exceptions=[], raw_text="The Graduate Committee is the sole approving authority.",
        extraction_confidence=0.95,
    )

    evidence = [
        ScoredChunk(chunk=chunk_a, rrf_score=0.5, bm25_score=1.0, semantic_score=0.8),
        ScoredChunk(chunk=chunk_b, rrf_score=0.48, bm25_score=0.9, semantic_score=0.75),
    ]
    claims_by_chunk_id = {"c1": [claim_a], "c2": [claim_b]}
    chunks_by_id = {"c1": chunk_a, "c2": chunk_b}

    result = decide_state(evidence, claims_by_chunk_id, chunks_by_id)
    assert result.state == "CONTRADICTORY"
    assert len(result.contradiction_pairs) >= 1
