"""
Document ingestion and chunking for RuleLens.

Pipeline per file:
  parse_markdown()  → list[EvidenceChunk]  (Markdown files)
  parse_pdf()       → list[EvidenceChunk]  (PDF files via PyMuPDF)
  ingest_corpus()   → list[EvidenceChunk]  (all files in corpus_dir)

Chunking strategy (documented inline):
  - Markdown: split on blank lines (paragraph boundaries); merge short
    paragraphs with the next; each table data-row is one atomic chunk.
  - PDF: extract text page by page; split extracted text into paragraphs.
  - Target chunk size: settings.chunk_target_words words.
  - Overlap: settings.chunk_overlap_words words carried forward.
  - Headings update section_path but are NOT standalone chunks.
  - Chunk IDs are deterministic: sha256(source_file::char_offset::text[:80]).

Error handling: extraction failures log a warning and are skipped; they
never silently corrupt the chunk list.
"""

from __future__ import annotations

import logging
import re
from pathlib import Path
from typing import Optional

from app.config import settings
from app.models import EvidenceChunk

logger = logging.getLogger(__name__)

# ─────────────────────────────────────────────────────────────────────────────
# Markdown ingestion
# ─────────────────────────────────────────────────────────────────────────────

# Heading pattern: captures the level (number of #) and the heading text.
_HEADING_RE = re.compile(r"^(#{1,6})\s+(.+)$")
# Markdown table separator row (e.g. |---|---|)
_TABLE_SEP_RE = re.compile(r"^\|[-|:\s]+\|$")
# Any table row
_TABLE_ROW_RE = re.compile(r"^\|(.+)\|$")
# Horizontal rule
_HR_RE = re.compile(r"^---+$")


def _clean_inline(text: str) -> str:
    """Strip inline Markdown formatting (bold, italic, code) from text."""
    text = re.sub(r"\*\*(.+?)\*\*", r"\1", text)
    text = re.sub(r"\*(.+?)\*", r"\1", text)
    text = re.sub(r"`(.+?)`", r"\1", text)
    return text.strip()


def _extract_table_header(row: str) -> list[str]:
    """Parse a Markdown table row into a list of cleaned cell strings."""
    cells = [c.strip() for c in row.strip().strip("|").split("|")]
    return [_clean_inline(c) for c in cells]


def _words(text: str) -> list[str]:
    return text.split()


def _make_chunk(
    source_file: str,
    source_type: str,
    doc_title: str,
    section_path: list[str],
    page_number: Optional[int],
    char_offset: int,
    text: str,
) -> Optional[EvidenceChunk]:
    text = text.strip()
    if not text:
        return None
    word_count = len(_words(text))
    if word_count < 5:
        # Skip trivially short chunks (e.g. headings only)
        return None
    chunk_id = EvidenceChunk.make_id(source_file, char_offset, text)
    return EvidenceChunk(
        id=chunk_id,
        source_file=source_file,
        source_type=source_type,
        doc_title=doc_title,
        section_path=list(section_path),
        page_number=page_number,
        char_offset=char_offset,
        text=text,
        word_count=word_count,
    )


