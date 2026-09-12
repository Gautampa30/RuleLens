"""
RuleLens configuration.

All tuneable parameters live here. Never import from google.generativeai or
any LLM library directly in service code — use services/llm.py instead.
Changing LLM provider requires only llm.py + this file.
"""

from pathlib import Path
from pydantic_settings import BaseSettings, SettingsConfigDict


_BACKEND_DIR = Path(__file__).resolve().parent.parent


class Settings(BaseSettings):
    # ── LLM ──────────────────────────────────────────────────────────────
    # REQUIRED for answer generation and claim extraction at ingest time.
    # Without this, ingestion runs in "no-claims" mode: BM25 + embeddings
    # are built, but PolicyClaims are empty → contradiction detection
    # is disabled. ANSWERABLE / UNKNOWN still work correctly.
    gemini_api_key: str = ""

    # Model name — change here ONLY. All LLM calls go through services/llm.py.
    gemini_model: str = "gemini-1.5-flash"
    gemini_temperature: float = 0.0

    # ── Retrieval ─────────────────────────────────────────────────────────
    top_k: int = 10
    # Minimum RRF score for a result to be considered "evidence found".
    # Below this threshold → UNKNOWN (low_confidence).
    relevance_threshold: float = 0.20
    # Standard RRF constant (k=60 is the recommended default).
    rrf_k: int = 60
    # Minimum cosine similarity for two chunks to be in "same topic" territory
    # (used as a pre-filter in contradiction detection).
    contradiction_sim_threshold: float = 0.75

    # ── Embedding model ───────────────────────────────────────────────────
    # all-MiniLM-L6-v2: 22M params, ~90 MB download, fast, good quality.
    # Change here only; never hardcode the model name elsewhere.
    embedding_model: str = "all-MiniLM-L6-v2"

    # ── Chunking ──────────────────────────────────────────────────────────
    # Approximate target chunk size in words (not tokens).
    # 300 words ≈ 390 tokens for typical academic prose.
    chunk_target_words: int = 300
    # Words to carry over between adjacent chunks for boundary smoothing.
    chunk_overlap_words: int = 40

    # ── Paths ─────────────────────────────────────────────────────────────
    # Anchored relative to backend/ directory for reliable execution from any CWD.
    corpus_dir: Path = _BACKEND_DIR.parent / "corpus"
    index_dir: Path = _BACKEND_DIR / "data"

    model_config = SettingsConfigDict(
        env_file=(_BACKEND_DIR / ".env", Path(".env")),
        env_file_encoding="utf-8",
        case_sensitive=False,
        extra="ignore",
    )


# Module-level singleton — import `settings` everywhere.
settings = Settings()
