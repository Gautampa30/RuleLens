# RuleLens — Agent Instructions

## 1. Project Goal

RuleLens is an evidence-grounded academic regulation assistant.

The purpose of the project is to answer student questions using ONLY
the supplied academic regulation corpus.

The system must reliably distinguish between exactly three states:

1. ANSWERABLE
2. UNKNOWN
3. CONTRADICTORY

The project is being built for a Vibe Coding competition where the
evaluator will inspect both the working application and the Git history.

The goal is a complete, reliable, measurable and polished product,
not a generic chatbot.

---

## 2. Core Principle

### Evidence first. Generation second.

The LLM must NEVER be treated as the source of truth.

The system must retrieve relevant evidence from the supplied corpus
before generating an answer.

If the corpus does not contain enough evidence to answer a question,
the system must return UNKNOWN.

If relevant provisions contain genuinely incompatible rules for the
same situation, the system must return CONTRADICTORY.

The model's general knowledge must never be used to fill missing
information.

---

## 3. Required Three States

The system must expose the state in a machine-readable form.

Valid states:

- ANSWERABLE
- UNKNOWN
- CONTRADICTORY

Do not rely on interpreting free-form natural-language answers to
determine the state.

Example:

{
  "state": "ANSWERABLE",
  "answer": "...",
  "evidence": [...]
}

The evaluation script must be able to directly inspect the state.

---

## 4. Evidence and Citations

Every factual claim in an answer must be supported by retrieved
evidence from the corpus.

Evidence must preserve:

- source filename
- document title
- section/heading when available
- page number when available
- chunk/passage ID
- exact passage text

Users must be able to inspect the source passage behind an answer.

Never create fake citations.

Never cite a document merely because it is related to the topic.

A citation must actually support the claim being made.

---

## 5. Corpus Requirements

The final corpus must contain:

- At least 6,000 words
- Markdown content
- A table containing fee deadlines
- At least one PDF
- Three deliberately planted real contradictions

The contradictions must be documented in:

`contradictions.md`

Each contradiction should record:

- contradiction ID
- first source
- first section
- first passage
- second source
- second section
- second passage
- explanation of why the provisions conflict
- questions designed to test the contradiction

The corpus should be realistic and internally coherent except for
the deliberately planted contradictions.

---

## 6. Evaluation Requirements

The project must contain an executable evaluation system.

The evaluation must include:

- answerable questions
- contradictory questions
- 25 plausible unanswerable questions

The 25 unanswerable questions must be realistic near-misses.

Do NOT create absurd questions just to make UNKNOWN easy.

The evaluation must separately report performance on the 25
unanswerable questions.

At minimum measure:

- overall state accuracy
- ANSWERABLE accuracy
- UNKNOWN accuracy
- CONTRADICTORY accuracy
- citation correctness

Never fabricate evaluation numbers.

All reported metrics must come from actually running the evaluation.

---

## 7. Retrieval Architecture

Prefer a hybrid retrieval approach.

The intended direction is:

- lexical retrieval using BM25
- semantic retrieval using sentence embeddings
- candidate combination
- reranking/evidence selection

Use simple and understandable components.

The corpus is relatively small, so do NOT introduce unnecessary
distributed infrastructure or complicated vector databases.

NumPy-based vector similarity is acceptable.

Prioritize reliability and explainability over infrastructure.

---

## 8. Contradiction Detection

Contradiction detection is a core feature.

Do not simply assume that two similar passages are contradictory.

The system should consider:

- what rule is being stated
- the conditions under which it applies
- scope
- exceptions
- thresholds
- dates
- affected users
- whether one rule is conditional on another

Conditional rules should NOT automatically be classified as
contradictions.

Prefer a simple, defensible implementation over an ambitious but
unreliable contradiction engine.

---

## 9. UNKNOWN Handling

UNKNOWN is a first-class result.

The system must not answer a question simply because it can generate
a plausible answer.

When evidence is insufficient, return something equivalent to:

"The supplied rulebook does not specify this."

Explain briefly what related evidence was found when useful, but do not
turn related evidence into an unsupported answer.

The 25 unanswerable questions are an important evaluation target.

---

## 10. Answer Generation

The LLM should receive retrieved evidence as its factual context.

The generation prompt must explicitly instruct the model to:

- use only supplied evidence
- avoid outside knowledge
- avoid assumptions
- preserve conditions and exceptions
- cite supporting evidence
- refuse when evidence is insufficient
- surface conflicts instead of resolving them by guessing

Prefer structured output.

The generation layer must not silently override the decision engine.

---

## 11. Technology Direction

Preferred stack:

### Frontend
- Next.js
- TypeScript
- Tailwind CSS
- shadcn/ui
- Lucide icons

### Backend
- Python
- FastAPI
- Pydantic

### Retrieval
- sentence-transformers
- BM25
- NumPy

### Document processing
- PyMuPDF for PDF extraction
- appropriate Markdown/text parsing

### Storage
Prefer simple local storage such as:
- JSON
- SQLite
- NumPy arrays

Do not introduce a database or infrastructure system unless there is
a clear technical reason.

---

## 12. Architecture Principles

Use a clear pipeline:

User Question
    ↓
Query Analysis
    ↓
Hybrid Retrieval
    ↓
Evidence Selection
    ↓
Evidence / Claim Analysis
    ↓
Three-State Decision
    ↓
Structured Answer
    ↓
