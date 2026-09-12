"""
Deterministic contradiction detection over structured PolicyClaims.

Algorithm (query-time only — no LLM involved):

For every pair (claim_a, claim_b) from different source files:
  1. policy_subject must match exactly (same topic)
  2. affected_population must overlap (same audience)
  3. conditions must NOT be mutually exclusive (same situation)
  4. claim_type must match (comparing same kind of rule)
  5. values must genuinely conflict (not just be different)

If all five tests pass → ContradictionPair is emitted.

Population model:
  The hierarchy all_students ⊃ {undergraduate, graduate, doctoral}
  allows detecting conflicts between a general rule and a subgroup rule.

Condition exclusion model:
  Simple keyword-based check. Conditions containing antonymous temporal
  or status markers are treated as mutually exclusive, which prevents
  false positives from conditional rules.

Value conflict:
  Numeric units: parse as float; conflict if |a - b| > NUMERIC_TOL
  Authority/text units: conflict if normalised strings differ
  Boolean (negated flag): conflict if one claim negates and the other affirms

Design note: hard-coded contradictions are PROHIBITED. This module must
discover conflicts purely from the claims extracted from the corpus.
"""

from __future__ import annotations

import logging
import re
from typing import Optional

from app.models import (
    ConflictingClaimDetail,
    ContradictionPair,
    EvidenceChunk,
    PolicyClaim,
)

logger = logging.getLogger(__name__)

# ─────────────────────────────────────────────────────────────────────────────
# Population hierarchy
# ─────────────────────────────────────────────────────────────────────────────

# child → set of parent/ancestor populations that include it
_POPULATION_ANCESTORS: dict[str, set[str]] = {
    "undergraduate":  {"undergraduate"},
    "graduate":       {"graduate"},
    "doctoral":       {"doctoral", "graduate"},
}

_CROSS_CUTTING = {"international", "part_time", "full_time"}


def populations_overlap(a: str, b: str) -> bool:
    """
    Return True if population a and population b share at least one member.

    Examples:
      graduate  × all_students  → True  (grad students are students)
      doctoral  × graduate      → True  (doctoral is a subset of graduate)
      undergraduate × doctoral  → False (disjoint subsets)
      all_students × part_time  → True  (part-time students are students)
    """
    if a == b:
        return True
    if a == "all_students" or b == "all_students":
        return True
    if a in _CROSS_CUTTING or b in _CROSS_CUTTING:
        return True
    ancestors_a = _POPULATION_ANCESTORS.get(a, {a})
    ancestors_b = _POPULATION_ANCESTORS.get(b, {b})
    return bool(ancestors_a & ancestors_b)


# ─────────────────────────────────────────────────────────────────────────────
# Condition exclusion
# ─────────────────────────────────────────────────────────────────────────────

# Pairs of keyword substrings that signal mutually exclusive conditions.
# If condition_a contains token_x and condition_b contains token_y (or vice
# versa), the conditions are treated as covering disjoint situations.
_EXCLUSIVE_PAIRS: list[tuple[str, str]] = [
    ("before_week", "after_week"),
    ("before week", "after week"),
    ("on_probation", "in_good_standing"),
    ("on probation", "in good standing"),
    ("undergraduate", "doctoral"),
    ("first_year", "final_year"),
    ("during_leave", "enrolled"),
]


def conditions_are_mutually_exclusive(
    cond_a: Optional[str], cond_b: Optional[str]
) -> bool:
    """
    Return True if cond_a and cond_b cannot both apply to the same event.

    Two None conditions → both unconditional → NOT mutually exclusive.
    One None, one non-None → not mutually exclusive (general vs specific).
    """
    if cond_a is None or cond_b is None:
        return False
    a_lower = cond_a.lower()
    b_lower = cond_b.lower()
    for tok_x, tok_y in _EXCLUSIVE_PAIRS:
        if (tok_x in a_lower and tok_y in b_lower) or (
            tok_y in a_lower and tok_x in b_lower
        ):
            return True
    return False


# ─────────────────────────────────────────────────────────────────────────────
# Value conflict detection
# ─────────────────────────────────────────────────────────────────────────────

# Units where values should be compared numerically
_NUMERIC_UNITS = {"gpa", "currency", "percent", "credit_hours",
                  "duration_weeks", "duration_months"}
_NUMERIC_TOL = 1e-6  # tolerance for floating-point comparison


def _extract_numeric(value: str) -> Optional[float]:
    """
    Extract the first numeric value from a string.
    E.g. "$75"→75.0, "2.3"→2.3, "one term"→None
    """
    m = re.search(r"[-+]?\d+\.?\d*", value.replace(",", ""))
    return float(m.group()) if m else None