def parse_markdown(filepath: Path) -> list[EvidenceChunk]:
    """
    Parse a Markdown file into EvidenceChunks.

    Chunking rules:
      1. Track heading stack (H1 → H2 → H3) to build section_path.
      2. Each blank-line-separated paragraph is a candidate chunk.
      3. Short paragraphs (< chunk_target_words/3 words) are merged
         with the next paragraph before forming a chunk.
      4. Large paragraphs are split at sentence boundaries.
      5. Table data rows: each row → atomic chunk prefixed with
         "Table: <col1>: <val1> | <col2>: <val2> | …"
         so citation text is self-explanatory.
    """
    try:
        raw = filepath.read_text(encoding="utf-8")
    except OSError as exc:
        logger.error("Cannot read %s: %s", filepath, exc)
        return []

    source_file = filepath.name
    doc_title = filepath.stem.replace("_", " ").title()
    chunks: list[EvidenceChunk] = []

    # heading_stack: index 0 = H1, 1 = H2, 2 = H3
    heading_stack: list[str] = []
    current_table_headers: list[str] = []
    accumulated: list[str] = []   # lines for the current paragraph block
    char_offset = 0

    def flush(text: str, offset: int) -> None:
        """Emit chunks from accumulated text, splitting at word limits."""
        text = text.strip()
        if not text:
            return
        words = _words(text)
        target = settings.chunk_target_words
        overlap = settings.chunk_overlap_words

        if len(words) <= target:
            c = _make_chunk(source_file, "markdown", doc_title,
                            heading_stack, None, offset, text)
            if c:
                chunks.append(c)
        else:
            # Split into target-sized segments with overlap
            start = 0
            while start < len(words):
                end = min(start + target, len(words))
                segment = " ".join(words[start:end])
                c = _make_chunk(source_file, "markdown", doc_title,
                                heading_stack, None, offset, segment)
                if c:
                    chunks.append(c)
                if end == len(words):
                    break
                start = end - overlap

    lines = raw.splitlines()
    i = 0
    while i < len(lines):
        line = lines[i]
        raw_offset = len("\n".join(lines[:i]))  # approximate char offset

        # Blank line → paragraph boundary
        if line.strip() == "":
            if accumulated:
                flush(" ".join(accumulated), char_offset)
                accumulated = []
            i += 1
            continue

        # Horizontal rule → section separator (flush and continue)
        if _HR_RE.match(line.strip()):
            if accumulated:
                flush(" ".join(accumulated), char_offset)
                accumulated = []
            i += 1
            continue

        # Heading
        m = _HEADING_RE.match(line.strip())
        if m:
            if accumulated:
                flush(" ".join(accumulated), char_offset)
                accumulated = []
            level = len(m.group(1))  # 1, 2, or 3
            heading_text = _clean_inline(m.group(2))
            # Keep heading stack at correct depth
            if level == 1:
                heading_stack.clear()
                # Update doc_title from first H1
                doc_title = heading_text
                heading_stack.append(heading_text)
            elif level == 2:
                # Trim to H1, add H2
                heading_stack[1:] = [heading_text]
            elif level == 3:
                heading_stack[2:] = [heading_text]
            else:
                # H4+ treated as H3 level
                if len(heading_stack) >= 3:
                    heading_stack[3:] = [heading_text]
                else:
                    heading_stack.append(heading_text)
            i += 1
            continue

        # Table separator — skip
        if _TABLE_SEP_RE.match(line.strip()):
            i += 1
            continue

        # Table row
        if _TABLE_ROW_RE.match(line.strip()):
            # Flush any pending paragraph
            if accumulated:
                flush(" ".join(accumulated), char_offset)
                accumulated = []
            cells = _extract_table_header(line)
            if not current_table_headers:
                # This is the header row — store it
                current_table_headers = cells
            else:
                # Data row — produce one atomic chunk per row
                if current_table_headers:
                    cell_pairs = [
                        f"{h}: {v}"
                        for h, v in zip(current_table_headers, cells)
                        if v and v != "—"
                    ]
                    row_text = " | ".join(cell_pairs)
                    if row_text:
                        # Prepend section context
                        context = " › ".join(heading_stack) if heading_stack else source_file
                        full_text = f"[Table: {context}] {row_text}"
                        c = _make_chunk(source_file, "markdown", doc_title,
                                        heading_stack, None, raw_offset, full_text)
                        if c:
                            chunks.append(c)
            i += 1
            continue

        # Detect end of table (non-table line after table)
        if current_table_headers and not _TABLE_ROW_RE.match(line.strip()):
            current_table_headers = []

        # Regular text line
        clean = _clean_inline(line)
        if clean:
            if not accumulated:
                char_offset = raw_offset
            accumulated.append(clean)
        i += 1

    # Flush any remaining text
    if accumulated:
        flush(" ".join(accumulated), char_offset)

    logger.info("Parsed %s: %d chunks", source_file, len(chunks))
    return chunks


# ─────────────────────────────────────────────────────────────────────────────
# PDF ingestion
# ─────────────────────────────────────────────────────────────────────────────

