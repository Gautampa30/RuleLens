"""
LLM client — single entry point for all Gemini API calls.

Design contract:
  - All LLM calls go through this module. No other module imports
    google.generativeai directly.
  - Changing provider = edit this file only.
  - Claim extraction is the only LLM call made at ingestion time.
  - Answer generation is the only LLM call made at query time.
  - The LLM NEVER determines state (ANSWERABLE/UNKNOWN/CONTRADICTORY).
    State is set by services/decision.py before any LLM call.

When GEMINI_API_KEY is not set:
  - extract_claims() returns [] without error.
  - generate_explanation() raises LLMUnavailableError.
"""

from __future__ import annotations

import json
import logging
import os
import re
from pathlib import Path
from typing import TYPE_CHECKING

from app.config import settings

if TYPE_CHECKING:
    from app.models import EvidenceChunk, PolicyClaim, StateDecision

logger = logging.getLogger(__name__)


class LLMUnavailableError(RuntimeError):
    """Raised when the LLM is required but GEMINI_API_KEY is not configured."""


class LLMResponseError(RuntimeError):
    """Raised when the LLM returns an unparseable or invalid response."""


# ─────────────────────────────────────────────────────────────────────────────
# Prompts (kept in this file so provider changes only affect one place)
# ─────────────────────────────────────────────────────────────────────────────

_CLAIM_EXTRACTION_PROMPT = """\
You are a precise policy rule extraction assistant.

Extract all policy claims from the passage below.

A policy claim is a specific rule, requirement, prohibition, threshold,
deadline, approval requirement, eligibility criterion, duration limit,
or procedural step.

Return a JSON array. Each element must have exactly these fields:

{{
  "claim_type": "threshold|deadline|approval|requirement|prohibition|duration|eligibility|procedure",
  "policy_subject": "<snake_case identifier for what this rule governs>",
  "affected_population": "all_students|undergraduate|graduate|doctoral|international|part_time|full_time",
  "condition": "<short description of when this rule applies, or null>",
  "attribute": "<the specific aspect being regulated, or null>",
  "operator": ">=|<=|==|must|may|prohibited|is|null",
  "value": "<the rule's core value as a string>",
  "value_unit": "gpa|currency|date|authority|duration_weeks|duration_months|percent|credit_hours|null",
  "negated": false,
  "exceptions": [],
  "raw_text": "<verbatim sentence(s) from which this claim was extracted>",
  "extraction_confidence": 0.9
}}

Rules:
- Extract ONLY what is explicitly stated in the passage.
- Do NOT infer or assume information not present.
- policy_subject must be snake_case, e.g. "late_course_withdrawal_approval".
- raw_text must be a verbatim copy of the relevant sentence(s).
- If no policy claims exist in the passage, return [].
- Return ONLY the JSON array. No prose, no markdown fences.

Passage:
\"\"\"{chunk_text}\"\"\"
"""

_ANSWER_GENERATION_PROMPT = """\
You are a regulation assistant for Ashford University.

Your role is to explain policy information clearly and accurately.

The system has already evaluated the state: {state}

QUESTION: {question}

{state_context}

EVIDENCE PASSAGES:
{evidence_text}

TASK:
{task_instruction}

STRICT RULES:
- Use ONLY the evidence passages provided above.
- Do NOT use any outside knowledge or make any assumptions.
- Preserve all conditions, exceptions, and qualifications stated in the passages.
- Cite passages using [chunk_id] notation at the end of relevant sentences.
- If the question asks for a specific policy, rule, deadline, or detail that is NOT explicitly provided in the evidence passages (even if the general topic is mentioned), you MUST set "answer": "INSUFFICIENT_EVIDENCE" and "claims": []. Do NOT guess, extrapolate, or provide an unsupported answer.
- If the state is UNKNOWN, clearly state that the rulebook does not contain this information and briefly note what related passages (if any) were found.
- If the state is CONTRADICTORY, do NOT resolve the conflict — present both sides clearly and explain the inconsistency.

Respond with a JSON object:
{{
  "answer": "<clear, well-written explanation or INSUFFICIENT_EVIDENCE>",
  "claims": [
    {{"text": "<sentence from answer>", "chunk_id": "<chunk_id>"}}
  ]
}}

Return ONLY the JSON object. No prose, no markdown fences.
"""

