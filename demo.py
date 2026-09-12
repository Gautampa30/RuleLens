"""
RuleLens Canonical Demo Runner.

Executes the three canonical demonstration queries directly against the
authoritative RuleLens retrieval and deterministic decision pipeline:

  1. ANSWERABLE:    "When is the tuition payment deadline?"
  2. UNKNOWN:       "What is the deadline for submitting a military leave request?"
  3. CONTRADICTORY: "Who approves a late course withdrawal?"

Displays:
  - Query
  - Expected state vs. Actual state (PASS/FAIL)
  - Deterministic decision basis
  - Relevant evidence and exact source citations
  - Side-by-side conflicting provisions for CONTRADICTORY (C-001)

Exits with code 0 on success, or 1 if any canonical test case fails.
"""

import sys
import time
from pathlib import Path

# Ensure UTF-8 output even on legacy Windows terminals
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

from app.config import settings
from app.services.decision import decide_state
from app.services.generation import generate_response
from app.services.retrieval import hybrid_search
from app.storage.index import BM25Index, EmbeddingIndex
from app.storage.store import build_lookups, load_chunks, load_claims

CANONICAL_CASES = [
    {
        "id": "DEMO-01",
        "name": "ANSWERABLE",
        "question": "When is the tuition payment deadline?",
        "expected_state": "ANSWERABLE",
        "description": "Corpus contains explicit, unambiguous tuition deadlines in fee_schedule.md.",
    },
    {
        "id": "DEMO-02",
        "name": "UNKNOWN",
        "question": "What is the deadline for submitting a military leave request?",
        "expected_state": "UNKNOWN",
        "description": (
            "Near-miss: corpus addresses general leave of absence and academic deadlines, "
            "but never specifies a military leave deadline. System refuses to fabricate."
        ),
    },
    {
        "id": "DEMO-03",
        "name": "CONTRADICTORY",
        "question": "Who approves a late course withdrawal?",
        "expected_state": "CONTRADICTORY",
        "description": (
            "Contradiction C-001: academic_regulations.md §5.3 mandates Dean of the student's faculty, "
            "while graduate_policies.md §2.6 mandates Graduate Studies Committee."
        ),
    },
]


