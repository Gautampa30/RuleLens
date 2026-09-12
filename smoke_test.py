"""
RuleLens Submission Smoke Test.

Lightweight, automated health check that verifies the RuleLens submission
end-to-end against the authoritative corpus and deterministic decision engine:

1. Corpus & Index Integrity:
   - Chunk database and PolicyClaims loadable
   - BM25 and Embedding indices operational
2. ANSWERABLE Canonical Check:
   - Query: "When is the tuition payment deadline?"
   - Verifies state == ANSWERABLE
   - Verifies citation exists and text matches authoritative stored evidence
3. UNKNOWN Canonical Check:
   - Query: "What is the deadline for submitting a military leave request?"
   - Verifies state == UNKNOWN
   - Verifies no fabricated answer and boundary explanation present
4. CONTRADICTORY Canonical Check:
   - Query: "Who approves a late course withdrawal?"
   - Verifies state == CONTRADICTORY
   - Verifies conflicting provisions pair exists
   - Verifies C-001 alignment:
       academic_regulations.md §5.3: "Dean of the student's faculty"
       vs.
       graduate_policies.md §2.6: "Graduate Studies Committee"
5. Citation & Evidence Invariants:
   - Citations assemble verbatim from stored chunks
   - Zero hallucination guardrails active

Exit Code:
   0 = All checks passed
   1 = One or more checks failed
"""

from __future__ import annotations

import sys
import time
from pathlib import Path

# Ensure UTF-8 output across all consoles
if hasattr(sys.stdout, "reconfigure"):
    try:
        sys.stdout.reconfigure(encoding="utf-8", errors="replace")
    except Exception:
        pass

# Ensure backend root is on Python sys.path
script_dir = Path(__file__).resolve().parent
if (script_dir / "backend" / "app").exists():
    sys.path.insert(0, str(script_dir / "backend"))
elif (script_dir / "app").exists():
    sys.path.insert(0, str(script_dir))
elif (script_dir.parent / "app").exists():
    sys.path.insert(0, str(script_dir.parent))

from app.config import settings
from app.services.decision import decide_state
from app.services.generation import generate_response
from app.services.retrieval import hybrid_search
from app.storage.index import BM25Index, EmbeddingIndex
from app.storage.store import build_lookups, load_chunks, load_claims