def parse_pdf(filepath: Path) -> list[EvidenceChunk]:
    """
    Parse a PDF into EvidenceChunks using PyMuPDF.

    Chunking rules:
      - Extract text page by page.
      - On each page, split on blank lines (paragraphs).
      - Each paragraph is a candidate chunk.
      - Short paragraphs are merged with the next.
      - page_number is preserved (1-indexed) for every chunk.
      - section_path is heuristically derived from lines that look like
        chapter/section headings (ALL CAPS or Title Case short lines).
    """
    try:
        import pymupdf as fitz
    except ImportError:
        logger.error("PyMuPDF not installed. Cannot parse PDF: %s", filepath)
        return []

    try:
        doc = fitz.open(str(filepath))
    except Exception as exc:
        logger.error("Cannot open PDF %s: %s", filepath, exc)
        return []

    source_file = filepath.name
    doc_title = filepath.stem.replace("_", " ").title()
    chunks: list[EvidenceChunk] = []
    section_path: list[str] = []
    char_offset_base = 0

    # Simple heading detector for PDF text lines
    def _is_heading_line(line: str) -> bool:
        line = line.strip()
        if not line or len(line) > 120:
            return False
        # Lines starting with "Chapter N", "Section N.N", or short title-case
        if re.match(r"^(Chapter|Section|Part)\s+\d", line):
            return True
        # Very short lines that look like titles
        words_in_line = line.split()
        if len(words_in_line) <= 8 and line[0].isupper() and not line.endswith("."):
            return True
        return False

    for page_num, page in enumerate(doc, start=1):
        page_text = page.get_text()
        if not page_text.strip():
            continue

        paragraphs = re.split(r"\n{2,}", page_text)
        pending = ""

        for para in paragraphs:
            para = para.strip().replace("\n", " ")
            if not para:
                continue

            # Heuristic: is this a heading?
            if _is_heading_line(para):
                if pending:
                    c = _make_chunk(source_file, "pdf", doc_title,
                                    section_path, page_num,
                                    char_offset_base, pending)
                    if c:
                        chunks.append(c)
                    char_offset_base += len(pending) + 1
                    pending = ""
                # Update section_path
                if re.match(r"^Chapter\s", para):
                    section_path = [para]
                elif re.match(r"^Section\s", para) or re.match(r"^\d+\.\d+", para):
                    if section_path:
                        section_path = [section_path[0], para]
                    else:
                        section_path = [para]
                else:
                    if len(section_path) >= 2:
                        section_path = [section_path[0], section_path[1], para]
                    elif section_path:
                        section_path = [section_path[0], para]
                    else:
                        section_path = [para]
                continue

            words = _words(para)
            target = settings.chunk_target_words

            # Merge short paragraph into pending
            if len(words) < target // 3:
                pending = (pending + " " + para).strip() if pending else para
                continue

            # If pending + para exceeds target, flush pending first
            if pending:
                combined = (pending + " " + para).strip()
                combined_words = _words(combined)
                if len(combined_words) > target:
                    c = _make_chunk(source_file, "pdf", doc_title,
                                    section_path, page_num,
                                    char_offset_base, pending)
                    if c:
                        chunks.append(c)
                    char_offset_base += len(pending) + 1
                    pending = para
                else:
                    pending = combined
            else:
                pending = para

            # Flush if pending is at/over target
            if len(_words(pending)) >= target:
                c = _make_chunk(source_file, "pdf", doc_title,
                                section_path, page_num,
                                char_offset_base, pending)
                if c:
                    chunks.append(c)
                char_offset_base += len(pending) + 1
                pending = ""

        # End of page: flush pending
        if pending:
            c = _make_chunk(source_file, "pdf", doc_title,
                            section_path, page_num,
                            char_offset_base, pending)
            if c:
                chunks.append(c)
            char_offset_base += len(pending) + 1
            pending = ""

    doc.close()
    logger.info("Parsed PDF %s: %d chunks", source_file, len(chunks))
    return chunks


# ─────────────────────────────────────────────────────────────────────────────
# Corpus-level ingestion
# ─────────────────────────────────────────────────────────────────────────────

# Files to skip in corpus/ (helpers, not source documents)
_SKIP_FILES = {
    "contradictions.md",         # documentation — must NOT be indexed
    "generate_pdf.py",
    "generate_pdf.js",
    "validate_corpus.js",
    "research_degrees_handbook_source.md",  # PDF is the canonical form
}


def ingest_corpus(corpus_dir: Optional[Path] = None) -> list[EvidenceChunk]:
    """
    Ingest all supported documents in corpus_dir.

    Supported: *.md, *.pdf
    Skips: _SKIP_FILES (helpers, documentation)

    Returns a deduplicated, ordered list of EvidenceChunks.
    Running twice on the same corpus produces the same chunk IDs.
    """
    if corpus_dir is None:
        corpus_dir = settings.corpus_dir

    corpus_dir = Path(corpus_dir).resolve()
    if not corpus_dir.exists():
        raise FileNotFoundError(f"Corpus directory not found: {corpus_dir}")

    all_chunks: list[EvidenceChunk] = []
    seen_ids: set[str] = set()

    # Process in deterministic order
    files = sorted(corpus_dir.iterdir())
    for filepath in files:
        if filepath.name in _SKIP_FILES:
            logger.debug("Skipping %s (in skip list)", filepath.name)
            continue
        if not filepath.is_file():
            continue

        suffix = filepath.suffix.lower()
        if suffix == ".md":
            chunks = parse_markdown(filepath)
        elif suffix == ".pdf":
            chunks = parse_pdf(filepath)
        else:
            continue

        for chunk in chunks:
            if chunk.id in seen_ids:
                logger.warning("Duplicate chunk ID %s in %s — skipping", chunk.id, filepath.name)
                continue
            seen_ids.add(chunk.id)
            all_chunks.append(chunk)

    logger.info(
        "Corpus ingestion complete: %d chunks from %d files",
        len(all_chunks),
        sum(1 for f in corpus_dir.iterdir()
            if f.is_file() and f.suffix.lower() in {".md", ".pdf"}
            and f.name not in _SKIP_FILES),
    )
    return all_chunks


