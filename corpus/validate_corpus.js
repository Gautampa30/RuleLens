/**
 * validate_corpus.js — Phase 1 validation
 *
 * Checks:
 *   1. All required files exist
 *   2. Total word count >= 8,000
 *   3. All three contradictions are documented in contradictions.md
 *   4. Evaluation dataset structure (question counts per category)
 *   5. Fee table present in fee_schedule.md
 *   6. PDF exists and is non-empty
 *
 * Run from: repo root
 *   node corpus/validate_corpus.js
 */

const fs   = require('fs');
const path = require('path');

const ROOT   = path.resolve(__dirname, '..');
const CORPUS = path.join(ROOT, 'corpus');
const EVAL   = path.join(ROOT, 'evaluation');

let passed = 0;
let failed = 0;

function ok(label, value) {
  console.log(`  ✅  ${label}${value !== undefined ? ': ' + value : ''}`);
  passed++;
}

function fail(label, detail) {
  console.log(`  ❌  ${label}${detail ? ': ' + detail : ''}`);
  failed++;
}

function section(title) {
  console.log(`\n━━━ ${title} ${'━'.repeat(Math.max(0, 55 - title.length))}`);
}

// ── Helpers ──────────────────────────────────────────────────────────────────

function countWords(text) {
  return text.split(/\s+/).filter(t => t.length > 0).length;
}

function readFile(relPath) {
  const full = path.join(CORPUS, relPath);
  if (!fs.existsSync(full)) return null;
  return fs.readFileSync(full, 'utf-8');
}

// ── 1. Required file existence ────────────────────────────────────────────────

section('1. Required Files');

const MD_FILES = [
  'academic_regulations.md',
  'graduate_policies.md',
  'fee_schedule.md',
  'appeals_and_conduct.md',
  'contradictions.md',
];

const PDF_FILES = ['research_degrees_handbook.pdf'];

const EVAL_FILES = [path.join(EVAL, 'dataset.json')];

for (const f of MD_FILES) {
  const full = path.join(CORPUS, f);
  fs.existsSync(full) ? ok(`${f} exists`) : fail(`${f} MISSING`);
}

for (const f of PDF_FILES) {
  const full = path.join(CORPUS, f);
  fs.existsSync(full) ? ok(`${f} exists (PDF)`) : fail(`${f} MISSING (PDF)`);
}

for (const f of EVAL_FILES) {
  fs.existsSync(f) ? ok(`${path.basename(f)} exists`) : fail(`${path.basename(f)} MISSING`);
}

// ── 2. Word count ─────────────────────────────────────────────────────────────

section('2. Word Count (Markdown files only)');

let totalWords = 0;
const wordsByFile = {};
const countableFiles = [
  'academic_regulations.md',
  'graduate_policies.md',
  'fee_schedule.md',
  'appeals_and_conduct.md',
  'research_degrees_handbook_source.md',  // the source for the PDF
];

for (const f of countableFiles) {
  const text = readFile(f);
  if (text) {
    const w = countWords(text);
    wordsByFile[f] = w;
    totalWords += w;
    console.log(`       ${f}: ${w.toLocaleString()} words`);
  } else {
    console.log(`       ${f}: NOT FOUND`);
  }
}

console.log(`\n       Total: ${totalWords.toLocaleString()} words`);

if (totalWords >= 8000) {
  ok(`Total word count >= 8,000`, `${totalWords.toLocaleString()} words`);
} else {
  fail(`Total word count below 8,000`, `only ${totalWords.toLocaleString()} words`);
}

// ── 3. Contradictions documentation ──────────────────────────────────────────

section('3. Contradiction Documentation');

const contradictionText = readFile('contradictions.md');
if (contradictionText) {
  const hasC001 = contradictionText.includes('C-001');
  const hasC002 = contradictionText.includes('C-002');
  const hasC003 = contradictionText.includes('C-003');

  hasC001 ? ok('C-001 documented') : fail('C-001 NOT found in contradictions.md');
  hasC002 ? ok('C-002 documented') : fail('C-002 NOT found in contradictions.md');
  hasC003 ? ok('C-003 documented') : fail('C-003 NOT found in contradictions.md');

  // Check source passages are present in the corpus
  const ar = readFile('academic_regulations.md') || '';
  const gp = readFile('graduate_policies.md') || '';
  const ac = readFile('appeals_and_conduct.md') || '';
  const rdh = readFile('research_degrees_handbook_source.md') || '';

  ar.includes('Dean of the student') ? ok('C-001 Source A passage found in academic_regulations.md') : fail('C-001 Source A passage missing from academic_regulations.md');
  gp.includes('Graduate Studies Committee is the sole approving authority') ? ok('C-001 Source B passage found in graduate_policies.md') : fail('C-001 Source B passage missing from graduate_policies.md');
  ar.includes('cumulative GPA of 2.0 or above') ? ok('C-002 Source A passage found in academic_regulations.md') : fail('C-002 Source A passage missing');
  ac.includes('term GPA of at least 2.3') ? ok('C-002 Source B passage found in appeals_and_conduct.md') : fail('C-002 Source B passage missing');
  gp.includes('one academic term (sixteen weeks)') ? ok('C-003 Source A passage found in graduate_policies.md') : fail('C-003 Source A passage missing from graduate_policies.md');
  rdh.includes('extension of up to six months') ? ok('C-003 Source B passage found in research_degrees_handbook_source.md') : fail('C-003 Source B passage missing from research_degrees_handbook_source.md');
} else {
  fail('contradictions.md not readable');
}

