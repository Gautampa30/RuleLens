# RuleLens

**An Evidence-Grounded Policy Intelligence Assistant Distinguishing ANSWERABLE, UNKNOWN, and CONTRADICTORY Regulations.**

RuleLens is an academic policy assistant built to query institutional rulebooks with verifiable, zero-hallucination guarantees. Instead of treating large language models as ungrounded sources of truth, RuleLens uses a hybrid retrieval pipeline paired with a deterministic state-decision engine that runs **before** natural-language generation. Every query is classified into exactly one of three machine-readable states:

* **`ANSWERABLE`**: Sufficient, unambiguous evidence exists to answer the question directly.
* **`UNKNOWN`**: The corpus does not establish the requested rule.
* **`CONTRADICTORY`**: Multiple authoritative provisions state incompatible rules for the same situation.

---

## Why RuleLens?

Standard Retrieval-Augmented Generation (RAG) systems have a critical flaw when applied to legal, compliance, and academic rulebooks:

1. **Hallucination on Missing Rules**: When a policy manual is silent on a topic, standard RAG retrieves adjacent or irrelevant passages and prompts the LLM to guess, generating convincing but unauthorized answers.
2. **Silent Resolution of Conflicts**: When two official documents contradict each other (e.g., general university regulations vs. graduate school policies), typical RAG systems blend the provisions or pick one at random, concealing administrative bugs from students and advisors.

**RuleLens solves this by separating state determination from response generation:**
- State classification is **deterministic** and computed before LLM generation.
- The LLM **cannot** override the state, fabricate policy facts, or silently resolve contradictions.
- Citations are assembled server-side directly from stored, verbatim text chunks.

---

## The Three-State Model

Every API response returns a machine-readable `"state"` field (`ANSWERABLE`, `UNKNOWN`, or `CONTRADICTORY`) accompanied by factual decision basis diagnostics and audit steps.

### 1. ANSWERABLE
The supplied corpus contains direct, consistent regulatory provisions answering the inquiry.
* **Response**: Prominent answer, verbatim citation passages, source file, section breadcrumbs, and page numbers (for PDFs).
* **Canonical Example**:
  > **Query**: *"When is the tuition payment deadline?"*  
  > **State**: `ANSWERABLE`  
  > **Source**: `fee_schedule.md` Part C: Fee Deadlines  
  > **Passage**: *"Autumn Semester: 15 September | Spring Semester: 15 January | Summer Session: 10 June..."*

### 2. UNKNOWN
The supplied corpus does not establish the requested rule.
* **Corpus Boundary Distinction**: `UNKNOWN` means strictly that the rule is **not established by the supplied RuleLens corpus**. It does **not** claim the policy does not exist in real-world university administration.
* **Guardrail**: Refuses to extrapolate from adjacent text, returning zero affirmative citations and providing a transparent near-miss audit trail of retrieved chunks.
* **Canonical Example**:
  > **Query**: *"What is the deadline for submitting a military leave request?"*  
  > **State**: `UNKNOWN`  
  > **Decision Basis**: *"Retrieved corpus passages lack explicit regulatory provisions answering the specific question (zero-hallucination guardrail active)."*

### 3. CONTRADICTORY
The corpus contains genuinely irreconcilable provisions for the same scenario, scope, and population.
* **Behavior**: RuleLens surfaces both conflicting provisions side-by-side without attempting to guess or silently reconcile the conflict.
* **Canonical Example (Contradiction C-001)**:
  > **Query**: *"Who approves a late course withdrawal?"*  
  > **State**: `CONTRADICTORY`  
  > **Conflict**:  
  > • **Provision 1**: `academic_regulations.md §5.3`:
  >   > *"Late withdrawal requests must be reviewed and approved by the **Dean of the student's faculty**... sole authority to approve or deny the request."*  
  > • **Provision 2**: `graduate_policies.md §2.6`:
  >   > *"Such requests must be reviewed and approved by the **Graduate Studies Committee**... requests may not be approved by a faculty Dean acting alone."*

---

## Architecture & Pipeline

```
                     User Query
                         │
                         ▼
                 [Hybrid Retrieval]
                 ├── Lexical: BM25 (rank-bm25)
                 └── Semantic: Cosine Sim (sentence-transformers / all-MiniLM-L6-v2)
                         │
                         ▼
               [Reciprocal Rank Fusion]
                 RRF Score = Σ 1 / (60 + rank)
                         │
                         ▼
             [Deterministic Decision Engine]
             ├── Relevance & Missing Key Term Guardrails
             └── Policy Claim Contradiction Matrix
                         │
        ┌────────────────┼────────────────┐
        ▼                ▼                ▼
  [ANSWERABLE]       [UNKNOWN]     [CONTRADICTORY]
        │                │                │
        └────────────────┼────────────────┘
                         ▼
            [Grounded Response Generator]
        (Gemini 1.5 Flash or Fallback Verbatim)
                         │
                         ▼
          [Server-Side Citation Assembly]
         (Exact slice of stored EvidenceChunks)
                         │
                         ▼
              [Next.js Student UI]
```

