"""
RuleLens FastAPI application factory.

Startup sequence:
  1. Load chunks.json → EvidenceChunk list
  2. Load claims.json → PolicyClaim list (may be empty if not yet extracted)
  3. Load BM25 index (bm25_index.pkl)
  4. Load embedding index (embeddings.npy + embedding_chunk_ids.json)
  5. Build lookup dicts (chunks_by_id, claims_by_chunk_id)
  6. Mark app_state.is_ready = True

If any index file is missing, the app starts but /query returns 503 until
ingest.py is run.
"""

from __future__ import annotations

import logging
from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.api import routes
from app.config import settings
from app.state import app_state
from app.storage.index import BM25Index, EmbeddingIndex
from app.storage.store import build_lookups, load_chunks, load_claims

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(levelname)s] %(name)s: %(message)s",
)
logger = logging.getLogger(__name__)


@asynccontextmanager
async def lifespan(app: FastAPI):
    """Load all indices at startup."""
    index_dir = settings.index_dir.resolve()
    logger.info("Starting RuleLens backend — index_dir: %s", index_dir)

    try:
        chunks = load_chunks(index_dir)
        claims = load_claims(index_dir)
        chunks_by_id, claims_by_chunk_id = build_lookups(chunks, claims)

        app_state.chunks = chunks
        app_state.chunks_by_id = chunks_by_id
        app_state.claims = claims
        app_state.claims_by_chunk_id = claims_by_chunk_id

        try:
            app_state.bm25_index = BM25Index.load(index_dir)
        except FileNotFoundError:
            logger.warning("BM25 index not found — /query will return 503. Run: python ingest.py")

        try:
            app_state.emb_index = EmbeddingIndex.load(index_dir)
        except FileNotFoundError:
            logger.warning("Embedding index not found — /query will return 503. Run: python ingest.py")

        if (
            chunks
            and app_state.bm25_index is not None
            and app_state.bm25_index.is_ready
            and app_state.emb_index is not None
            and app_state.emb_index.is_ready
        ):
            app_state.is_ready = True
            logger.info(
                "Index ready: %d chunks, %d claims, bm25=%s, embeddings=%s",
                len(chunks),
                len(claims),
                app_state.bm25_index.is_ready,
                app_state.emb_index.is_ready,
            )
        else:
            logger.warning(
                "Index incomplete. chunks=%d, bm25=%s, emb=%s",
                len(chunks),
                app_state.bm25_index is not None,
                app_state.emb_index is not None,
            )

    except Exception as exc:
        logger.error("Failed to load index at startup: %s", exc)

    yield  # application runs

    logger.info("RuleLens backend shutting down")


def create_app() -> FastAPI:
    app = FastAPI(
        title="RuleLens",
        description=(
            "Evidence-grounded academic regulation assistant. "
            "Returns one of three machine-readable states: "
            "ANSWERABLE | UNKNOWN | CONTRADICTORY."
        ),
        version="0.1.0",
        lifespan=lifespan,
    )

    app.add_middleware(
        CORSMiddleware,
        allow_origins=["http://localhost:3000", "http://127.0.0.1:3000"],  # Next.js frontend
        allow_credentials=True,
        allow_methods=["*"],
        allow_headers=["*"],
    )

    app.include_router(routes.router)
    return app


app = create_app()
