"""
RuleLens data models.

This module defines all Pydantic models used throughout the application:

  EvidenceChunk     — atomic retrieval unit; verbatim corpus passage
  ScoredChunk       — EvidenceChunk with retrieval scores attached
  PolicyClaim       — structured policy rule extracted from a chunk
  ContradictionPair — two PolicyClaims that conflict
  Citation          — rendered citation for the frontend
  QueryRequest      — API request body
  QueryResponse     — API response; state is always machine-readable

These models are the canonical data contract. Service code produces them;
routes/API return them. Never let the LLM modify EvidenceChunk.text or
Citation.passage_text — these must always be verbatim corpus text.
"""

from __future__ import annotations

import hashlib
from typing import Literal, Optional

from pydantic import BaseModel, Field, field_validator


# ─────────────────────────────────────────────────────────────────────────────
# Core retrieval unit
# ─────────────────────────────────────────────────────────────────────────────

class EvidenceChunk(BaseModel):
    """
    A single retrievable passage from the corpus.

    The ``text`` field is verbatim source text and must never be modified
    by any LLM call. It is the only authoritative source for citations.
    """

    id: str = Field(description="Deterministic 16-char hex ID derived from source_file + offset + text")
    source_file: str = Field(description="Basename of the source file, e.g. 'academic_regulations.md'")
    source_type: Literal["markdown", "pdf"] = Field(description="File type of the source document")
    doc_title: str = Field(description="Title of the source document (from first H1 or frontmatter)")
    section_path: list[str] = Field(
        default_factory=list,
        description="Ordered breadcrumb of headings, e.g. ['Chapter 5', 'Section 5.3']",
    )
    page_number: Optional[int] = Field(
        default=None,
        description="1-indexed page number for PDFs; None for Markdown",
    )
    char_offset: int = Field(
        description="Character offset of the chunk start within the source file"
    )
    text: str = Field(description="Verbatim passage text — never LLM-modified")
    word_count: int = Field(description="Approximate word count of the chunk text")

    @field_validator("text")
    @classmethod
    def text_not_empty(cls, v: str) -> str:
        if not v.strip():
            raise ValueError("EvidenceChunk.text must not be empty")
        return v

    @classmethod
    def make_id(cls, source_file: str, char_offset: int, text: str) -> str:
        """
        Deterministic chunk ID.
        Derived from source_file + char_offset + first 80 chars of text.
        Stable across re-ingestion as long as the corpus text is unchanged.
        """
        key = f"{source_file}::{char_offset}::{text[:80]}"
        return hashlib.sha256(key.encode()).hexdigest()[:16]


class ScoredChunk(BaseModel):
    """EvidenceChunk with retrieval scores attached after hybrid search."""

    chunk: EvidenceChunk
    bm25_score: float = 0.0
    semantic_score: float = 0.0
    rrf_score: float = 0.0


# ─────────────────────────────────────────────────────────────────────────────
# Structured policy claims (extracted at ingest time via LLM)
# ─────────────────────────────────────────────────────────────────────────────

class PolicyClaim(BaseModel):
    """
    A structured, normalised representation of a single policy rule.

    Extracted from an EvidenceChunk at ingestion time using the LLM.
    Used at query time for deterministic contradiction detection.

    Design note: the LLM extracts these during ingestion and they are
    saved to claims.json. At query time, the comparator in
    services/contradiction.py reads them directly — no LLM involvement.
    """

    id: str = Field(description="Deterministic ID derived from chunk_id + raw_text")
    chunk_id: str = Field(description="ID of the EvidenceChunk this claim was extracted from")
    source_file: str = Field(description="Source file of the parent chunk")

    # ── What kind of rule is this? ─────────────────────────────────────
    claim_type: Literal[
        "threshold",    # a minimum/maximum numeric value
        "deadline",     # a date or timing requirement
        "approval",     # who must approve something
        "requirement",  # something that is required
        "prohibition",  # something that is prohibited
        "duration",     # a time period (weeks, months, terms)
        "eligibility",  # who qualifies for something
        "procedure",    # a procedural requirement
    ] = Field(description="Semantic category of the rule")

    # ── What is this rule about? ───────────────────────────────────────
    policy_subject: str = Field(
        description="Snake_case topic identifier, e.g. 'late_course_withdrawal_approval'"
    )

    # ── Who does it apply to? ─────────────────────────────────────────
    affected_population: str = Field(
        description=(
            "Who this rule applies to. "
            "Use: all_students | undergraduate | graduate | doctoral | "
            "international | part_time | full_time"
        )
    )

    # ── Under what conditions? ─────────────────────────────────────────
    condition: Optional[str] = Field(
        default=None,
        description=(
            "The condition under which this rule applies, if any. "
            "E.g. 'after_week_8', 'on_academic_probation', null if unconditional."
        ),
    )

    # ── The rule's specific content ───────────────────────────────────
    attribute: Optional[str] = Field(
        default=None,
        description="What specific aspect is being regulated (e.g. 'approval_authority', 'minimum_gpa')",
    )
    operator: Optional[str] = Field(
        default=None,
        description="Logical operator: '>=' | '<=' | '==' | 'must' | 'may' | 'prohibited' | 'is'",
    )
    value: str = Field(description="The core rule value as a normalised string")
    value_unit: Optional[str] = Field(
        default=None,
        description=(
            "Unit of the value: "
            "gpa | currency | date | authority | duration_weeks | "
            "duration_months | percent | credit_hours | null"
        ),
    )
    negated: bool = Field(
        default=False,
        description="True if this claim is a negation, e.g. 'X is NOT required'",
    )
    exceptions: list[str] = Field(
        default_factory=list,
        description="Known exception conditions stated in the same passage",
    )

    @field_validator("exceptions", mode="before")
    @classmethod
    def coerce_exceptions(cls, v):
        if v is None:
            return []
        return v

    # ── Source traceability ───────────────────────────────────────────
    raw_text: str = Field(description="Verbatim sentence(s) from which this claim was extracted")
    extraction_confidence: float = Field(
        default=1.0,
        ge=0.0,
        le=1.0,
        description="LLM-assigned confidence score (0.0–1.0)",
    )

    @classmethod
    def make_id(cls, chunk_id: str, raw_text: str) -> str:
        key = f"{chunk_id}::{raw_text[:60]}"
        return hashlib.sha256(key.encode()).hexdigest()[:12]