### Trust & Safety Invariants

| Invariant | Implementation Mechanism |
|---|---|
| **Deterministic State** | Decided in `backend/app/services/decision.py` before any LLM prompt is executed. |
| **No LLM Overrides** | LLM output cannot alter the classified state or status enum. |
| **Verbatim Citations** | Citations are validated and assembled server-side from `EvidenceChunk` objects stored in index. |
| **Zero Hallucination** | Discriminatory term matching checks if requested concepts are absent from retrieved text. |
| **No Silent Resolution** | When conflict claims match the same population, both sides are surfaced with verbatim quotes. |

---

## Technology Stack

* **Frontend**: Next.js 16 (App Router), React 19, TypeScript, Tailwind CSS v4, Lucide Icons.
* **Backend**: FastAPI, Python 3.11+, Pydantic v2, Pydantic-Settings.
* **Retrieval**:
  * **Lexical**: BM25 via `rank-bm25` (tokenized, stopword filtered).
  * **Semantic**: Dense sentence embeddings using `sentence-transformers` (`all-MiniLM-L6-v2`, 384 dimensions).
  * **Fusion**: Reciprocal Rank Fusion (RRF, $k=60$).
* **Document Processing**: `PyMuPDF` (fitz) for PDF extraction with exact page numbering; custom structural Markdown parser preserving heading paths (`section_path`).
* **Storage**: Local JSON stores (`chunks.json`, `claims.json`), NumPy embedding arrays (`embeddings.npy`), BM25 serialized indices.

---

## Repository Structure

```
RuleLens/
├── corpus/                         # Authoritative university regulations
│   ├── academic_regulations.md     # Core academic policies (§1.1 – §8.4)
│   ├── graduate_policies.md        # Graduate studies policies (§1.1 – §5.3)
│   ├── fee_schedule.md             # Tuition, mandatory fees, and deadline tables
│   ├── appeals_and_conduct.md      # Academic appeals and conduct code
│   ├── student_handbook.pdf        # Official PDF document with page numbers
│   └── contradictions.md           # Planted contradictions documentation (C-001, C-002, C-003)
├── backend/                        # FastAPI backend application
│   ├── app/
│   │   ├── main.py                 # FastAPI endpoints (/health, /corpus/status, /query)
│   │   ├── config.py               # Application settings and retrieval thresholds
│   │   ├── models.py               # Pydantic schemas (QueryResponse, TraceStep, EvidenceChunk, etc.)
│   │   ├── services/
│   │   │   ├── retrieval.py        # BM25 + dense embedding hybrid search with RRF
│   │   │   ├── decision.py         # Deterministic three-state classification engine
│   │   │   ├── contradiction.py    # Cross-document policy claim conflict comparator
│   │   │   ├── generation.py       # Grounded LLM response generation with trace steps
│   │   │   ├── citation.py         # Server-side citation assembly from verbatim chunks
│   │   │   └── ingestion.py        # Markdown/PDF chunking and deterministic chunk_id formula
│   │   └── storage/                # Index persistence (BM25Index, EmbeddingIndex, store lookups)
│   ├── data/                       # Ingested chunks, claims, and serialized search indices
│   ├── tests/                      # Automated test suite (116 unit & integration tests)
│   ├── evaluate.py                 # 38-question benchmark evaluation runner
│   ├── smoke_test.py               # Convenience wrapper for smoke tests
│   ├── requirements.txt            # Python dependencies
│   └── .env.example                # Configuration template
├── frontend/                       # Next.js user interface
│   ├── src/
│   │   ├── app/page.tsx            # Main search page and state coordinator
│   │   ├── components/             # AnswerCard, UnknownView, ContradictionView, EvidenceTrace, etc.
│   │   └── types/api.ts            # Frontend TypeScript definitions
│   └── package.json
├── evaluation/
│   └── dataset.json                # Ground-truth evaluation dataset (38 labeled questions)
├── demo.py                         # Standalone canonical demo runner (ANSWERABLE, UNKNOWN, CONTRADICTORY)
├── smoke_test.py                   # Automated end-to-end submission smoke test runner
├── AGENTS.md                       # Project specification and design guidelines
└── README.md                       # Project documentation
```

---

## Quick Start Guide

### Prerequisites
* **Python**: 3.11, 3.12, 3.13, or 3.14
* **Node.js**: 18.x or later (with `npm`)
* **OS**: Windows (PowerShell), macOS, or Linux

---

### 1. Backend Setup

Open a terminal in the project root:

```powershell
# Navigate to backend directory
cd backend

# Create and activate virtual environment
python -m venv .venv
.venv\Scripts\Activate.ps1    # On Linux/macOS: source .venv/bin/activate

# Install backend dependencies
pip install -r requirements.txt

# (Optional) Configure Gemini API key for natural language prose generation
# If omitted, RuleLens operates in deterministic fallback mode with verbatim evidence
copy .env.example .env
```

To run the FastAPI server:
```powershell
.venv\Scripts\uvicorn app.main:app --host 127.0.0.1 --port 8000
```
* API Health Check: `http://127.0.0.1:8000/health`  
* Interactive API Docs: `http://127.0.0.1:8000/docs`

