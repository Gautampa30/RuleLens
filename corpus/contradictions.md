# RuleLens — Documented Corpus Contradictions

This file documents the three deliberately planted contradictions in the
Ashford University corpus. It is maintained for development and evaluation
purposes only. It must NOT be used by application logic to hard-code expected
answers or to pre-determine which questions produce a CONTRADICTORY result.

---

## Contradiction C-001: Late Course Withdrawal — Approval Authority

### Overview
Two provisions govern who must approve a late course withdrawal request
(i.e., a withdrawal submitted after the end of Week 8). Both provisions apply
to the same trigger event and the same student population, but they name
different approval authorities. Neither provision conditionally defers to the
other.

### Source A

- **File:** `academic_regulations.md`
- **Section:** Chapter 5 — Withdrawal and Leave of Absence, Section 5.3 — Late Course Withdrawal
- **Passage:**
  > "Late withdrawal requests must be reviewed and approved by the Dean of the
  > student's faculty. The Dean may consult with the Programme Director but holds
  > sole authority to approve or deny the request."
- **Claim type:** approval authority
- **Policy subject:** late_course_withdrawal_approval
- **Affected population:** all students (no exclusion of graduate students stated)
- **Condition:** withdrawal requested after end of Week 8

### Source B

- **File:** `graduate_policies.md`
- **Section:** Section 2 — Academic Progress for Graduate Students, Section 2.6 — Late Course Withdrawal for Graduate Students
- **Passage:**
  > "Graduate students seeking to withdraw from a course after the end of Week 8
  > must submit their Late Course Withdrawal request to the Office of Graduate
  > Studies. Such requests must be reviewed and approved by the Graduate Studies
  > Committee, which meets bi-weekly. The Graduate Studies Committee is the sole
  > approving authority for graduate late withdrawals; requests may not be
  > approved by a faculty Dean acting alone."
- **Claim type:** approval authority
- **Policy subject:** late_course_withdrawal_approval
- **Affected population:** graduate students
- **Condition:** withdrawal requested after end of Week 8

### Why It Is a Genuine Contradiction

The Academic Regulations assign sole approval authority to the faculty Dean for
all late withdrawal requests. The Graduate Studies Policy assigns sole approval
authority to the Graduate Studies Committee for graduate student late withdrawals
and explicitly prohibits Dean-only approval. Both provisions claim exclusive
authority; neither conditionally defers to the other. A graduate student seeking
a late withdrawal cannot comply with both provisions simultaneously.

The Graduate Studies Policy does not state that it supersedes the Academic
Regulations on this point, and the Academic Regulations do not contain a
graduate-student carve-out for late withdrawal approval.

### Test Questions

- "Who must approve a graduate student's late course withdrawal request after Week 8?"
- "Can the faculty Dean alone approve a late withdrawal for a graduate student after the withdrawal deadline?"
- "What is the approval process for a late course withdrawal submitted by a graduate student in Week 10?"

---

## Contradiction C-002: Minimum GPA Threshold for Good Academic Standing — Undergraduates

### Overview
Two provisions state the minimum GPA relevant to undergraduate academic
standing, but they specify different numeric thresholds. The inconsistency
arises because one provision defines the entry criterion for Good Academic
Standing (2.0) while the other implicitly redefines the exit criterion from
probation as a higher value (2.3 term GPA). A student who achieves a term GPA
of 2.1 cannot simultaneously be in Good Academic Standing (per the main
regulations) and still on probationary status (per the appeals policy).

### Source A

- **File:** `academic_regulations.md`
- **Section:** Chapter 6 — Academic Standing and Progression, Section 6.1 — Minimum GPA Requirement for Good Academic Standing
- **Passage:**
  > "Undergraduate students must maintain a cumulative GPA of 2.0 or above to
  > remain in Good Academic Standing."
- **Claim type:** minimum GPA threshold
- **Policy subject:** undergraduate_good_academic_standing
- **Affected population:** undergraduate students
- **Value:** 2.0 (cumulative GPA)

### Source B

- **File:** `appeals_and_conduct.md`
- **Section:** Part 3 — Academic Probation, Dismissal, and Reinstatement, Section 3.2 — Minimum GPA to Exit Probation — Undergraduate Students
- **Passage:**
  > "An undergraduate student on Academic Probation must achieve a term GPA of
  > at least 2.3 in the probationary semester to be removed from probationary
  > status. A term GPA of 2.3 or higher in the probationary semester will result
  > in the student being returned to Good Academic Standing, provided their
  > cumulative GPA has also risen to 2.0 or above."