// ── 4. Fee table ──────────────────────────────────────────────────────────────

section('4. Fee Deadline Table');

const feeText = readFile('fee_schedule.md');
if (feeText) {
  const hasTable = feeText.includes('|');
  const hasDeadline = feeText.toLowerCase().includes('deadline') || feeText.toLowerCase().includes('due');
  const hasAmount = /\$\d+/.test(feeText);
  hasTable   ? ok('Markdown table present in fee_schedule.md') : fail('No table found in fee_schedule.md');
  hasDeadline? ok('Deadline information present') : fail('No deadline information found');
  hasAmount  ? ok('Dollar amounts present') : fail('No dollar amounts found');
} else {
  fail('fee_schedule.md not readable');
}

// ── 5. Evaluation dataset structure ──────────────────────────────────────────

section('5. Evaluation Dataset');

const evalPath = path.join(EVAL, 'dataset.json');
if (fs.existsSync(evalPath)) {
  const dataset = JSON.parse(fs.readFileSync(evalPath, 'utf-8'));
  const qs = dataset.questions || [];

  const answerable  = qs.filter(q => q.category === 'answerable');
  const unanswerable = qs.filter(q => q.category === 'unanswerable-25');
  const contradictory = qs.filter(q => q.category === 'contradictory');
  const total = qs.length;

  console.log(`       Total questions: ${total}`);
  console.log(`       Answerable:      ${answerable.length}`);
  console.log(`       Unanswerable-25: ${unanswerable.length}`);
  console.log(`       Contradictory:   ${contradictory.length}`);

  answerable.length > 0   ? ok(`Answerable questions present`, answerable.length) : fail('No answerable questions');
  unanswerable.length === 25 ? ok('Exactly 25 unanswerable questions') : fail(`Expected 25 unanswerable, got ${unanswerable.length}`);
  contradictory.length === 3 ? ok('Exactly 3 contradictory questions') : fail(`Expected 3 contradictory, got ${contradictory.length}`);

  const allIds = qs.map(q => q.id);
  const uniqueIds = new Set(allIds);
  uniqueIds.size === allIds.length ? ok('All question IDs are unique') : fail('Duplicate question IDs detected');

  const allHaveState = qs.every(q => ['ANSWERABLE', 'UNKNOWN', 'CONTRADICTORY'].includes(q.expected_state));
  allHaveState ? ok('All questions have valid expected_state') : fail('Some questions have invalid expected_state');

  // Verify C-001, C-002, C-003 are covered
  const cIds = contradictory.map(q => q.id);
  ['C001', 'C002', 'C003'].forEach(id => {
    cIds.includes(id) ? ok(`Contradictory question ${id} present`) : fail(`Contradictory question ${id} MISSING`);
  });

} else {
  fail('evaluation/dataset.json not found');
}

// ── 6. PDF binary check ───────────────────────────────────────────────────────

section('6. PDF Validity');

const pdfPath = path.join(CORPUS, 'research_degrees_handbook.pdf');
if (fs.existsSync(pdfPath)) {
  const pdfBuf = fs.readFileSync(pdfPath);
  const header = pdfBuf.slice(0, 5).toString('ascii');
  header === '%PDF-' ? ok('PDF has valid header (%PDF-)') : fail(`PDF header invalid: ${header}`);
  pdfBuf.length > 5000 ? ok(`PDF size is reasonable`, `${(pdfBuf.length / 1024).toFixed(1)} KB`) : fail(`PDF too small: ${pdfBuf.length} bytes`);
} else {
  fail('research_degrees_handbook.pdf not found');
}

// ── Summary ───────────────────────────────────────────────────────────────────

section('Summary');
console.log(`\n  Passed: ${passed}   Failed: ${failed}`);
if (failed === 0) {
  console.log('\n  ✅  Phase 1 corpus validation PASSED — all checks pass.\n');
  process.exit(0);
} else {
  console.log('\n  ❌  Phase 1 corpus validation FAILED — see above for details.\n');
  process.exit(1);
}
