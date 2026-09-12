"""
Deterministic three-state decision engine.

This module is the sole authority for state classification.
It runs BEFORE any LLM call and its decision cannot be overridden.

Algorithm:
  STEP 1 — UNKNOWN check
    If no evidence was retrieved OR the best RRF score is below the
    relevance_threshold → UNKNOWN (no_evidence or low_confidence).

  STEP 2 — CONTRADICTORY check
    Load PolicyClaims for the top-K retrieved chunks.
    Run the deterministic contradiction comparator.
    If any contradiction pairs are found → CONTRADICTORY.

  STEP 3 — ANSWERABLE
    Evidence is present, consistent, and above threshold → ANSWERABLE.

The state field in the final QueryResponse is always the result of this
engine. The LLM only generates prose after the state is known.
"""

from __future__ import annotations

import logging
from typing import Optional

from app.config import settings
from app.models import ContradictionPair, EvidenceChunk, PolicyClaim, ScoredChunk, StateDecision
from app.services.contradiction import find_contradiction_pairs

logger = logging.getLogger(__name__)


def decide_state(
    evidence: list[ScoredChunk],
    claims_by_chunk_id: dict[str, list[PolicyClaim]],
    chunks_by_id: dict[str, EvidenceChunk],
    relevance_threshold: Optional[float] = None,
    top_k: Optional[int] = None,
    query: Optional[str] = None,
) -> StateDecision:
    """
    Classify the query state deterministically.

    Parameters
    ----------
    evidence            : ranked evidence from hybrid_search()
    claims_by_chunk_id  : chunk_id → [PolicyClaim, …] lookup
    chunks_by_id        : chunk_id → EvidenceChunk lookup
    relevance_threshold : override settings.relevance_threshold
    top_k               : how many top chunks to consider for contradiction
    query               : natural-language question for population & entity verification

    Returns
    -------
    StateDecision with state, evidence, contradiction_pairs, unknown_reason
    """
    threshold = relevance_threshold if relevance_threshold is not None else settings.relevance_threshold
    k = top_k if top_k is not None else settings.top_k

    # ── STEP 1: UNKNOWN check ─────────────────────────────────────────────

    if not evidence:
        logger.debug("State: UNKNOWN (no_evidence)")
        return StateDecision(
            state="UNKNOWN",
            unknown_reason="no_evidence",
            evidence=[],
            contradiction_pairs=[],
        )

    best_score = max(sc.rrf_score for sc in evidence)
    max_possible_rrf = 2.0 / (settings.rrf_k + 1)
    normalized_score = best_score / max_possible_rrf if max_possible_rrf > 0 else best_score
    best_sem = max(sc.semantic_score for sc in evidence)

    if normalized_score < threshold or (best_sem > 0.0 and best_sem < 0.50):
        logger.debug(
            "State: UNKNOWN (low_confidence, best_rrf=%.4f, norm=%.4f, sem=%.4f, threshold=%.4f)",
            best_score,
            normalized_score,
            best_sem,
            threshold,
        )
        return StateDecision(
            state="UNKNOWN",
            unknown_reason="low_confidence",
            evidence=evidence,
            contradiction_pairs=[],
        )

    # Check for missing discriminatory key terms if query is supplied
    if query:
        _STOP_TERMS = {
            'what', 'is', 'the', 'a', 'an', 'and', 'or', 'in', 'on', 'at', 'to', 'for',
            'of', 'with', 'by', 'from', 'as', 'about', 'into', 'through', 'during',
            'before', 'after', 'above', 'below', 'between', 'under', 'again', 'further',
            'then', 'once', 'here', 'there', 'when', 'where', 'why', 'how', 'all', 'any',
            'both', 'each', 'few', 'more', 'most', 'other', 'some', 'such', 'no', 'nor',
            'not', 'only', 'own', 'same', 'so', 'than', 'too', 'very', 'can', 'will',
            'just', 'should', 'now', 'university', "university's", 'ashford', 'does',
            'student', 'students', 'policy', 'policies', 'rule', 'rules', 'requirement',
            'requirements', 'procedure', 'process', 'available', 'specific', 'academic',
            'which', 'their', 'they', 'have', 'been', 'there', 'must', 'take', 'taken',
            'often', 'many', 'stay', 'next', 'happens', 'apply', 'number', 'withdraws'
        }
        import re
        q_terms = [w.lower() for w in re.findall(r'\b[a-zA-Z]{4,}\b', query) if w.lower() not in _STOP_TERMS]
        ev_text = " ".join(sc.chunk.text.lower() for sc in evidence[:5])
        missing_terms = [t for t in q_terms if t not in ev_text]

        if missing_terms and (best_sem < 0.72):
            logger.debug("State: UNKNOWN (missing discriminatory terms: %s)", missing_terms)
            return StateDecision(
                state="UNKNOWN",
                unknown_reason="low_confidence",
                evidence=evidence,
                contradiction_pairs=[],
            )

    # ── STEP 2: CONTRADICTORY check ───────────────────────────────────────

    top_evidence = evidence[:k]
    # Gather all PolicyClaims for the top-K chunks
    top_claims: list[PolicyClaim] = []
    for sc in top_evidence:
        top_claims.extend(claims_by_chunk_id.get(sc.chunk.id, []))

    contradiction_pairs: list[ContradictionPair] = []
    if top_claims:
        contradiction_pairs = find_contradiction_pairs(top_claims, chunks_by_id)

    # Filter contradiction pairs to match the target population in query (if specified)
    if contradiction_pairs and query:
        q_lower = query.lower()
        relevant_pairs = []
        for cp in contradiction_pairs:
            pop_a = cp.claim_a.affected_population
            pop_b = cp.claim_b.affected_population
            if pop_a == "undergraduate" and pop_b == "undergraduate":
                if any(term in q_lower for term in ["graduate", "masters", "doctoral", "phd"]) and "undergraduate" not in q_lower:
                    continue
            if pop_a in ("graduate", "doctoral") and pop_b in ("graduate", "doctoral"):
                if any(term in q_lower for term in ["undergraduate", "bachelor"]) and not any(term in q_lower for term in ["graduate", "masters", "doctoral", "phd"]):
                    continue
            relevant_pairs.append(cp)
        contradiction_pairs = relevant_pairs

    if contradiction_pairs:
        logger.debug(
            "State: CONTRADICTORY (%d pair(s) found)", len(contradiction_pairs)
        )
        return StateDecision(
            state="CONTRADICTORY",
            unknown_reason=None,
            evidence=top_evidence,
            contradiction_pairs=contradiction_pairs,
        )

    # ── STEP 3: ANSWERABLE ────────────────────────────────────────────────

    logger.debug("State: ANSWERABLE (best_rrf=%.4f)", best_score)
    return StateDecision(
        state="ANSWERABLE",
        unknown_reason=None,
        evidence=top_evidence,
        contradiction_pairs=[],
    )
