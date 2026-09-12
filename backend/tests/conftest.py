"""
pytest configuration and shared fixtures.

Fixtures:
  corpus_dir       → resolved Path to corpus/
  chunks           → ingest the full corpus (session scope, built once)
  chunks_by_id     → dict lookup
  bm25_index       → BM25 index built from corpus
  emb_index        → Embedding index built from corpus (downloads model once)
  claims_by_chunk_id → empty dict (claim extraction needs LLM, not run in tests)
"""

from __future__ import annotations

import sys
from pathlib import Path

import pytest

# Add backend/ to sys.path so `app.*` imports resolve correctly
BACKEND_DIR = Path(__file__).parent.parent
sys.path.insert(0, str(BACKEND_DIR))

CORPUS_DIR = (BACKEND_DIR.parent / "corpus").resolve()


@pytest.fixture(scope="session")
def corpus_dir() -> Path:
    assert CORPUS_DIR.exists(), f"Corpus dir not found: {CORPUS_DIR}"
    return CORPUS_DIR


@pytest.fixture(scope="session")
def chunks(corpus_dir: Path):
    from app.services.ingestion import ingest_corpus
    result = ingest_corpus(corpus_dir)
    assert result, "ingest_corpus returned empty list"
    return result


@pytest.fixture(scope="session")
def chunks_by_id(chunks):
    return {c.id: c for c in chunks}


@pytest.fixture(scope="session")
def bm25_index(chunks):
    from app.storage.index import BM25Index
    idx = BM25Index()
    idx.build(chunks)
    return idx


@pytest.fixture(scope="session")
def emb_index(chunks):
    from app.storage.index import EmbeddingIndex
    idx = EmbeddingIndex()
    idx.build(chunks)
    return idx


@pytest.fixture(scope="session")
def claims_by_chunk_id():
    # No LLM in tests — return empty dict
    return {}