---

### 2. Frontend Setup

In a second terminal window:

```powershell
# Navigate to frontend directory
cd frontend

# Install Node dependencies
npm install

# Start Next.js development server
npm run dev
```

Open `http://localhost:3000` in your web browser.

---

## Running the Canonical Demo

RuleLens includes a standalone runner (`demo.py`) that tests the three canonical demonstration queries directly against the retrieval and deterministic decision services without requiring a running web server:

```powershell
backend\.venv\Scripts\python demo.py
```

### Canonical Demonstration Scenarios Tested:
1. **`ANSWERABLE`**: `"When is the tuition payment deadline?"`
   * Verifies explicit deadlines retrieved from `fee_schedule.md`.
2. **`UNKNOWN`**: `"What is the deadline for submitting a military leave request?"`
   * Verifies zero-hallucination refusal on uncodified policy matters.
3. **`CONTRADICTORY`**: `"Who approves a late course withdrawal?"`
   * Verifies detection of conflict C-001 (`academic_regulations.md §5.3` Dean vs. `graduate_policies.md §2.6` Graduate Studies Committee).

---

## Submission Smoke Tests

To verify that the complete RuleLens submission is operational and satisfies all core invariants, run the automated smoke test:

```powershell
backend\.venv\Scripts\python smoke_test.py
```

### Verified Checks:
- `[PASS] Corpus and Index Integrity`: 241 chunks, 13 structured claims, BM25 & dense vector indices loadable.
- `[PASS] ANSWERABLE Pipeline`: Correct state returned with authoritative citations attached.
- `[PASS] UNKNOWN Guardrail`: Refuses to invent uncodified rules; attaches near-miss audit trail.
- `[PASS] CONTRADICTORY Conflict Engine`: Accurately identifies C-001 side-by-side provisions.
- `[PASS] Citation & Evidence Verbatim Integrity`: Citations point to existing chunks and contain exact substrings of corpus text.

**Result**: `5/5 checks passed`

---

## Benchmark Evaluation

RuleLens includes an evaluation framework (`evaluation/dataset.json`) containing 38 realistic questions categorized across all three target states:

```powershell
cd backend
.venv\Scripts\python evaluate.py
```

### Measured Benchmark Performance (on included corpus):

```text
================================================================================
EVALUATION RESULTS SUMMARY
================================================================================
ANSWERABLE Accuracy:    10 / 10 (100.00%)
UNKNOWN Accuracy:       25 / 25 (100.00%)
CONTRADICTORY Accuracy:  3 /  3 (100.00%)
--------------------------------------------------------------------------------
Overall State Accuracy: 38 / 38 (100.00%)
Citation Correctness:   36 / 36 (100.00%)
Total Execution Time:   ~14.5 seconds
================================================================================
```

> **Evaluation Disclosure**: These metrics were measured on the project's included 38-question benchmark evaluation set. They demonstrate the correctness and reliability of the deterministic decision engine on the curated corpus, and are not a claim of universal performance on arbitrary uncurated text.

---

## Automated Test Suite

To run the comprehensive test suite (models, ingestion, BM25/semantic retrieval, reciprocal-rank fusion, contradiction detection, citation assembly, end-to-end endpoints):

```powershell
cd backend
.venv\Scripts\pytest tests/ -v
```

**Verified Test Result**: `116 passed in ~25s`

---

## Demonstration Video / Interface Walkthrough

<!-- DEMO PLACEHOLDER: Final recorded video walkthrough demonstrating all three states, side-by-side contradiction inspection, and evidence tracing. -->

A demonstration session of RuleLens covers:
1. **ANSWERABLE Experience**: Querying fee deadlines, inspecting verbatim source cards, and verifying breadcrumb metadata.
2. **UNKNOWN Experience**: Querying plausible unanswerable edge-cases (e.g., military leave deadlines) and inspecting the transparent corpus-boundary explanation.
3. **CONTRADICTORY Experience**: Querying approval authorities for late course withdrawals and viewing side-by-side provision cards.
4. **Evidence Trace**: Reviewing the 5-step factual audit trail showing lexical/dense scores, decision bases, and guardrail statuses.

---

## Known Limitations

1. **Synthetic Corpus Scope**: The evaluation corpus covers Ashford University regulations (~6,400 words across Markdown and PDF). Policies outside this domain naturally produce `UNKNOWN`.
2. **Contradiction Detection Scope**: The contradiction engine compares structured `PolicyClaim` attributes (authority, threshold values, numerical durations, and conditions). Natural language contradictions whose concepts are not captured by claim schemas rely on retrieval score thresholds.
3. **Corpus Boundary Semantics**: `UNKNOWN` signifies that the rule cannot be established from the supplied corpus; it is not a legal guarantee that such a rule does not exist elsewhere.
4. **LLM Dependency**: When `GEMINI_API_KEY` is provided, natural language synthesis is generated with strict temperature (`0.0`). When absent, RuleLens seamlessly falls back to verbatim excerpt display with zero loss in classification accuracy.
