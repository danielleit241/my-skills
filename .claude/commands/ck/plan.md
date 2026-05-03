---
description: Plan a feature or system with auto-detected complexity. Modes: --fast (quick plan → cook), --hard (research + red-team + validate). Flags: --no-test (skip testing in cook), --tdd (tests-first per phase). Always starts with Scope Challenge.
---

# /ck:plan — Structured Planning Pipeline

## Usage

```
/ck:plan [--fast | --hard] [--no-test | --tdd] <description>
```

Auto-detect mode if no flag given:

- **Fast** — single-file change, familiar pattern, ≤ 2 components
- **Hard** — multi-file, unfamiliar domain, security-sensitive, or ≥ 3 phases

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
# Mode: [Fast | Hard]
# Test:  [default | --no-test | --tdd]
```

If scope is too large: suggest splitting and **wait for user confirmation**.

If complexity is **Hard** and the feature is novel/ambiguous: output "No brainstorm found for this feature. Run `/ck:brainstorm` first? [Y/n]" — if Yes, stop; if No, proceed.

---

### Step 1 — Research (Hard only)

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

```
// spawning planner agent
//
// Created:
//   plans/{date}-{slug}/plan.md
//   plans/{date}-{slug}/phase-01-{name}.md
//   plans/{date}-{slug}/phase-02-{name}.md
```

---

### Step 3 — Red-Team Review (Hard only)

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

Output the exact cook command, carrying through any mode and test flags passed to `/ck:plan`:

```
Ready to cook:
/ck:cook [--fast | --hard] [--no-test | --tdd] /abs/path/plans/{date}-{slug}/plan.md
```

---

## Agents

| Agent             | Step                       | Modes               |
| ----------------- | -------------------------- | ------------------- |
| `researcher`      | 1 — research (×2 parallel) | Hard |
| `planner`         | 2 — creates plan files     | All  |
| `plan-reviewer`   | 3 — red-team review        | Hard |

---

## Integration

- `/ck:cook <plan-file>` — implement phase by phase
- `/ck:code-review` — review implementation after cooking
- `/ck:fix --quick` — fix build errors during cook
