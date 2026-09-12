"""
LLM-powered answer generation.

Responsibilities:
  - Call LLMClient.generate_explanation() with the already-decided state.
  - Validate that every chunk_id in the LLM's claims list exists in evidence.
  - Assemble server-side Citation objects (passage_text always from corpus).
  - If the LLM returns INSUFFICIENT_EVIDENCE, override state to UNKNOWN.
  - Never let the LLM change state to ANSWERABLE or CONTRADICTORY.
  - On LLM failure, return a safe fallback response (no hallucination).

The LLM receives the evidence passages and the already-determined state.
It generates prose explanation only — it cannot change the state.
"""

from __future__ import annotations

import logging
import time
from typing import Optional

from app.config import settings
from app.models import (
    Citation,
    EvidenceChunk,
    PolicyClaim,
    QueryResponse,
    ScoredChunk,
    StateDecision,
)
from app.services.llm import LLMUnavailableError, LLMResponseError, get_llm_client

logger = logging.getLogger(__name__)

# Fallback answers shown when the LLM is unavailable or fails.
_FALLBACK_ANSWERS = {
    "ANSWERABLE": (
        "Evidence was found in the corpus. "
        "(LLM generation unavailable — please check GEMINI_API_KEY.)"
    ),
    "UNKNOWN": "The Ashford University rulebook does not contain sufficient information to answer this question.",
    "CONTRADICTORY": (
        "The corpus contains conflicting provisions on this topic. "
        "See the contradiction details below."
    ),
}


def _build_citations(
    answer_claims: list[dict],
    evidence: list[ScoredChunk],
    chunks_by_id: dict[str, EvidenceChunk],
    answer_text: str = "",
) -> list[Citation]:
    """
    Assemble Citation objects from LLM-returned claims and in-text references.

    Rules:
    - Only chunk_ids that exist in the evidence set are accepted.
    - passage_text is always taken from EvidenceChunk.text (verbatim corpus).
    - Invalid or missing chunk_ids are discarded with a warning.
    - Each chunk_id appears at most once in the citations list.
    """
    import re

    evidence_ids = {sc.chunk.id for sc in evidence}
    seen_chunk_ids: set[str] = set()
    citations: list[Citation] = []

    for claim in answer_claims:
        chunk_id = claim.get("chunk_id", "")
        if not chunk_id:
            continue
        if chunk_id not in evidence_ids:
            logger.warning(
                "LLM cited chunk_id %s not in evidence set — discarding", chunk_id
            )
            continue
        if chunk_id in seen_chunk_ids:
            continue  # deduplicate

        chunk = chunks_by_id.get(chunk_id)
        if not chunk:
            logger.warning("chunk_id %s not found in chunks_by_id — discarding", chunk_id)
            continue

        seen_chunk_ids.add(chunk_id)
        citations.append(
            Citation(
                index=len(citations) + 1,
                chunk_id=chunk_id,
                source_file=chunk.source_file,
                doc_title=chunk.doc_title,
                section_path=chunk.section_path,
                page_number=chunk.page_number,
                passage_text=chunk.text,   # always verbatim corpus text
                claim_text=claim.get("text"),
            )
        )

    # Also detect [chunk_id] occurrences in answer prose if not already captured
    if answer_text:
        for match_id in re.findall(r"\[([a-f0-9]{16})\]", answer_text):
            if match_id in evidence_ids and match_id not in seen_chunk_ids:
                chunk = chunks_by_id.get(match_id)
                if chunk:
                    seen_chunk_ids.add(match_id)
                    citations.append(
                        Citation(
                            index=len(citations) + 1,
                            chunk_id=match_id,
                            source_file=chunk.source_file,
                            doc_title=chunk.doc_title,
                            section_path=chunk.section_path,
                            page_number=chunk.page_number,
                            passage_text=chunk.text,
                            claim_text=None,
                        )
                    )

    return citations


