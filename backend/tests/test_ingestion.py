"""
Tests for document ingestion and chunking.

Covers:
- Markdown extraction produces chunks with correct metadata
- PDF extraction produces chunks with page numbers
- Required fields present on every chunk
- Chunk IDs are deterministic (idempotent)
- Table rows appear as individual chunks
- Contradictions.md and helper files are excluded
- Specific corpus passages are preserved
"""

from __future__ import annotations

import hashlib
from pathlib import Path

import pytest


# ─────────────────────────────────────────────────────────────────────────────
# Basic ingestion
# ─────────────────────────────────────────────────────────────────────────────

def test_ingest_corpus_returns_chunks(chunks):
    assert len(chunks) > 0, "ingest_corpus must return at least one chunk"


def test_ingest_corpus_min_chunks(chunks):
    # 5 documents × average ~20 chunks each → expect well over 30
    assert len(chunks) >= 30, f"Expected ≥30 chunks; got {len(chunks)}"


def test_every_chunk_has_required_fields(chunks):
    for c in chunks:
        assert c.id, f"Missing id on chunk from {c.source_file}"
        assert c.source_file, "Missing source_file"
        assert c.source_type in ("markdown", "pdf"), f"Invalid source_type: {c.source_type}"
        assert c.doc_title, "Missing doc_title"
        assert c.text.strip(), "Chunk text must not be blank"
        assert c.word_count > 0, "word_count must be positive"
        assert isinstance(c.section_path, list), "section_path must be a list"
        assert isinstance(c.char_offset, int), "char_offset must be int"


def test_chunk_ids_are_unique(chunks):
    ids = [c.id for c in chunks]
    assert len(ids) == len(set(ids)), "Duplicate chunk IDs detected"


# ─────────────────────────────────────────────────────────────────────────────
# Markdown ingestion
# ─────────────────────────────────────────────────────────────────────────────

def test_markdown_chunks_have_no_page_number(chunks):
    md_chunks = [c for c in chunks if c.source_type == "markdown"]
    assert md_chunks, "No markdown chunks found"
    for c in md_chunks:
        assert c.page_number is None, f"Markdown chunk {c.id} should have page_number=None"


def test_academic_regulations_md_is_indexed(chunks):
    ar_chunks = [c for c in chunks if c.source_file == "academic_regulations.md"]
    assert ar_chunks, "academic_regulations.md produced no chunks"
    assert len(ar_chunks) >= 10, f"Expected ≥10 chunks from academic_regulations.md; got {len(ar_chunks)}"


def test_graduate_policies_md_is_indexed(chunks):
    gp_chunks = [c for c in chunks if c.source_file == "graduate_policies.md"]
    assert gp_chunks, "graduate_policies.md produced no chunks"


def test_fee_schedule_md_is_indexed(chunks):
    fs_chunks = [c for c in chunks if c.source_file == "fee_schedule.md"]
    assert fs_chunks, "fee_schedule.md produced no chunks"


def test_appeals_and_conduct_md_is_indexed(chunks):
    ac_chunks = [c for c in chunks if c.source_file == "appeals_and_conduct.md"]
    assert ac_chunks, "appeals_and_conduct.md produced no chunks"


def test_contradictions_md_is_excluded(chunks):
    """contradictions.md is documentation — must NOT be indexed."""
    bad = [c for c in chunks if c.source_file == "contradictions.md"]
    assert not bad, "contradictions.md must be excluded from the index"


def test_handbook_source_md_excluded(chunks):
    """research_degrees_handbook_source.md — PDF is the canonical form."""
    bad = [c for c in chunks if c.source_file == "research_degrees_handbook_source.md"]
    assert not bad, "research_degrees_handbook_source.md must be excluded (use PDF)"


def test_section_path_is_populated_for_md(chunks):
    md_chunks = [c for c in chunks if c.source_type == "markdown"]
    with_path = [c for c in md_chunks if c.section_path]
    # At least half of markdown chunks should have a non-empty section_path
    assert len(with_path) >= len(md_chunks) // 2, (
        f"Only {len(with_path)}/{len(md_chunks)} markdown chunks have section_path"
    )