def run_demo() -> int:
    print("\n" + "=" * 80)
    print("  RULELENS — CANONICAL THREE-STATE POLICY INTELLIGENCE DEMO")
    print("=" * 80)
    print("Corpus: Ashford University Academic Regulations & Policies")
    print("Mode:   Direct service execution (Lexical BM25 + Semantic MiniLM + Deterministic Decision)")
    print("=" * 80 + "\n")

    t_start = time.perf_counter()

    # Load indexes and stores
    data_dir = settings.index_dir.resolve()
    print(f"[*] Loading indexed corpus from: {data_dir}")
    chunks = load_chunks(data_dir)
    claims = load_claims(data_dir)
    chunks_by_id, claims_by_chunk_id = build_lookups(chunks, claims)
    bm25 = BM25Index.load(data_dir)
    emb = EmbeddingIndex.load(data_dir)
    print(f"[*] Loaded {len(chunks)} text chunks, {len(claims)} policy claims, BM25 & dense vector indices.\n")

    all_passed = True

    for case in CANONICAL_CASES:
        case_id = case["id"]
        expected = case["expected_state"]
        query = case["question"]

        print("-" * 80)
        print(f"[{case_id}] Canonical Scenario: {case['name']}")
        print(f"Query:          \"{query}\"")
        print(f"Expected State: {expected}")
        print(f"Context:        {case['description']}")
        print("-" * 80)

        # 1. Hybrid Retrieval
        evidence = hybrid_search(query, chunks_by_id, bm25, emb, top_k=settings.top_k)

        # 2. Deterministic Decision Engine
        decision = decide_state(evidence, claims_by_chunk_id, chunks_by_id, query=query)

        # 3. Grounded Response & Citation Assembly
        response = generate_response(query, decision, chunks_by_id)

        actual = response.state
        passed = (actual == expected)
        if not passed:
            all_passed = False

        status_tag = "[PASS]" if passed else "[FAIL]"
        print(f"Result:         {status_tag} Actual State: {actual}")
        print(f"Decision Basis: {response.decision_basis}")

        # State-specific displays
        if actual == "ANSWERABLE":
            print("\n  Answer:")
            print(f"    {response.answer}")
            print(f"\n  Supporting Citations ({len(response.citations)} attached):")
            for cit in response.citations:
                sec = " > ".join(cit.section_path) if cit.section_path else "General"
                page_info = f" (Page {cit.page_number})" if cit.page_number else ""
                print(f"    • [{cit.chunk_id}] {cit.source_file}{page_info} § {sec}")
                print(f"      Passage: \"{cit.passage_text[:140]}...\"")

        elif actual == "UNKNOWN":
            print("\n  Corpus Boundary Explanation:")
            print(f"    {response.answer}")
            print(f"    Corpus boundary distinction: 'Not established by this corpus' != 'Rule does not exist'.")
            if response.related_evidence:
                print(f"\n  Transparent Audit Trail (Top {min(2, len(response.related_evidence))} near-miss retrieved chunks):")
                for sc in response.related_evidence[:2]:
                    sec = " > ".join(sc.section_path) if sc.section_path else "General"
                    print(f"    • [{sc.id}] {sc.source_file} § {sec}")
                    print(f"      Excerpt: \"{sc.text[:120]}...\"")

        elif actual == "CONTRADICTORY":
            print("\n  Conflicting Authoritative Provisions (Side-by-Side):")
            pairs = response.contradiction_pairs
            if not pairs:
                print("    [!] Warning: No contradiction pairs attached.")
                all_passed = False
            else:
                for idx, pair in enumerate(pairs, 1):
                    ca = pair.claim_a
                    cb = pair.claim_b
                    print(f"\n  Conflict #{idx} -- Subject: {pair.policy_subject} ({pair.conflict_type}):")
                    print(f"    [+] Provision 1: {ca.source_file} ({' > '.join(ca.section_path)})")
                    print(f"        Mandate / Value: \"{ca.value}\"")
                    print(f"        Citation ID:     [{ca.chunk_id}]")
                    if ca.passage_text:
                        print(f"        Verbatim text:   \"{ca.passage_text[:120]}...\"")
                    print(f"    [-] Provision 2: {cb.source_file} ({' > '.join(cb.section_path)})")
                    print(f"        Mandate / Value: \"{cb.value}\"")
                    print(f"        Citation ID:     [{cb.chunk_id}]")
                    if cb.passage_text:
                        print(f"        Verbatim text:   \"{cb.passage_text[:120]}...\"")

            # Verify C-001 specific conflict authorities
            conflict_texts = [
                f"{pair.claim_a.source_file} -> {pair.claim_a.value} vs {pair.claim_b.source_file} -> {pair.claim_b.value}"
                for pair in pairs
            ]
            c001_verified = any(
                ("Dean of the student's faculty" in ct or "academic_regulations.md" in ct) and
                ("Graduate Studies Committee" in ct or "graduate_policies.md" in ct)
                for ct in conflict_texts
            )
            print(f"\n  C-001 Provision Alignment Verified: {'YES' if c001_verified else 'NO'}")
            if not c001_verified:
                all_passed = False

        print("\n")

    elapsed = time.perf_counter() - t_start
    print("=" * 80)
    print(f"DEMO SUMMARY: {'ALL 3 CANONICAL TESTS PASSED' if all_passed else 'SOME TESTS FAILED'} ({elapsed:.2f}s)")
    print("=" * 80 + "\n")

    return 0 if all_passed else 1


if __name__ == "__main__":
    sys.exit(run_demo())
