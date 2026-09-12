"""
RuleLens Evaluation Runner.

Evaluates RuleLens against evaluation/dataset.json:
  - 10 ANSWERABLE questions
  - 25 UNKNOWN questions
  - 3 CONTRADICTORY questions

Reports:
  - ANSWERABLE Accuracy
  - UNKNOWN Accuracy
  - CONTRADICTORY Accuracy
  - Overall Accuracy
  - Citation Correctness
"""

from __future__ import annotations

import json
import sys
import time
from pathlib import Path

# Ensure backend app is on sys.path
backend_dir = Path(__file__).resolve().parent
if (backend_dir / "app").exists():
    sys.path.insert(0, str(backend_dir))
elif (backend_dir / "backend" / "app").exists():
    sys.path.insert(0, str(backend_dir / "backend"))

from app.config import settings
from app.services.decision import decide_state
from app.services.generation import generate_response
from app.services.retrieval import hybrid_search
from app.storage.index import BM25Index, EmbeddingIndex
from app.storage.store import build_lookups, load_chunks, load_claims


def run_evaluation():
    data_dir = settings.index_dir.resolve()
    chunks = load_chunks(data_dir)
    claims = load_claims(data_dir)
    chunks_by_id, claims_by_chunk_id = build_lookups(chunks, claims)
    bm25 = BM25Index.load(data_dir)
    emb = EmbeddingIndex.load(data_dir)

    dataset_path = Path(__file__).resolve().parent.parent / "evaluation" / "dataset.json"
    if not dataset_path.exists():
        dataset_path = Path("evaluation/dataset.json")
    
    with open(dataset_path, "r", encoding="utf-8") as f:
        dataset = json.load(f)

    questions = dataset["questions"]

    results_by_cat = {
        "answerable": {"correct": 0, "total": 0},
        "unanswerable-25": {"correct": 0, "total": 0},
        "contradictory": {"correct": 0, "total": 0},
    }

    citations_total = 0
    citations_valid = 0

    print("=" * 80)
    print(f"RuleLens Evaluation — Running {len(questions)} Questions")
    print("=" * 80)

    t0 = time.perf_counter()

    for item in questions:
        qid = item["id"]
        cat = item["category"]
        question = item["question"]
        expected_state = item["expected_state"]

        results_by_cat[cat]["total"] += 1

        # Pipeline execution
        evidence = hybrid_search(question, chunks_by_id, bm25, emb, top_k=settings.top_k)
        decision = decide_state(evidence, claims_by_chunk_id, chunks_by_id, query=question)
        response = generate_response(question, decision, chunks_by_id)

        predicted_state = response.state
        is_correct = (predicted_state == expected_state)
        if is_correct:
            results_by_cat[cat]["correct"] += 1

        # Check citations
        for cit in response.citations:
            citations_total += 1
            # Must point to an existing chunk with verbatim text
            orig = chunks_by_id.get(cit.chunk_id)
            if orig and orig.source_file == cit.source_file and cit.passage_text:
                citations_valid += 1

        status_sym = "PASS" if is_correct else "FAIL"
        print(f"[{status_sym}] {qid} ({cat:<15}) Expected: {expected_state:<13} Got: {predicted_state:<13} | {question[:45]}...")
        if not is_correct:
            print(f"       Reason: {decision.unknown_reason or 'None'}, Top sem={evidence[0].semantic_score if evidence else 0.0:.3f}, rrf={evidence[0].rrf_score if evidence else 0.0:.4f}")

    total_time = time.perf_counter() - t0

    # Summary
    ans_corr = results_by_cat["answerable"]["correct"]
    ans_tot = results_by_cat["answerable"]["total"]
    unkn_corr = results_by_cat["unanswerable-25"]["correct"]
    unkn_tot = results_by_cat["unanswerable-25"]["total"]
    cont_corr = results_by_cat["contradictory"]["correct"]
    cont_tot = results_by_cat["contradictory"]["total"]

    overall_corr = ans_corr + unkn_corr + cont_corr
    overall_tot = ans_tot + unkn_tot + cont_tot

    ans_acc = (ans_corr / ans_tot * 100) if ans_tot else 0.0
    unkn_acc = (unkn_corr / unkn_tot * 100) if unkn_tot else 0.0
    cont_acc = (cont_corr / cont_tot * 100) if cont_tot else 0.0
    overall_acc = (overall_corr / overall_tot * 100) if overall_tot else 0.0
    cit_correctness = (citations_valid / citations_total * 100) if citations_total else 100.0

    print("\n" + "=" * 80)
    print("EVALUATION RESULTS SUMMARY")
    print("=" * 80)
    print(f"ANSWERABLE Accuracy:    {ans_corr:2d} / {ans_tot:2d} ({ans_acc:6.2f}%)")
    print(f"UNKNOWN Accuracy:       {unkn_corr:2d} / {unkn_tot:2d} ({unkn_acc:6.2f}%)")
    print(f"CONTRADICTORY Accuracy: {cont_corr:2d} / {cont_tot:2d} ({cont_acc:6.2f}%)")
    print("-" * 80)
    print(f"Overall State Accuracy: {overall_corr:2d} / {overall_tot:2d} ({overall_acc:6.2f}%)")
    print(f"Citation Correctness:   {citations_valid:2d} / {citations_total:2d} ({cit_correctness:6.2f}%)")
    print(f"Total Execution Time:   {total_time:.2f} seconds")
    print("=" * 80)

    return {
        "answerable_acc": ans_acc,
        "unknown_acc": unkn_acc,
        "contradictory_acc": cont_acc,
        "overall_acc": overall_acc,
        "citation_correctness": cit_correctness,
    }


if __name__ == "__main__":
    run_evaluation()
