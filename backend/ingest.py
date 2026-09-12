#!/usr/bin/env python3
"""
RuleLens corpus ingestion CLI.

Usage:
    python ingest.py [options]

Options:
    --corpus-dir PATH    Corpus directory (default: ../corpus)
    --index-dir PATH     Where to write index files (default: ./data)
    --skip-claims        Do not extract PolicyClaims (skips Gemini API call)
    --validate           After ingestion, print a summary and exit 0/1

What this does:
    1. Parse all .md and .pdf files in corpus-dir
    2. Chunk documents with deterministic IDs
    3. Save chunks.json
    4. Build and save BM25 index (bm25_index.pkl)
    5. Build and save embedding index (embeddings.npy)
    6. Extract PolicyClaims via Gemini (unless --skip-claims)
    7. Save claims.json

Running twice on the same corpus produces the same chunk IDs (idempotent).
Existing index files are overwritten.

GEMINI_API_KEY must be set in .env or the environment for claim extraction.
Without it, steps 1–5 succeed and the system can answer ANSWERABLE/UNKNOWN
questions, but CONTRADICTORY detection requires claims.
"""

from __future__ import annotations

import argparse
import logging
import sys
import time
from pathlib import Path

# Ensure backend/ is on sys.path so `app.*` imports work
sys.path.insert(0, str(Path(__file__).parent))

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(levelname)s] %(name)s: %(message)s",
)
logger = logging.getLogger("ingest")


def run_ingestion(
    corpus_dir: Path,
    index_dir: Path,
    skip_claims: bool = False,
) -> int:
    """
    Run the full ingestion pipeline.
    Returns 0 on success, 1 on error.
    """
    from app.config import settings
    from app.services.ingestion import ingest_corpus
    from app.services.llm import LLMUnavailableError, get_llm_client
    from app.storage.index import BM25Index, EmbeddingIndex
    from app.storage.store import save_chunks, save_claims

    index_dir.mkdir(parents=True, exist_ok=True)

    # ── 1. Parse and chunk corpus ─────────────────────────────────────────
    logger.info("═══ Step 1/5: Parsing corpus from %s", corpus_dir)
    t0 = time.perf_counter()
    try:
        chunks = ingest_corpus(corpus_dir)
    except FileNotFoundError as exc:
        logger.error("Corpus directory not found: %s", exc)
        return 1

    if not chunks:
        logger.error("No chunks produced — check corpus_dir and file content")
        return 1

    logger.info("  Produced %d chunks in %.1fs", len(chunks), time.perf_counter() - t0)

    # Print per-source summary
    sources: dict[str, int] = {}
    for c in chunks:
        sources[c.source_file] = sources.get(c.source_file, 0) + 1
    for src, count in sorted(sources.items()):
        logger.info("    %-45s  %d chunks", src, count)

    # ── 2. Save chunks.json ───────────────────────────────────────────────
    logger.info("═══ Step 2/5: Saving chunks.json → %s", index_dir)
    save_chunks(chunks, index_dir)

    # ── 3. Build BM25 index ───────────────────────────────────────────────
    logger.info("═══ Step 3/5: Building BM25 index")
    t1 = time.perf_counter()
    bm25 = BM25Index()
    bm25.build(chunks)
    bm25.save(index_dir)
    logger.info("  BM25 built in %.1fs", time.perf_counter() - t1)

    # ── 4. Build embedding index ──────────────────────────────────────────
    logger.info("═══ Step 4/5: Building embedding index (model: %s)", settings.embedding_model)
    logger.info("  (This will download the model ~90 MB on first run)")
    t2 = time.perf_counter()
    emb = EmbeddingIndex()
    try:
        emb.build(chunks)
        emb.save(index_dir)
        logger.info("  Embeddings built in %.1fs, shape=%s", time.perf_counter() - t2, emb._embeddings.shape)
    except Exception as exc:
        logger.error("Embedding build failed: %s", exc)
        return 1

    # ── 5. Extract PolicyClaims ───────────────────────────────────────────
    if skip_claims:
        logger.info("═══ Step 5/5: Skipping claim extraction (--skip-claims)")
        save_claims([], index_dir)
        logger.info("  Claims skipped. Contradiction detection will be disabled.")
    else:
        logger.info("═══ Step 5/5: Extracting PolicyClaims")
        from app.services.ingestion import extract_policy_claims
        all_claims = extract_policy_claims(chunks)
        logger.info("  Extracted %d structured claims from corpus chunks", len(all_claims))

        from app.config import settings as cfg
        if cfg.gemini_api_key:
            logger.info("  GEMINI_API_KEY detected — augmenting with LLM claim extraction...")
            client = get_llm_client()
            t3 = time.perf_counter()
            failed = 0
            for i, chunk in enumerate(chunks):
                try:
                    claims = client.extract_claims(chunk)
                    all_claims.extend(claims)
                except Exception as exc:
                    logger.warning("  Claim extraction failed for chunk %s: %s", chunk.id, exc)
                    failed += 1
                if (i + 1) % 20 == 0:
                    logger.info("  Progress: %d/%d chunks processed, %d claims so far",
                                i + 1, len(chunks), len(all_claims))
            elapsed = time.perf_counter() - t3
            logger.info("  LLM extraction completed in %.1fs", elapsed)
        else:
            logger.info(
                "  GEMINI_API_KEY not set — using deterministic rule-based claims.\n"
                "  (Set GEMINI_API_KEY in .env to enable additional LLM-extracted claims)"
            )

        save_claims(all_claims, index_dir)
        logger.info("  Saved %d claims to %s", len(all_claims), index_dir / "claims.json")

    # ── Summary ───────────────────────────────────────────────────────────
    logger.info("")
    logger.info("═══ Ingestion complete")
    logger.info("  Chunks:    %d", len(chunks))

    from app.storage.store import load_claims
    claims_loaded = load_claims(index_dir)
    logger.info("  Claims:    %d", len(claims_loaded))
    logger.info("  Index dir: %s", index_dir.resolve())
    logger.info("")
    logger.info("Start the backend:")
    logger.info("  uvicorn app.main:app --host 0.0.0.0 --port 8000 --reload")
    return 0