# ─────────────────────────────────────────────────────────────────────────────
# Contradiction representation
# ─────────────────────────────────────────────────────────────────────────────

class ConflictingClaimDetail(BaseModel):
    """Serialisable view of one side of a contradiction."""

    chunk_id: str
    source_file: str
    section_path: list[str]
    page_number: Optional[int]
    passage_text: str           # verbatim — from EvidenceChunk.text
    policy_subject: str
    claim_type: str
    affected_population: str = "all_students"
    value: str
    value_unit: Optional[str]
    raw_text: str               # verbatim sentence from PolicyClaim


class ContradictionPair(BaseModel):
    """Two PolicyClaims that are in direct, irreconcilable conflict."""

    conflict_type: str = Field(description="Same as claim_type: threshold | approval | duration | …")
    policy_subject: str = Field(description="The shared policy_subject that creates the conflict")
    claim_a: ConflictingClaimDetail
    claim_b: ConflictingClaimDetail
    explanation: str = Field(
        description="Human-readable explanation of why these claims conflict"
    )


# ─────────────────────────────────────────────────────────────────────────────
# Citation (assembled server-side, never LLM-generated)
# ─────────────────────────────────────────────────────────────────────────────

class Citation(BaseModel):
    """
    A citation shown in the frontend.

    passage_text MUST come from EvidenceChunk.text — verbatim corpus text.
    The LLM must never generate or alter this field.
    """

    index: int = Field(description="Reference number [1], [2], … in the answer text")
    chunk_id: str
    source_file: str
    doc_title: str
    section_path: list[str]
    page_number: Optional[int]
    passage_text: str = Field(description="Verbatim text — injected server-side from EvidenceChunk")
    claim_text: Optional[str] = Field(
        default=None,
        description="The sentence in the answer that this citation supports",
    )


# ─────────────────────────────────────────────────────────────────────────────
# Explainability and Trace Models
# ─────────────────────────────────────────────────────────────────────────────

class TraceStep(BaseModel):
    """A factual, auditable pipeline step showing the evidence reasoning chain."""

    step: str = Field(description="Step name, e.g. 'Query Analysis', 'Hybrid Retrieval'")
    status: Literal["completed", "branch_taken", "guardrail_active"] = "completed"
    detail: str = Field(description="Factual description of what occurred during this stage")


# ─────────────────────────────────────────────────────────────────────────────
# State decision intermediate result
# ─────────────────────────────────────────────────────────────────────────────

class StateDecision(BaseModel):
    """
    Output of the deterministic state engine (services/decision.py).

    This is produced BEFORE the LLM is called.
    The LLM may generate explanatory prose but CANNOT change ``state``.
    """

    state: Literal["ANSWERABLE", "UNKNOWN", "CONTRADICTORY"]
    unknown_reason: Optional[Literal["no_evidence", "low_confidence", "llm_insufficient"]] = None
    decision_basis: Optional[str] = None
    evidence: list[ScoredChunk] = Field(default_factory=list)
    contradiction_pairs: list[ContradictionPair] = Field(default_factory=list)


# ─────────────────────────────────────────────────────────────────────────────
# API request / response
# ─────────────────────────────────────────────────────────────────────────────

class QueryRequest(BaseModel):
    question: str = Field(min_length=3, max_length=1000, description="Student's natural-language question")
    top_k: Optional[int] = Field(default=None, ge=1, le=20, description="Override default top-K")


class QueryResponse(BaseModel):
    """
    The canonical API response.

    ``state`` is machine-readable and set by the deterministic engine.
    The evaluation script inspects only ``state`` and ``citations[*].chunk_id``.
    """

    state: Literal["ANSWERABLE", "UNKNOWN", "CONTRADICTORY"]
    answer: str = Field(description="Human-readable explanation generated by the LLM after state is determined")
    citations: list[Citation] = Field(default_factory=list)
    contradiction_pairs: list[ContradictionPair] = Field(default_factory=list)
    unknown_reason: Optional[str] = None
    decision_basis: Optional[str] = None
    trace_steps: list[TraceStep] = Field(default_factory=list)
    related_evidence: list[EvidenceChunk] = Field(
        default_factory=list,
        description="For UNKNOWN: relevant-but-insufficient passages shown to user",
    )
    metadata: dict = Field(default_factory=dict)


# ─────────────────────────────────────────────────────────────────────────────
# Corpus status (used by GET /corpus/status)
# ─────────────────────────────────────────────────────────────────────────────

class DocumentStatus(BaseModel):
    file: str
    doc_title: str
    chunks: int
    claims: int


class CorpusStatus(BaseModel):
    documents: list[DocumentStatus]
    total_chunks: int
    total_claims: int
    embeddings_loaded: bool
    bm25_ready: bool