_STATE_TASK_INSTRUCTIONS = {
    "ANSWERABLE": (
        "Write a clear, accurate answer to the question using only the evidence. "
        "Cite each factual claim with its chunk_id. "
        "If the evidence does not directly answer the specific question, return INSUFFICIENT_EVIDENCE."
    ),
    "UNKNOWN": (
        "Explain that the Ashford University rulebook does not contain sufficient "
        "information to answer this question. If any related passages were found, "
        "briefly describe what they cover and why they do not answer the question. "
        "Do not attempt to guess or extrapolate an answer."
    ),
    "CONTRADICTORY": (
        "Explain that the corpus contains conflicting provisions on this topic. "
        "Present both sides of the conflict clearly, quoting the relevant passages. "
        "Do NOT resolve the conflict or favour one provision over the other."
    ),
}

_STATE_CONTEXT = {
    "ANSWERABLE": "The corpus contains relevant evidence to answer this question.",
    "UNKNOWN": "The corpus does not contain sufficient evidence to answer this question.",
    "CONTRADICTORY": "The corpus contains conflicting provisions on this topic.",
}


# ─────────────────────────────────────────────────────────────────────────────
# Client
# ─────────────────────────────────────────────────────────────────────────────

def get_gemini_api_key() -> str:
    """Retrieve the Gemini API key from settings, env, or .env file dynamically."""
    if settings.gemini_api_key:
        return settings.gemini_api_key
    if os.environ.get("GEMINI_API_KEY"):
        return os.environ["GEMINI_API_KEY"]
    env_file = Path(__file__).resolve().parent.parent.parent / ".env"
    if env_file.exists():
        try:
            from dotenv import dotenv_values
            vals = dotenv_values(env_file)
            if vals.get("GEMINI_API_KEY"):
                return vals["GEMINI_API_KEY"]
        except Exception:
            pass
    return ""


