---
description: Structured bug-fix pipeline. Scout → Diagnose+Fix → Review → Finalize. Modes: --quick (skip review + docs), --hard (mandatory review, no auto-approve).
---

# /ck:fix — Structured Bug-Fix Pipeline

## Usage

```
/ck:fix [--quick | --hard] <bug description or error message>
```

No flag → **Standard** — auto-approve if score ≥ 9.5 with 0 CRITICAL.

- **`--quick`** — fast cycle for trivial issues (lint, type errors, build errors); skip scout, review, docs
- **`--hard`** — mandatory review, no auto-approve (human must explicitly approve before Step 4)

---

### Step 0 — Prerequisites + Scope

If no error message, stack trace, or concrete bug description is present in `$ARGUMENTS`:
- Output: "Paste the error message or stack trace." — wait for input before continuing.

Then detect scope:

```
# Scope (Step 0):
#   Description: {what the user said}
#   Quick? → {yes/no — reason}
#   Mode: {Standard | Quick | Hard}
```

If `--quick` or the description is clearly a build/compiler/lint error: skip Step 1, go to Step 2 with the error as input.

---

### Step 1 — Scout

Spawn the **`scout`** agent with the bug description:

- Greps for error patterns in logs and stack traces
- Reads affected source files and maps dependencies
- Checks recent git changes for related commits

```
// spawning scout agent
//
// Evidence:
//   Error pattern: NullReferenceException at auth.ts:45
//   Affected files: auth.ts, session.ts
//   Recent change: commit a3f2b1 modified auth.ts (2h ago)
```

---

### Step 2 — Diagnose

Spawn the **`debugger`** agent with the scout evidence report:

- Forms 2–3 hypotheses from the evidence
- Confirms or rejects each against the codebase
- Applies the minimal fix at the confirmed root cause location
- Returns debug report with root cause + fix applied

```
// spawning debugger agent
//
// Hypothesis A: null check missing in auth.ts:45 → CONFIRMED ✓
// Hypothesis B: race condition in session init   → REJECTED ✗
//
// Root cause: missing null guard on req.user before .validate()
// Fix applied: auth.ts:45 — added null guard before validate()
// Severity: HIGH | Scope: 1 file
```

---

### Step 3 — Review (code-reviewer)

**`--quick`**: skip this step entirely — proceed to Step 4.

Spawn **`code-reviewer`**:

- Correctness — does the fix address the root cause?
- Security — no new vulnerabilities introduced?
- Regressions — does anything else break?
- Code quality — follows project standards?

```
// spawning code-reviewer agent
//
// Correctness: ✓ Root cause addressed
// Security:    ✓ No new vulnerabilities
// Regressions: ✓ No side effects
// Score: 9.8/10 — APPROVED
```

**Standard mode**: auto-approve if score ≥ 9.5 with 0 CRITICAL. Up to 3 fix/re-review cycles, then escalate.  
**`--hard` mode**: no auto-approve — human must explicitly approve before Step 4.

---

### Step 4 — Finalize (MANDATORY)

Always required — fix is incomplete without git-manager:

**`project-manager`** (skip in `--quick`) — syncs plan progress if bug was tracked  
**`docs-manager`** (skip in `--quick`) — updates docs if the fix changes a public contract  
**`git-manager`** (always) — conventional commit + asks to push

```
// MANDATORY finalize:
// project-manager → task marked resolved (if tracked)
// docs-manager    → no doc changes needed
// git-manager     → fix(auth): add null guard on req.user before validate
//                → Push to remote? [y/N]
```

---

## Agents

| Agent             | Step                          | Modes                          |
| ----------------- | ----------------------------- | ------------------------------ |
| `scout`           | 1 — evidence gathering        | Standard, `--hard` (skip if `--quick` + obvious error) |
| `debugger`        | 2 — root cause + apply fix    | All                            |
| `code-reviewer`   | 3 — quality check             | Standard, `--hard` (skip for `--quick`) |
| `project-manager` | 4 — sync plan/tasks           | Standard, `--hard` (skip for `--quick`) |
| `docs-manager`    | 4 — update docs               | Standard, `--hard` (skip for `--quick`) |
| `git-manager`     | 4 — commit + push             | Always (mandatory)             |

---

## Integration

- `/ck:plan` → `/ck:cook` → `/ck:fix` — fix regressions found after cooking
- `/ck:code-review` — standalone review without the full fix pipeline