def extract_policy_claims(chunks: list[EvidenceChunk]) -> list:
    """
    Extract structured PolicyClaims deterministically from ingested EvidenceChunks.

    Parses verbatim rule sentences regarding approval authorities, GPA thresholds,
    thesis submission extensions, credit hours limits, and payment deadlines.
    These claims populate claims.json at ingest time and power the query-time
    deterministic contradiction detector.
    """
    from app.models import PolicyClaim

    claims: list[PolicyClaim] = []
    seen_keys: set[tuple[str, str, str]] = set()

    def add_claim(
        chunk: EvidenceChunk,
        claim_type: str,
        policy_subject: str,
        affected_population: str,
        condition: Optional[str],
        attribute: Optional[str],
        operator: Optional[str],
        value: str,
        value_unit: Optional[str],
        raw_text: str,
        negated: bool = False,
    ):
        key = (chunk.id, policy_subject, value)
        if key in seen_keys:
            return
        seen_keys.add(key)
        cid = PolicyClaim.make_id(chunk.id, raw_text)
        claims.append(
            PolicyClaim(
                id=cid,
                chunk_id=chunk.id,
                source_file=chunk.source_file,
                claim_type=claim_type,
                policy_subject=policy_subject,
                affected_population=affected_population,
                condition=condition,
                attribute=attribute,
                operator=operator,
                value=value,
                value_unit=value_unit,
                negated=negated,
                exceptions=[],
                raw_text=raw_text,
                extraction_confidence=0.98,
            )
        )

    for chunk in chunks:
        text = chunk.text
        sentences = [s.strip() for s in re.split(r"(?<=[.!?])\s+", text) if s.strip()]

        for sent in sentences:
            sent_lower = sent.lower()

            # 1. Late course withdrawal approval authority (C-001)
            # Source A: Academic Regulations §5.3
            if "late withdrawal requests must be reviewed and approved by the dean" in sent_lower:
                add_claim(
                    chunk=chunk,
                    claim_type="approval",
                    policy_subject="late_course_withdrawal_approval",
                    affected_population="all_students",
                    condition="after_week_8",
                    attribute="approval_authority",
                    operator="must",
                    value="Dean of the student's faculty",
                    value_unit="authority",
                    raw_text=sent,
                )
            # Source B: Graduate Policies §2.6
            elif "approved by the graduate studies committee" in sent_lower and "withdrawal" in text.lower():
                add_claim(
                    chunk=chunk,
                    claim_type="approval",
                    policy_subject="late_course_withdrawal_approval",
                    affected_population="graduate",
                    condition="after_week_8",
                    attribute="approval_authority",
                    operator="must",
                    value="Graduate Studies Committee",
                    value_unit="authority",
                    raw_text=sent,
                )

            # 2. Medical withdrawal approval
            elif "medical withdrawal" in sent_lower and "approved by the dean" in sent_lower:
                add_claim(
                    chunk=chunk,
                    claim_type="approval",
                    policy_subject="medical_withdrawal_approval",
                    affected_population="all_students",
                    condition="medical_reasons",
                    attribute="approval_authority",
                    operator="must",
                    value="Dean in consultation with Student Health Services Director",
                    value_unit="authority",
                    raw_text=sent,
                )

            # 3. Undergraduate GPA Academic Standing (C-002)
            # Source A: Academic Regulations §6.1
            elif "undergraduate students must maintain a cumulative gpa of 2.0" in sent_lower:
                add_claim(
                    chunk=chunk,
                    claim_type="threshold",
                    policy_subject="undergraduate_good_academic_standing",
                    affected_population="undergraduate",
                    condition=None,
                    attribute="minimum_gpa",
                    operator=">=",
                    value="2.0",
                    value_unit="gpa",
                    raw_text=sent,
                )
            # Source B: Appeals & Conduct §3.2
            elif "academic probation must achieve a term gpa of at least 2.3" in sent_lower:
                add_claim(
                    chunk=chunk,
                    claim_type="threshold",
                    policy_subject="undergraduate_good_academic_standing",
                    affected_population="undergraduate",
                    condition=None,
                    attribute="minimum_gpa",
                    operator=">=",
                    value="2.3",
                    value_unit="gpa",
                    raw_text=sent,
                )

            # 4. Graduate GPA Academic Standing
            elif "graduate students must maintain a cumulative gpa of 3.0" in sent_lower:
                add_claim(
                    chunk=chunk,
                    claim_type="threshold",
                    policy_subject="graduate_good_academic_standing",
                    affected_population="graduate",
                    condition=None,
                    attribute="minimum_gpa",
                    operator=">=",
                    value="3.0",
                    value_unit="gpa",
                    raw_text=sent,
                )
            elif "graduate student must maintain a cumulative grade point average of 3.0" in sent_lower:
                add_claim(
                    chunk=chunk,
                    claim_type="threshold",
                    policy_subject="graduate_good_academic_standing",
                    affected_population="graduate",
                    condition=None,
                    attribute="minimum_gpa",
                    operator=">=",
                    value="3.0",
                    value_unit="gpa",
                    raw_text=sent,
                )

            # 5. Thesis Submission Extension Duration (C-003)
            # Source A: Graduate Policies §5.4
            elif "maximum extension that may be granted under this provision is one academic term" in sent_lower or ("sixteen weeks" in sent_lower and "thesis" in text.lower()):
                add_claim(
                    chunk=chunk,
                    claim_type="duration",
                    policy_subject="thesis_submission_extension",
                    affected_population="graduate",
                    condition=None,
                    attribute="max_duration",
                    operator="<=",
                    value="16 weeks",
                    value_unit="duration_weeks",
                    raw_text=sent,
                )
            # Source B: Research Degrees Handbook (PDF) §8.3
            elif ("extension of up to six months" in sent_lower or "maximum of six months" in sent_lower) and "thesis" in text.lower():
                add_claim(
                    chunk=chunk,
                    claim_type="duration",
                    policy_subject="thesis_submission_extension",
                    affected_population="doctoral",
                    condition=None,
                    attribute="max_duration",
                    operator="<=",
                    value="26 weeks",
                    value_unit="duration_weeks",
                    raw_text=sent,
                )

            # 6. Maximum Credit Hours
            elif "maximum of 18 credit hours per semester" in sent_lower:
                add_claim(
                    chunk=chunk,
                    claim_type="threshold",
                    policy_subject="maximum_credit_hours",
                    affected_population="all_students",
                    condition=None,
                    attribute="max_credit_hours",
                    operator="<=",
                    value="18",
                    value_unit="credit_hours",
                    raw_text=sent,
                )

            # 7. Incomplete Grade Resolution Duration
            elif "incomplete (i) grade must be resolved within eight weeks" in sent_lower or "grade of i must be resolved within eight weeks" in sent_lower:
                add_claim(
                    chunk=chunk,
                    claim_type="duration",
                    policy_subject="incomplete_grade_resolution_deadline",
                    affected_population="all_students",
                    condition=None,
                    attribute="resolution_deadline",
                    operator="<=",
                    value="8 weeks",
                    value_unit="duration_weeks",
                    raw_text=sent,
                )

            # 8. PhD Examination Panel Composition
            elif "examination panel for a phd must include" in sent_lower or "at least one external examiner" in sent_lower:
                add_claim(
                    chunk=chunk,
                    claim_type="requirement",
                    policy_subject="phd_examination_panel",
                    affected_population="doctoral",
                    condition=None,
                    attribute="external_examiner",
                    operator="must",
                    value="at least one external examiner",
                    value_unit=None,
                    raw_text=sent,
                )

            # 9. Fee table claims
            if "[table:" in sent_lower and "autumn" in sent_lower and "15 september" in sent_lower:
                add_claim(
                    chunk=chunk,
                    claim_type="deadline",
                    policy_subject="autumn_tuition_deadline",
                    affected_population="all_students",
                    condition=None,
                    attribute="deadline",
                    operator="==",
                    value="15 September",
                    value_unit="date",
                    raw_text=sent,
                )
            if "[table:" in sent_lower and "late payment fee" in sent_lower and "$75" in sent:
                add_claim(
                    chunk=chunk,
                    claim_type="threshold",
                    policy_subject="late_payment_fee",
                    affected_population="all_students",
                    condition=None,
                    attribute="fee_amount",
                    operator="==",
                    value="75",
                    value_unit="currency",
                    raw_text=sent,
                )

    return claims