class LLMClient:
    """
    Single Gemini API wrapper.

    Usage:
        from app.services.llm import LLMClient
        client = LLMClient()
        claims = client.extract_claims(chunk)
        answer_json = client.generate_explanation(question, decision)
    """

    def __init__(self) -> None:
        self._model = None

    def _get_model(self):
        if self._model is None:
            api_key = get_gemini_api_key()
            if not api_key:
                raise LLMUnavailableError(
                    "GEMINI_API_KEY is not set. "
                    "See backend/.env.example for setup instructions."
                )
            try:
                import google.generativeai as genai
            except ImportError as exc:
                raise LLMUnavailableError(
                    "google-generativeai is not installed. "
                    "Run: pip install google-generativeai"
                ) from exc

            genai.configure(api_key=api_key)
            self._model = genai.GenerativeModel(
                model_name=settings.gemini_model,
                generation_config={"temperature": settings.gemini_temperature},
            )
            logger.info("Gemini model initialised: %s", settings.gemini_model)
        return self._model

    def _call(self, prompt: str) -> str:
        """Make a single Gemini API call. Returns raw text response."""
        model = self._get_model()
        try:
            response = model.generate_content(prompt)
            return response.text
        except Exception as exc:
            raise LLMResponseError(f"Gemini API call failed: {exc}") from exc

    def _parse_json(self, raw: str) -> object:
        """Parse JSON from LLM response, stripping markdown fences or extracting JSON cleanly."""
        raw = raw.strip()
        # Look for code block ```json ... ```
        match = re.search(r"```(?:json)?\s*([\s\S]*?)\s*```", raw)
        if match:
            candidate = match.group(1).strip()
        else:
            m_obj = re.search(r"(\{[\s\S]*\}|\[[\s\S]*\])", raw)
            candidate = m_obj.group(1).strip() if m_obj else raw
        try:
            return json.loads(candidate)
        except json.JSONDecodeError as exc:
            raise LLMResponseError(
                f"LLM returned invalid JSON: {exc}\nRaw output: {raw[:500]}"
            ) from exc
            raise LLMResponseError(
                f"LLM returned invalid JSON: {exc}\nRaw output: {raw[:500]}"
            ) from exc

    def extract_claims(self, chunk: "EvidenceChunk") -> list["PolicyClaim"]:
        """
        Extract structured PolicyClaims from a chunk at ingestion time.

        Returns [] if GEMINI_API_KEY is not set (graceful degradation).
        Returns [] and logs a warning on any parsing/validation error.
        Never raises — caller should always receive a list.
        """
        from app.models import PolicyClaim

        if not settings.gemini_api_key:
            return []

        prompt = _CLAIM_EXTRACTION_PROMPT.format(chunk_text=chunk.text[:2000])
        try:
            raw = self._call(prompt)
            data = self._parse_json(raw)
        except (LLMResponseError, LLMUnavailableError) as exc:
            logger.warning("Claim extraction failed for chunk %s: %s", chunk.id, exc)
            return []

        if not isinstance(data, list):
            logger.warning("Claim extraction returned non-list for chunk %s", chunk.id)
            return []

        claims: list[PolicyClaim] = []
        for item in data:
            if not isinstance(item, dict):
                continue
            try:
                item["id"] = PolicyClaim.make_id(chunk.id, item.get("raw_text", ""))
                item["chunk_id"] = chunk.id
                item["source_file"] = chunk.source_file
                claim = PolicyClaim.model_validate(item)
                claims.append(claim)
            except Exception as exc:
                logger.debug("Skipping invalid claim from chunk %s: %s", chunk.id, exc)

        return claims

    def generate_explanation(
        self,
        question: str,
        decision: "StateDecision",
    ) -> tuple[str, list[dict]]:
        """
        Generate an explanatory answer for the given state decision.

        The state has already been determined deterministically. This method
        only generates the prose explanation.

        Returns (answer_text, claims_list) where claims_list is
        [{"text": sentence, "chunk_id": chunk_id}, ...].

        Raises LLMUnavailableError if GEMINI_API_KEY is not set.
        Raises LLMResponseError if the response cannot be parsed.
        """
        # Format evidence passages
        evidence_lines = []
        for i, sc in enumerate(decision.evidence[:10], start=1):
            c = sc.chunk
            section = " › ".join(c.section_path) if c.section_path else c.source_file
            page = f" p.{c.page_number}" if c.page_number else ""
            evidence_lines.append(
                f"[{c.id}] ({c.source_file}, {section}{page})\n\"{c.text}\""
            )

        # For CONTRADICTORY also add conflict evidence
        if decision.state == "CONTRADICTORY":
            for pair in decision.contradiction_pairs:
                ca, cb = pair.claim_a, pair.claim_b
                evidence_lines.append(
                    f"[CONFLICT-A: {ca.chunk_id}] ({ca.source_file})\n\"{ca.passage_text}\""
                )
                evidence_lines.append(
                    f"[CONFLICT-B: {cb.chunk_id}] ({cb.source_file})\n\"{cb.passage_text}\""
                )

        evidence_text = "\n\n".join(evidence_lines) if evidence_lines else "(no evidence passages)"

        prompt = _ANSWER_GENERATION_PROMPT.format(
            state=decision.state,
            question=question,
            state_context=_STATE_CONTEXT[decision.state],
            evidence_text=evidence_text,
            task_instruction=_STATE_TASK_INSTRUCTIONS[decision.state],
        )

        raw = self._call(prompt)
        data = self._parse_json(raw)

        if not isinstance(data, dict) or "answer" not in data:
            raise LLMResponseError("LLM response missing 'answer' field")

        return data.get("answer", ""), data.get("claims", [])


# Module-level singleton
_client: LLMClient | None = None


def get_llm_client() -> LLMClient:
    global _client
    if _client is None:
        _client = LLMClient()
    return _client
