---
description: Plan a feature or system with auto-detected complexity. Modes: --fast (quick plan → cook), --hard (research + red-team + validate), --parallel (hard + file ownership per phase), --two (hard + 2 approaches, user selects). Flags: --no-test (skip testing in cook), --tdd (tests-first per phase). Always starts with Scope Challenge.
---

# /ck:plan — Structured Planning Pipeline

## Usage

```
/ck:plan [--fast | --hard | --parallel | --two] [--no-test | --tdd] <description>
```

Auto-detect mode if no flag given:

- **Fast** — single-file change, familiar pattern, ≤ 2 components
- **Hard** — multi-file, unfamiliar domain, security-sensitive, or ≥ 3 phases
- **Parallel** — Hard + per-phase file ownership map
- **Two** — Hard + 2 approaches for user to select

Test flags (propagate to `/ck:cook`):

- **`--no-test`** — mark plan so cook skips the tester sub-agent entirely
- **`--tdd`** — instruct planner to add a "Tests to Write First" section to each phase; cook will write failing tests before implementing

---

### Step 0 — Scope Challenge

Before spawning any agents, challenge scope inline:

```
# Scope Challenge (Step 0):
#   Exists? → [does this feature already exist in the codebase?]
#   Minimum? → [smallest impl that satisfies requirements]
#   Complexity? → [Fast | Hard] — reasons: multi-file? unfamiliar? security?
#
# Mode: [Fast | Hard | Parallel | Two]
# Test:  [default | --no-test | --tdd]
```

If scope is too large: suggest splitting and **wait for user confirmation**.

---

### Step 1 — Research (Hard / Parallel / Two only)

Spawn **2 `researcher` agents in parallel**:

- **Instance A** — role: `Primary` — recommended approach and best practices
- **Instance B** — role: `Alternative` — alternative approach and tradeoffs

```
// spawning 2 researcher agents in parallel
//
// Researcher A (Primary): [approach] → [verdict]
// Researcher B (Alternative): [approach] → [verdict]
```

---

### Step 2 — Plan Creation

Spawn the **`planner` agent** with feature description + mode + research reports + active test flag (`--no-test` or `--tdd` if set).

- **`--tdd`**: planner adds a `### Tests to Write First` section to each phase file listing the key failing tests to write before implementation
- **`--no-test`**: planner notes `testing: skipped` in each phase header

Agent writes:

```
plans/YYMMDD-{slug}/
  plan.md
  phase-01-{name}.md
  phase-02-{name}.md
  ...
```

**Two mode**: `planner` produces `plan-a.md` and `plan-b.md` — show a summary of both, then **wait for user to choose** before continuing to Step 3.

```
// spawning planner agent
//
// Created:
//   plans/{date}-{slug}/plan.md
//   plans/{date}-{slug}/phase-01-{name}.md
//   plans/{date}-{slug}/phase-02-{name}.md

// [Two mode only] → show plan-a and plan-b summaries
// [Review Gate] → "Which approach do you prefer — A or B?" — waiting...
```

---

### Step 3 — Red-Team Review (Hard / Parallel / Two only)

Spawn the **`plan-reviewer` agent** with paths to all plan files.

Adjudicate each finding:

- `ACCEPTED` → edit the relevant plan file immediately
- `NOTED` → append to Risks section of `plan.md`
- `REJECTED` → document reason

```
// spawning plan-reviewer agent
//
// Security:    "{finding}" → ACCEPTED → phase-02 updated
// Assumption:  "{finding}" → NOTED    → added to risks
// Failure:     "{finding}" → ACCEPTED → plan.md updated
// Verdict: WARN — 0 CRITICAL, 1 HIGH resolved
```

If `plan-reviewer` returns `BLOCK`: revise the flagged phase and re-run before proceeding.

---

### Step 4 — Validation + Cook

Ask 3–5 targeted questions about the plan's riskiest points. **Wait for user answers.**

Then hydrate tasks via TodoWrite:

```
// T1: {Phase 1} (no blockers)
// T2: {Phase 2} (blocked by T1)
// T3: {Phase 3} (blocked by T2)
```

Output the exact cook command, including any test flag that was passed to `/ck:plan`:

```
Ready to cook:
/ck:cook [--no-test | --tdd] /abs/path/plans/{date}-{slug}/plan.md
```

---

## Agents

| Agent             | Step                       | Modes               |
| ----------------- | -------------------------- | ------------------- |
| `researcher`      | 1 — research (×2 parallel) | Hard, Parallel, Two |
| `planner`         | 2 — creates plan files     | All                 |
| `plan-reviewer`   | 3 — red-team review        | Hard, Parallel, Two |

---

## Active Signals

These hook signals may appear in context at any point during execution — respond immediately when seen:

- `CAVEMAN_TRIGGERED` → activate the `caveman` skill; apply terse-output rules for the remainder of the session
- `ARTIFACT_FOLD_TRIGGERED` → write the full tool output to the indicated `.claude/artifacts/` path and reference that path instead of the full content

---

## Integration

- `/ck:cook <plan-file>` — implement phase by phase
- `/ck:code-review` — review implementation after cooking
- `/ck:fix --quick` — fix build errors during cook
