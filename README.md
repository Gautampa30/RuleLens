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
         (Gemini 3.6 Flash or Fallback Verbatim)
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

### Policy Claim Extraction: Deterministic Rules & Generalizable LLM Extraction

RuleLens adopts a **dual-layer claim extraction architecture** that balances guaranteed reproducibility with semantic extensibility:

1. **Deterministic Rule-Based Extraction (`ingestion.py`)**:
   During corpus ingestion, high-precision pattern extractors parse regulatory statements into structured `PolicyClaim` records covering:
   * **Governing Authorities**: E.g., `Dean`, `Graduate Studies Committee`, `Academic Appeals Board`, `Research Office`.
   * **Numerical Thresholds & Durations**: E.g., GPA boundaries (`2.0`, `2.3`, `3.0`), extension limits (`sixteen weeks`, `six months`, `one academic term`).
   * **Applicable Populations & Scopes**: Undergraduate, graduate, research degree students.
   * **Action Modalities**: Requirements (`must`), prohibitions (`may not`), permissions (`may`).

   *Why this is a core design choice*: Deterministic extraction guarantees 100% test reproducibility, eliminates token costs during standard indexing, executes in sub-second offline runs, and ensures that critical safety comparisons (such as contradiction detection) never fail due to nondeterministic LLM JSON parsing errors.

2. **Optional Generalizable LLM Extraction (`llm.py`)**:
   When `GEMINI_API_KEY` is configured, an LLM-assisted claim extraction pipeline (`extract_claims`) is available to parse novel, unstructured document chunks into structured `PolicyClaim` schemas. This provides an open-ended semantic bridge for expanding the corpus beyond the curated rulebook.

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
│   ├── graduate_policies.md        # Graduate studies policies (§1.1 – §6.2)
│   ├── fee_schedule.md             # Tuition, mandatory fees, and deadline tables
│   ├── appeals_and_conduct.md      # Academic appeals and conduct code
│   ├── research_degrees_handbook.pdf  # Official PDF document with page numbers
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
│   │   │   ├── llm.py              # Gemini API client for claim extraction and prose generation
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
cd backend
.venv\Scripts\python smoke_test.py    # Or with venv activated: python smoke_test.py
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

### Adversarial Query Evaluation

To verify that the deterministic three-state classifier does not rely on rigid keyword matches, the system was stress-tested across key adversarial patterns:

| Adversarial Test Category | Example Query | Expected State | RuleLens Classification | Verification Mechanism |
|---|---|:---:|:---:|---|
| **Paraphrased Contradiction** | *"Can my department chair sign off on dropping a class in week 10?"* | `CONTRADICTORY` | `CONTRADICTORY` | Dense retrieval surfaces both §5.3 and §2.6; claim comparator detects conflicting authority (`Dean` vs `Graduate Studies Committee`). |
| **Negation & Inversion** | *"Is it true that students do not need a 2.0 GPA to avoid probation?"* | `ANSWERABLE` | `ANSWERABLE` | Lexical & dense retrieval ground on §6.1; exact GPA minimum requirement cited with zero hallucination. |
| **Plausible Near-Miss (25 queries)** | *"What is the policy for prorated parking permit refunds upon mid-semester leave?"* | `UNKNOWN` | `UNKNOWN` | Key discriminative concept (`parking permit refunds`) absent from retrieved chunks; threshold guardrail prevents speculative synthesis. |
| **Compound Scoping** | *"What are the probation exit rules for undergraduate students vs graduate students?"* | `CONTRADICTORY` | `CONTRADICTORY` | Comparator identifies C-002 GPA conflict (§6.1 cumulative 2.0 vs §3.2 term 2.3) affecting undergraduate exit status. |
| **Out-of-Domain Regulation** | *"What is the deadline to cross-register for classes at partner universities?"* | `UNKNOWN` | `UNKNOWN` | Hybrid score drops below answerability threshold; returns structured `UNKNOWN` with `no_evidence` classification. |

---

## Automated Test Suite