def test_table_chunks_exist_in_fee_schedule(chunks):
    """Fee table rows must appear as individual chunks."""
    fee_chunks = [c for c in chunks if c.source_file == "fee_schedule.md"]
    table_chunks = [c for c in fee_chunks if c.text.startswith("[Table:")]
    assert table_chunks, "Expected fee table rows as [Table:…] chunks"


def test_contradiction_c001_source_a_is_indexed(chunks):
    """C-001 Source A: 'Dean of the student's faculty' approval passage."""
    ar_chunks = [c for c in chunks if c.source_file == "academic_regulations.md"]
    found = any("Dean of the student" in c.text or "Dean" in c.text for c in ar_chunks)
    assert found, "C-001 Source A passage (Dean approval) not found in academic_regulations.md chunks"


def test_contradiction_c002_source_b_is_indexed(chunks):
    """C-002 Source B: '2.3' term GPA threshold passage."""
    ac_chunks = [c for c in chunks if c.source_file == "appeals_and_conduct.md"]
    found = any("2.3" in c.text for c in ac_chunks)
    assert found, "C-002 Source B passage (2.3 GPA) not found in appeals_and_conduct.md chunks"


def test_contradiction_c003_source_a_is_indexed(chunks):
    """C-003 Source A: 'one academic term (sixteen weeks)' passage."""
    gp_chunks = [c for c in chunks if c.source_file == "graduate_policies.md"]
    found = any("sixteen weeks" in c.text for c in gp_chunks)
    assert found, "C-003 Source A passage (sixteen weeks) not found in graduate_policies.md chunks"


# ─────────────────────────────────────────────────────────────────────────────
# PDF ingestion
# ─────────────────────────────────────────────────────────────────────────────

def test_pdf_chunks_have_page_number(chunks):
    pdf_chunks = [c for c in chunks if c.source_type == "pdf"]
    assert pdf_chunks, "No PDF chunks found — research_degrees_handbook.pdf not parsed"
    for c in pdf_chunks:
        assert c.page_number is not None, f"PDF chunk {c.id} is missing page_number"
        assert c.page_number >= 1, "page_number must be 1-indexed"


def test_pdf_chunks_have_source_file(chunks):
    pdf_chunks = [c for c in chunks if c.source_type == "pdf"]
    for c in pdf_chunks:
        assert c.source_file == "research_degrees_handbook.pdf"


def test_contradiction_c003_source_b_in_pdf(chunks):
    """C-003 Source B: 'six months' extension passage from PDF."""
    pdf_chunks = [c for c in chunks if c.source_file == "research_degrees_handbook.pdf"]
    found = any("six months" in c.text for c in pdf_chunks)
    assert found, "C-003 Source B passage ('six months') not found in PDF chunks"


# ─────────────────────────────────────────────────────────────────────────────
# Deterministic chunk IDs
# ─────────────────────────────────────────────────────────────────────────────

def test_chunk_ids_are_deterministic(corpus_dir):
    """Running ingestion twice on the same corpus must produce the same chunk IDs."""
    from app.services.ingestion import ingest_corpus
    run1 = ingest_corpus(corpus_dir)
    run2 = ingest_corpus(corpus_dir)
    ids1 = [c.id for c in run1]
    ids2 = [c.id for c in run2]
    assert ids1 == ids2, "Chunk IDs changed between two identical ingestion runs"


def test_chunk_id_formula(chunks):
    """Spot-check that chunk IDs are SHA-256 derived from source_file+offset+text."""
    from app.models import EvidenceChunk
    for chunk in chunks[:5]:
        expected = EvidenceChunk.make_id(chunk.source_file, chunk.char_offset, chunk.text)
        assert chunk.id == expected, (
            f"Chunk ID mismatch for {chunk.source_file}:{chunk.char_offset}"
        )