def generate_response(
    question: str,
    decision: StateDecision,
    chunks_by_id: dict[str, EvidenceChunk],
    top_k_override: Optional[int] = None,
) -> QueryResponse:
    """
    Generate the final QueryResponse.

    1. State is already decided (decision.state).
    2. Call LLM to generate explanatory prose (ONLY after state is set).
    3. Validate claims; assemble server-side citations.
    4. Return QueryResponse with machine-readable state + evidence.

    If the LLM is unavailable or returns INSUFFICIENT_EVIDENCE, a safe
    fallback is used. State is NEVER overridden toward ANSWERABLE.
    """
    t0 = time.perf_counter()
    state = decision.state
    evidence = decision.evidence

    if state == "CONTRADICTORY" and decision.contradiction_pairs:
        answer_text = (
            f"The corpus contains conflicting provisions on this topic: "
            f"{decision.contradiction_pairs[0].explanation}"
        )
    else:
        answer_text = _FALLBACK_ANSWERS[state]

    citations: list[Citation] = []
    gen_ms = 0

    try:
        client = get_llm_client()
        t_gen = time.perf_counter()
        answer_text, answer_claims = client.generate_explanation(question, decision)
        gen_ms = int((time.perf_counter() - t_gen) * 1000)

        # Check if LLM indicated insufficient evidence
        if "INSUFFICIENT_EVIDENCE" in answer_text.upper():
            logger.info(
                "LLM indicated INSUFFICIENT_EVIDENCE for state=%s → overriding to UNKNOWN",
                state,
            )
            state = "UNKNOWN"
            answer_text = "The Ashford University rulebook does not contain sufficient information to answer this question."
            citations = []
        else:
            citations = _build_citations(answer_claims, evidence, chunks_by_id, answer_text=answer_text)

    except LLMUnavailableError as exc:
        logger.warning("LLM unavailable: %s", exc)
    except LLMResponseError as exc:
        logger.error("LLM response error: %s", exc)
    except Exception as exc:
        logger.error("Unexpected error in LLM generation: %s", exc)

    # Fallback citation assembly when LLM is unavailable or provided no valid citations
    if not citations:
        if state == "ANSWERABLE" and evidence:
            citations = [
                Citation(
                    index=i + 1,
                    chunk_id=sc.chunk.id,
                    source_file=sc.chunk.source_file,
                    doc_title=sc.chunk.doc_title,
                    section_path=sc.chunk.section_path,
                    page_number=sc.chunk.page_number,
                    passage_text=sc.chunk.text,
                    claim_text=None,
                )
                for i, sc in enumerate(evidence[:3])
            ]
        elif state == "CONTRADICTORY" and decision.contradiction_pairs:
            seen_cids: set[str] = set()
            cits: list[Citation] = []
            for pair in decision.contradiction_pairs:
                for claim_side in [pair.claim_a, pair.claim_b]:
                    if claim_side.chunk_id not in seen_cids:
                        seen_cids.add(claim_side.chunk_id)
                        chunk = chunks_by_id.get(claim_side.chunk_id)
                        cits.append(
                            Citation(
                                index=len(cits) + 1,
                                chunk_id=claim_side.chunk_id,
                                source_file=claim_side.source_file,
                                doc_title=chunk.doc_title if chunk else claim_side.source_file,
                                section_path=claim_side.section_path,
                                page_number=claim_side.page_number,
                                passage_text=claim_side.passage_text,
                                claim_text=claim_side.raw_text,
                            )
                        )
            citations = cits

    retrieval_ms = int((time.perf_counter() - t0) * 1000) - gen_ms

    return QueryResponse(
        state=state,
        answer=answer_text,
        citations=citations,
        contradiction_pairs=decision.contradiction_pairs,
        unknown_reason=decision.unknown_reason,
        related_evidence=[sc.chunk for sc in evidence] if state == "UNKNOWN" else [],
        metadata={
            "retrieval_ms": retrieval_ms,
            "generation_ms": gen_ms,
            "evidence_count": len(evidence),
            "claims_count": len(citations),
            "model": settings.gemini_model,
        },
    )