- **Claim type:** minimum GPA threshold
- **Policy subject:** undergraduate_good_academic_standing (exit from probation)
- **Affected population:** undergraduate students on academic probation
- **Value:** 2.3 (term GPA required to exit probation)

### Why It Is a Genuine Contradiction

Section 6.1 of the Academic Regulations states that a cumulative GPA of 2.0 is
the threshold for Good Academic Standing. Section 3.2 of the Appeals and Conduct
Policy states that achieving a term GPA of 2.3 is required to be removed from
probationary status (i.e., to return to Good Academic Standing). These provisions
are inconsistent: a student who achieves a 2.1 term GPA while on probation would
satisfy the 2.0 standing threshold in §6.1 but would not satisfy the 2.3 exit
criterion in §3.2, meaning they remain on probation despite technically being in
"Good Academic Standing." The two provisions cover the same population
(undergraduate students) and the same ultimate outcome (Good Academic Standing)
with incompatible numeric requirements.

This is not simply a case where one rule is conditional on the other; both
provisions purport to define what it means for an undergraduate student to be in
Good Academic Standing.

### Test Questions

- "What GPA does an undergraduate student need to return to Good Academic Standing after probation?"
- "If an undergraduate student on probation achieves a 2.1 GPA this semester, are they in Good Academic Standing?"
- "What is the minimum GPA threshold for undergraduate Good Academic Standing?"

---

## Contradiction C-003: Maximum Thesis Submission Extension Duration

### Overview
Two independently authored documents — the Graduate Studies Policy (produced by
the Office of Graduate Studies) and the Research Degrees Handbook (produced by
the Research Office) — both govern thesis submission extensions for research
degree students. They specify different maximum extension durations: one academic
term (approximately sixteen weeks) versus six months (approximately twenty-six
weeks). These two values are mutually inconsistent. A student who has been
granted a six-month extension under the Research Degrees Handbook may be told by
the Graduate Studies Committee that the maximum permissible extension under the
Graduate Studies Policy is one term, and vice versa.

### Source A

- **File:** `graduate_policies.md`
- **Section:** Section 5 — Thesis and Dissertation Requirements, Section 5.4 — Thesis Submission Extension
- **Passage:**
  > "A registered thesis student may apply to the Graduate Studies Committee for
  > an extension to the approved thesis submission deadline. Extensions are granted
  > only in circumstances of documented, exceptional difficulty that could not
  > reasonably have been anticipated or avoided. The maximum extension that may be
  > granted under this provision is one academic term (sixteen weeks)."
- **Claim type:** maximum duration
- **Policy subject:** thesis_submission_extension
- **Affected population:** graduate students (thesis/research degree)
- **Value:** one academic term (sixteen weeks)
- **Value unit:** duration

### Source B

- **File:** `research_degrees_handbook.pdf`
- **Section:** Chapter 8 — Extensions to Thesis Submission Deadlines, Section 8.3 — Formal Extensions
- **Passage:**
  > "Where a research degree student requires a more substantial extension due to
  > circumstances beyond their control — such as prolonged illness, equipment
  > failure affecting experimental work, or significant unexpected obstacles to
  > fieldwork — the Dean of Graduate Studies may grant an extension of up to six
  > months upon recommendation of the Graduate Studies Committee."
- **Claim type:** maximum duration
- **Policy subject:** thesis_submission_extension
- **Affected population:** research degree students (PhD, MPhil, MRes)
- **Value:** six months (approximately twenty-six weeks)
- **Value unit:** duration

### Why It Is a Genuine Contradiction

Both provisions govern the maximum length of a formal thesis extension. The
Graduate Studies Policy fixes the maximum at one academic term (sixteen weeks).
The Research Degrees Handbook — an independently authored document from the
Research Office — sets the maximum at six months (approximately twenty-six
weeks). These are materially different durations. A student in a doctoral
programme could reasonably be told different maximum extension periods depending
on which document they consult, and the two approval frameworks differ as well
(Graduate Studies Committee in Source A, Dean of Graduate Studies in Source B).

The Research Degrees Handbook is not a trivial reformatting of the Graduate
Studies Policy; it is produced by the Research Office and contains additional
procedural detail, different approving authority assignments, and a different
policy stance on maximum extension duration.

### Test Questions

- "What is the maximum extension period for thesis submission?"
- "How long can a PhD student extend their thesis deadline for medical reasons?"
- "Can a thesis submission extension exceed one semester?"

---

*This document is for development and evaluation purposes only.*
*It must not be read by any application logic at query time.*