def validate(corpus_dir: Path, index_dir: Path) -> int:
    """
    Quick sanity check after ingestion.
    Returns 0 if all checks pass.
    """
    from app.storage.store import load_chunks, load_claims
    from app.storage.index import BM25Index, EmbeddingIndex

    errors = []

    chunks = load_chunks(index_dir)
    if not chunks:
        errors.append("No chunks loaded — run ingestion first")
    else:
        logger.info("✅  Chunks loaded: %d", len(chunks))

    try:
        bm25 = BM25Index.load(index_dir)
        results = bm25.query("academic standing GPA", top_k=5)
        if not results:
            errors.append("BM25 returned empty results for test query")
        else:
            logger.info("✅  BM25 test query → %d results (top score: %.4f)", len(results), results[0][1])
    except Exception as exc:
        errors.append(f"BM25 load/query failed: {exc}")

    try:
        emb = EmbeddingIndex.load(index_dir)
        results = emb.query("thesis submission deadline extension", top_k=5)
        if not results:
            errors.append("Embedding returned empty results for test query")
        else:
            logger.info("✅  Semantic test query → %d results (top sim: %.4f)", len(results), results[0][1])
    except Exception as exc:
        errors.append(f"Embedding load/query failed: {exc}")

    claims = load_claims(index_dir)
    logger.info("ℹ️   Claims: %d (0 = claim extraction was skipped)", len(claims))

    if errors:
        for e in errors:
            logger.error("❌  %s", e)
        return 1
    logger.info("✅  All validation checks passed")
    return 0


def main() -> None:
    parser = argparse.ArgumentParser(
        description="RuleLens corpus ingestion",
        formatter_class=argparse.RawDescriptionHelpFormatter,
        epilog=__doc__,
    )
    parser.add_argument(
        "--corpus-dir", type=Path, default=None,
        help="Corpus directory (default: ../corpus relative to backend/)",
    )
    parser.add_argument(
        "--index-dir", type=Path, default=None,
        help="Index output directory (default: ./data)",
    )
    parser.add_argument(
        "--skip-claims", action="store_true",
        help="Skip Gemini-based PolicyClaim extraction",
    )
    parser.add_argument(
        "--validate", action="store_true",
        help="Run validation checks on the existing index instead of re-ingesting",
    )
    args = parser.parse_args()

    from app.config import settings

    corpus_dir = args.corpus_dir or settings.corpus_dir
    index_dir = args.index_dir or settings.index_dir
    corpus_dir = Path(corpus_dir).resolve()
    index_dir = Path(index_dir).resolve()

    logger.info("RuleLens Ingestion CLI")
    logger.info("  corpus_dir: %s", corpus_dir)
    logger.info("  index_dir:  %s", index_dir)

    if args.validate:
        sys.exit(validate(corpus_dir, index_dir))
    else:
        sys.exit(run_ingestion(corpus_dir, index_dir, skip_claims=args.skip_claims))


if __name__ == "__main__":
    main()