def _normalise_authority(value: str) -> str:
    """Lowercase, strip punctuation, collapse whitespace."""
    return re.sub(r"\s+", " ", re.sub(r"[^\w\s]", "", value.lower())).strip()


def values_conflict(claim_a: PolicyClaim, claim_b: PolicyClaim) -> bool:
    """
    Return True if claim_a and claim_b assert incompatible values.

    Handles:
      - Numeric units: different numbers beyond tolerance
      - Authority: different normalised authority names
      - Negation mismatch: one affirms what the other denies
    """
    # Negation mismatch (one says "must", other says "must NOT")
    if claim_a.negated != claim_b.negated:
        return True

    unit = claim_a.value_unit or claim_b.value_unit

    if unit in _NUMERIC_UNITS:
        num_a = _extract_numeric(claim_a.value)
        num_b = _extract_numeric(claim_b.value)
        if num_a is not None and num_b is not None:
            return abs(num_a - num_b) > _NUMERIC_TOL
        # Cannot parse numerics — fall through to text comparison
    elif unit == "authority":
        return _normalise_authority(claim_a.value) != _normalise_authority(claim_b.value)
    elif unit == "date":
        # Simple string comparison for dates
        return claim_a.value.strip().lower() != claim_b.value.strip().lower()

    # Generic text comparison (normalised)
    return _normalise_authority(claim_a.value) != _normalise_authority(claim_b.value)


# ─────────────────────────────────────────────────────────────────────────────
# Main comparator
# ─────────────────────────────────────────────────────────────────────────────

def _make_conflict_detail(
    claim: PolicyClaim, chunk: Optional[EvidenceChunk]
) -> ConflictingClaimDetail:
    return ConflictingClaimDetail(
        chunk_id=claim.chunk_id,
        source_file=claim.source_file,
        section_path=chunk.section_path if chunk else [],
        page_number=chunk.page_number if chunk else None,
        passage_text=chunk.text if chunk else claim.raw_text,
        policy_subject=claim.policy_subject,
        claim_type=claim.claim_type,
        affected_population=claim.affected_population,
        value=claim.value,
        value_unit=claim.value_unit,
        raw_text=claim.raw_text,
    )


def find_contradiction_pairs(
    claims: list[PolicyClaim],
    chunks_by_id: dict[str, EvidenceChunk],
) -> list[ContradictionPair]:
    """
    Deterministically find contradictions among a list of PolicyClaims.

    Only compares claims from DIFFERENT source files — a document cannot
    contradict itself (within-document rules may use conditions/exceptions).

    Returns a deduplicated list of ContradictionPairs.
    Each pair is reported once (smaller chunk_id first as canonical order).
    """
    pairs: list[ContradictionPair] = []
    seen: set[frozenset[str]] = set()  # avoid duplicate pairs

    n = len(claims)
    for i in range(n):
        for j in range(i + 1, n):
            a, b = claims[i], claims[j]

            # Skip if same source file
            if a.source_file == b.source_file:
                continue

            # Deduplicate (chunk-pair already reported)
            key = frozenset({a.chunk_id, b.chunk_id})
            if key in seen:
                continue

            # ── Five-step contradiction test ──────────────────────────────

            # 1. Same policy subject
            if a.policy_subject != b.policy_subject:
                continue

            # 2. Populations overlap
            if not populations_overlap(a.affected_population, b.affected_population):
                continue

            # 3. Conditions are NOT mutually exclusive
            if conditions_are_mutually_exclusive(a.condition, b.condition):
                continue

            # 4. Same claim type
            if a.claim_type != b.claim_type:
                continue

            # 5. Values genuinely conflict
            if not values_conflict(a, b):
                continue

            # All five tests passed → contradiction
            seen.add(key)
            chunk_a = chunks_by_id.get(a.chunk_id)
            chunk_b = chunks_by_id.get(b.chunk_id)
            explanation = (
                f"{a.source_file} states {a.policy_subject}={a.value!r} "
                f"({a.claim_type}), but {b.source_file} states "
                f"{b.policy_subject}={b.value!r} ({b.claim_type}). "
                "Both provisions apply to the same population and situation."
            )
            pairs.append(
                ContradictionPair(
                    conflict_type=a.claim_type,
                    policy_subject=a.policy_subject,
                    claim_a=_make_conflict_detail(a, chunk_a),
                    claim_b=_make_conflict_detail(b, chunk_b),
                    explanation=explanation,
                )
            )
            logger.debug(
                "Contradiction detected: %s vs %s on %s",
                a.source_file, b.source_file, a.policy_subject,
            )

    return pairs
