"""
Chunk and claim persistence (load/save to JSON files in data/).

Files managed:
  data/chunks.json          — list of EvidenceChunk dicts
  data/claims.json          — list of PolicyClaim dicts
"""

from __future__ import annotations

import json
import logging
from pathlib import Path
from typing import Optional

from app.models import EvidenceChunk, PolicyClaim

logger = logging.getLogger(__name__)

_CHUNKS_FILE = "chunks.json"
_CLAIMS_FILE = "claims.json"


def save_chunks(chunks: list[EvidenceChunk], index_dir: Path) -> None:
    index_dir.mkdir(parents=True, exist_ok=True)
    path = index_dir / _CHUNKS_FILE
    data = [c.model_dump() for c in chunks]
    path.write_text(json.dumps(data, indent=2, ensure_ascii=False), encoding="utf-8")
    logger.info("Saved %d chunks → %s", len(chunks), path)


def load_chunks(index_dir: Path) -> list[EvidenceChunk]:
    path = index_dir / _CHUNKS_FILE
    if not path.exists():
        logger.warning("chunks.json not found at %s — run ingest.py first", index_dir)
        return []
    data = json.loads(path.read_text(encoding="utf-8"))
    chunks = [EvidenceChunk.model_validate(d) for d in data]
    logger.info("Loaded %d chunks from %s", len(chunks), path)
    return chunks


def save_claims(claims: list[PolicyClaim], index_dir: Path) -> None:
    index_dir.mkdir(parents=True, exist_ok=True)
    path = index_dir / _CLAIMS_FILE
    data = [c.model_dump() for c in claims]
    path.write_text(json.dumps(data, indent=2, ensure_ascii=False), encoding="utf-8")
    logger.info("Saved %d claims → %s", len(claims), path)


def load_claims(index_dir: Path) -> list[PolicyClaim]:
    path = index_dir / _CLAIMS_FILE
    if not path.exists():
        logger.info("claims.json not found — contradiction detection will be disabled")
        return []
    data = json.loads(path.read_text(encoding="utf-8"))
    claims = []
    for d in data:
        try:
            claims.append(PolicyClaim.model_validate(d))
        except Exception as exc:
            logger.warning("Skipping invalid claim record: %s", exc)
    logger.info("Loaded %d claims from %s", len(claims), path)
    return claims


def build_lookups(
    chunks: list[EvidenceChunk],
    claims: list[PolicyClaim],
) -> tuple[dict[str, EvidenceChunk], dict[str, list[PolicyClaim]]]:
    """
    Return (chunks_by_id, claims_by_chunk_id) dicts for fast lookup.
    """
    chunks_by_id = {c.id: c for c in chunks}
    claims_by_chunk_id: dict[str, list[PolicyClaim]] = {}
    for claim in claims:
        claims_by_chunk_id.setdefault(claim.chunk_id, []).append(claim)
    return chunks_by_id, claims_by_chunk_id