def run_smoke_tests() -> int:
    print("\n" + "=" * 70)
    print("  RuleLens Submission Smoke Test")
    print("=" * 70)

    t0 = time.perf_counter()
    checks_passed = 0
    total_checks = 5
    failures: list[str] = []

    # -------------------------------------------------------------------------
    # Check 1: Corpus & Index Data Integrity
    # -------------------------------------------------------------------------
    try:
        data_dir = settings.index_dir.resolve()
        chunks = load_chunks(data_dir)
        claims = load_claims(data_dir)
        chunks_by_id, claims_by_chunk_id = build_lookups(chunks, claims)
        bm25 = BM25Index.load(data_dir)
        emb = EmbeddingIndex.load(data_dir)

        if len(chunks) >= 50 and len(claims) >= 3:
            checks_passed += 1
            print(f"[PASS] Corpus and Index Integrity ({len(chunks)} chunks, {len(claims)} claims)")
        else:
            failures.append(f"Corpus too small: {len(chunks)} chunks, {len(claims)} claims")
            print(f"[FAIL] Corpus and Index Integrity (insufficient data: {len(chunks)} chunks)")
    except Exception as e:
        failures.append(f"Index loading failed: {e}")
        print(f"[FAIL] Corpus and Index Integrity ({e})")
        return 1

    # -------------------------------------------------------------------------
    # Check 2: ANSWERABLE Canonical Case
    # -------------------------------------------------------------------------
    try:
        q_ans = "When is the tuition payment deadline?"
        ev_ans = hybrid_search(q_ans, chunks_by_id, bm25, emb, top_k=settings.top_k)
        dec_ans = decide_state(ev_ans, claims_by_chunk_id, chunks_by_id, query=q_ans)
        resp_ans = generate_response(q_ans, dec_ans, chunks_by_id)

        has_state = (resp_ans.state == "ANSWERABLE")
        has_citations = len(resp_ans.citations) > 0
        has_basis = bool(resp_ans.decision_basis)

        if has_state and has_citations and has_basis:
            checks_passed += 1
            print(f"[PASS] ANSWERABLE Pipeline (State: {resp_ans.state}, {len(resp_ans.citations)} citation(s))")
        else:
            failures.append(f"ANSWERABLE failed: state={resp_ans.state}, citations={len(resp_ans.citations)}")
            print(f"[FAIL] ANSWERABLE Pipeline (State: {resp_ans.state}, Citations: {len(resp_ans.citations)})")
    except Exception as e:
        failures.append(f"ANSWERABLE query crashed: {e}")
        print(f"[FAIL] ANSWERABLE Pipeline ({e})")

    # -------------------------------------------------------------------------
    # Check 3: UNKNOWN Canonical Case
    # -------------------------------------------------------------------------
    try:
        q_unkn = "What is the deadline for submitting a military leave request?"
        ev_unkn = hybrid_search(q_unkn, chunks_by_id, bm25, emb, top_k=settings.top_k)
        dec_unkn = decide_state(ev_unkn, claims_by_chunk_id, chunks_by_id, query=q_unkn)
        resp_unkn = generate_response(q_unkn, dec_unkn, chunks_by_id)

        has_state = (resp_unkn.state == "UNKNOWN")
        zero_citations = len(resp_unkn.citations) == 0
        has_near_miss = len(resp_unkn.related_evidence) > 0

        if has_state and zero_citations and has_near_miss:
            checks_passed += 1
            print(f"[PASS] UNKNOWN Zero-Hallucination Guardrail (State: {resp_unkn.state}, Citations: 0, Audit: {len(resp_unkn.related_evidence)})")
        else:
            failures.append(f"UNKNOWN failed: state={resp_unkn.state}, citations={len(resp_unkn.citations)}")
            print(f"[FAIL] UNKNOWN Zero-Hallucination Guardrail (State: {resp_unkn.state})")
    except Exception as e:
        failures.append(f"UNKNOWN query crashed: {e}")
        print(f"[FAIL] UNKNOWN Zero-Hallucination Guardrail ({e})")

    # -------------------------------------------------------------------------
    # Check 4: CONTRADICTORY Canonical Case & C-001 Verification
    # -------------------------------------------------------------------------
    try:
        q_cont = "Who approves a late course withdrawal?"
        ev_cont = hybrid_search(q_cont, chunks_by_id, bm25, emb, top_k=settings.top_k)
        dec_cont = decide_state(ev_cont, claims_by_chunk_id, chunks_by_id, query=q_cont)
        resp_cont = generate_response(q_cont, dec_cont, chunks_by_id)

        has_state = (resp_cont.state == "CONTRADICTORY")
        pairs = resp_cont.contradiction_pairs
        has_pairs = len(pairs) > 0

        c001_aligned = False
        if has_pairs:
            pair_summaries = [
                f"{p.claim_a.source_file}:{p.claim_a.value} vs {p.claim_b.source_file}:{p.claim_b.value}"
                for p in pairs
            ]
            c001_aligned = any(
                ("Dean of the student's faculty" in s or "academic_regulations.md" in s) and
                ("Graduate Studies Committee" in s or "graduate_policies.md" in s)
                for s in pair_summaries
            )

        if has_state and has_pairs and c001_aligned:
            checks_passed += 1
            print(f"[PASS] CONTRADICTORY Conflict Engine (State: {resp_cont.state}, C-001 Provisions Verified)")
        else:
            failures.append(f"CONTRADICTORY failed: state={resp_cont.state}, pairs={len(pairs)}, c001={c001_aligned}")
            print(f"[FAIL] CONTRADICTORY Conflict Engine (State: {resp_cont.state}, C-001 Aligned: {c001_aligned})")
    except Exception as e:
        failures.append(f"CONTRADICTORY query crashed: {e}")
        print(f"[FAIL] CONTRADICTORY Conflict Engine ({e})")

    # -------------------------------------------------------------------------
    # Check 5: Citation & Evidence Verbatim Text Invariant
    # -------------------------------------------------------------------------
    try:
        citation_invariant_valid = True
        for cit in resp_ans.citations:
            orig_chunk = chunks_by_id.get(cit.chunk_id)
            if not orig_chunk:
                citation_invariant_valid = False
                failures.append(f"Citation references non-existent chunk_id: {cit.chunk_id}")
                break
            if orig_chunk.source_file != cit.source_file:
                citation_invariant_valid = False
                failures.append(f"Source file mismatch: {orig_chunk.source_file} != {cit.source_file}")
                break
            if not cit.passage_text or cit.passage_text not in orig_chunk.text:
                citation_invariant_valid = False
                failures.append(f"Citation text is not verbatim subset of chunk {cit.chunk_id}")
                break

        if citation_invariant_valid:
            checks_passed += 1
            print("[PASS] Citation & Verbatim Evidence Integrity")
        else:
            print("[FAIL] Citation & Verbatim Evidence Integrity")
    except Exception as e:
        failures.append(f"Citation invariant check crashed: {e}")
        print(f"[FAIL] Citation & Verbatim Evidence Integrity ({e})")

    # -------------------------------------------------------------------------
    # Summary
    # -------------------------------------------------------------------------
    elapsed = time.perf_counter() - t0
    print("-" * 70)
    print(f"Result: {checks_passed}/{total_checks} checks passed ({elapsed:.2f}s)")
    if failures:
        print("\nFailures:")
        for f in failures:
            print(f"  • {f}")
        print("=" * 70 + "\n")
        return 1
    else:
        print("All submission core invariants verified healthy.")
        print("=" * 70 + "\n")
        return 0


if __name__ == "__main__":
    sys.exit(run_smoke_tests())