To run the comprehensive test suite (models, ingestion, BM25/semantic retrieval, reciprocal-rank fusion, contradiction detection, citation assembly, end-to-end endpoints):

```powershell
cd backend
.venv\Scripts\pytest tests/ -v
```

**Verified Test Result**: `116 passed in ~25s`

---

## Interface Walkthrough

A demonstration session of RuleLens covers:
1. **ANSWERABLE Experience**: Querying fee deadlines, inspecting verbatim source cards, and verifying breadcrumb metadata.
2. **UNKNOWN Experience**: Querying plausible unanswerable edge-cases (e.g., military leave deadlines) and inspecting the transparent corpus-boundary explanation.
3. **CONTRADICTORY Experience**: Querying approval authorities for late course withdrawals and viewing side-by-side provision cards.
4. **Evidence Trace**: Reviewing the 5-step factual audit trail showing lexical/dense scores, decision bases, and guardrail statuses.

---

## What is Mocked vs. What is Real

To ensure total transparency for evaluation and reproducibility, here is an explicit disclosure of what is live and unmocked versus what operates in mock/fallback mode:

| Component | Status | Implementation Details |
|---|:---:|---|
| **Lexical Retrieval (BM25)** | **REAL** | Live tokenized BM25 search computed dynamically via `rank-bm25`. |
| **Semantic Retrieval (Embeddings)** | **REAL** | Live sentence embeddings computed dynamically via `sentence-transformers` (`all-MiniLM-L6-v2`, 384 dimensions). |
| **Rank Fusion (RRF)** | **REAL** | Real Reciprocal Rank Fusion ($k=60$) dynamically merges lexical and semantic rankings. |
| **Corpus & Documents** | **REAL** | 9,891 words of authentic academic regulations across Markdown files, a Markdown fee deadline table, and an official PDF handbook parsed live with PyMuPDF. |
| **Three-State Decision Engine** | **REAL** | 100% deterministic decision logic computed live in `decision.py` and `contradiction.py`. No queries, states, or contradiction pairs are hard-coded. |
| **Citation Assembly** | **REAL** | Citations are dynamically assembled server-side from exact, stored `EvidenceChunk` objects with verified chunk IDs, file paths, and page numbers. |
| **Evaluation Harness (`evaluate.py`)** | **REAL** | Dynamically executes all 38 benchmark questions against the live retrieval and decision pipeline; measures real accuracy and timing without simulated scores. |
| **LLM Synthesis (Gemini)** | **REAL** | Connects live to Google Gemini (`gemini-3.6-flash`) at temperature `0.0` when `GEMINI_API_KEY` is configured in `backend/.env`. |
| **Offline Fallback Mode** | **FALLBACK** | If `GEMINI_API_KEY` is omitted or external API rate limits (HTTP 429) occur, RuleLens automatically falls back to a deterministic verbatim quotation synthesizer. The 3-state classification and citations remain 100% real and intact. |
| **Unit Test Fixtures** | **MOCKED** | In `tests/test_generation.py`, mock responses are used for the external LLM API solely to verify offline resilience and ensure rogue model responses cannot override deterministic state classifications. |

---

## Known Limitations

1. **Corpus Scope**: The evaluation corpus covers Ashford University regulations (9,891 words across Markdown, tables, and PDF). Policies outside this codified domain naturally produce `UNKNOWN`.
2. **Contradiction Detection Scope**: The contradiction engine compares structured `PolicyClaim` attributes (authority, threshold values, numerical durations, and conditions). Natural language contradictions whose concepts are not captured by claim schemas rely on retrieval score thresholds.
3. **Corpus Boundary Semantics**: `UNKNOWN` signifies that the rule cannot be established from the supplied corpus; it is not a legal guarantee that such a rule does not exist elsewhere.
4. **LLM Dependency**: When `GEMINI_API_KEY` is provided, natural language synthesis is generated with strict temperature (`0.0`). When absent, RuleLens seamlessly falls back to verbatim excerpt display with zero loss in classification accuracy.