Citations
    ↓
Frontend

The architecture should separate:

- ingestion
- retrieval
- evidence analysis
- state classification
- answer generation
- citation generation
- evaluation

Avoid putting the entire application into one large file.

---

## 13. Frontend Principles

The UI should feel like a real student-facing product rather than
a generic ChatGPT clone.

The interface should make the three states visually obvious.

Users should be able to:

- ask a natural-language question
- see the resulting state
- read the answer
- inspect supporting evidence
- open exact source passages
- understand why the system returned UNKNOWN
- inspect conflicting provisions

Prioritize clarity and usability over excessive animation or visual
complexity.

---

## 14. API Principles

API responses must be structured and predictable.

The main query response should contain at least:

- state
- answer
- evidence
- citations

Do not make the frontend parse arbitrary prose to determine the state.

Use Pydantic models for API request/response validation.

---

## 15. Testing

Important behavior must have automated tests.

Test at least:

### Retrieval
- relevant passage retrieval
- semantic queries
- keyword queries

### ANSWERABLE
- directly stated rules
- conditional rules
- rules with exceptions

### UNKNOWN
- unrelated questions
- plausible adjacent questions
- questions where related but insufficient evidence exists

### CONTRADICTORY
- each of the three planted contradictions

### Citations
- source metadata is preserved
- cited passages actually exist
- page/section metadata is correct where available

Do not remove tests just to make the test suite pass.

---

## 16. Error Handling

Handle failures explicitly.

Examples:

- PDF extraction failure
- malformed document
- empty retrieval
- embedding failure
- LLM failure
- malformed LLM output
- missing citation
- insufficient evidence

Never silently swallow important errors.

Return useful error information for developers while keeping user-facing
errors understandable.

---

## 17. Development Workflow

Before implementing major functionality:

1. Inspect the existing repository.
2. Understand the current architecture.
3. Make the smallest reasonable change.
4. Run tests.
5. Run the application when appropriate.
6. Inspect the result.
7. Fix errors.
8. Only then move to the next feature.

Do not rewrite working parts of the application unnecessarily.

Do not modify unrelated files.

---

## 18. Git Workflow

Git history is part of the submission.

Make logical incremental commits.

Prefer commit messages such as:

- `chore: initialize project structure`
- `feat: add regulation corpus`
- `feat: implement document ingestion`
- `feat: add hybrid retrieval`
- `feat: implement three-state decision engine`
- `feat: add evidence citations`
- `test: add evaluation dataset`
- `feat: build query interface`
- `test: evaluate unknown questions`
- `fix: improve contradiction classification`
- `polish: improve evidence viewer`
- `docs: add setup and evaluation results`

Do not create meaningless commits such as:

- `update`
- `changes`
- `fix`
- `final`
- `final2`

Commit working milestones.

---

## 19. Simplicity Rule

A complete simple implementation is better than an ambitious
half-finished implementation.

Do NOT introduce:

- unnecessary microservices
- unnecessary agents
- unnecessary cloud infrastructure
- unnecessary databases
- unnecessary frameworks
- autonomous multi-agent workflows
- web search for answering regulation questions

The system should be understandable by another developer reading
the repository.

---

## 20. Security and Configuration

Never commit API keys or secrets.

Use `.env` / `.env.example`.

Do not hard-code credentials.

Do not hard-code the expected answers for evaluation questions.

Do not hard-code the three contradictions into the query logic.

The system must genuinely retrieve and reason over the corpus.

---

## 21. Competition Requirements

The final project must demonstrate all three states:

1. ANSWERABLE
2. UNKNOWN
3. CONTRADICTORY

The demo must show:

- an answerable question
- an unanswerable question
- a contradiction
- exact source evidence
- the evaluation script running

The README must explain:

- what RuleLens does
- architecture
- setup
- how to run the application
- how to run evaluation
- evaluation results
- known limitations
- corpus structure

---

## 22. Agent Behavior

When asked to implement something:

- inspect existing code before editing
- explain significant architectural decisions
- prefer incremental changes
- run relevant tests
- fix errors before declaring success
- do not claim something works without testing it
- do not fabricate results
- do not hide failures

When requirements are ambiguous, choose the simplest implementation
that satisfies the explicit competition requirements.

Do not over-engineer.

---

## 23. Current Development Phase

At the beginning of the project, the agent should NOT immediately
implement the entire application.

First produce an architecture and implementation plan.

The architecture should be reviewed before major implementation begins.

After implementation starts, work in phases and keep each phase
independently testable.

---

## 24. Final Quality Bar

Before considering RuleLens complete, verify:

- [ ] Corpus is >= 6,000 words
- [ ] Markdown included
- [ ] Fee deadline table included
- [ ] PDF included
- [ ] Three real contradictions documented
- [ ] 25 plausible UNKNOWN questions included
- [ ] ANSWERABLE works
- [ ] UNKNOWN works
- [ ] CONTRADICTORY works
- [ ] Hybrid retrieval works
- [ ] Exact evidence citations work
- [ ] Machine-readable state exists
- [ ] Evaluation script runs
- [ ] Evaluation numbers are real
- [ ] Automated tests pass
- [ ] README is complete
- [ ] Demo flow works
- [ ] No secrets committed
- [ ] Git history shows incremental development

The highest priority is correctness and demonstrability of the
three-state evidence-grounded behavior.

A smaller reliable system is preferable to a larger unreliable one.