---
description: Guided feature development with codebase understanding and architecture focus. Modes: --auto (auto-approve ≥9.5), --fast (skip test/review), --parallel (multi-agent). Flags: --no-test (skip tester), --tdd (tests-first). Accepts an optional plan file path: /ck:cook plans/260418-auth/plan.md
---

# /ck:cook — Structured Implementation Pipeline

## Usage

```
/ck:cook [--auto | --fast | --parallel] [--full | --nano] [--no-test | --tdd] [plan-file-path | feature-description]
```

Auto-detect mode if no flag given:
- **Interactive** (default) — stops at each Review Gate for approval
- **Auto** (`--auto`) — auto-approve if score ≥ 9.5 with 0 critical
- **Fast** (`--fast`) — skip tester/reviewer loop, single-pass implement
- **Parallel** (`--parallel`) — multi-agent execution for 3+ independent phases

Rigor override flags (bypass Step 0.5 scoring):
- **`--full`** — force Full tier regardless of rigor score
- **`--nano`** — force Nano tier regardless of rigor score

Test flags (orthogonal to execution mode):
- **`--no-test`** — skip the tester sub-agent entirely; proceed directly to Step 3.S → Step 4
- **`--tdd`** — invert Step 3: write failing tests first, then implement until they pass

---

### Step 0.5 — Rigor Scoring

Before loading the plan, score the change to select the right pipeline tier.
Skip this step if `--full` or `--nano` was passed — use that tier directly.

**Scoring signals:**

| Signal | Points |
|--------|--------|
| Files to touch: 1 = 0 pts, 2–3 = 1 pt, 4+ = 3 pts | 0–3 |
| Cross-module impact (touches 2+ distinct modules) | +2 |
| Security-sensitive code (auth, crypto, permissions, secrets) | +3 |
| Public API / interface change (exported types, CLI flags, HTTP contracts) | +2 |
| DB schema change (migration, model field add/remove) | +2 |
| New external dependency | +1 |

**Pipeline tier:**

| Score | Tier | Steps executed |
|-------|------|----------------|
| 0 | Nano | Step 1 → Step 2 → git-manager only (skip tester, reviewer, project-manager, docs-manager) |
| 1–2 | Fast | Steps 1 → 2 → 3.S → 5 (git-manager only) — skip tester and code-reviewer. Same as `--fast` flag. |
| 3–5 | Standard | Full current pipeline |
| 6+ | Full | Standard + plan-reviewer (if plan exists) + code-reviewer mandatory |

Infer score from the feature description + codebase context. If score is ambiguous between tiers, round up.

```
// [Step 0.5 — Rigor Scoring]
// Signals: files=2 (+1), cross-module (+2) → Score: 3 → Tier: Standard
// Pipeline: Steps 1 → 2 → 3 → 3.S → 4 → 5
```

---

### Step 1 — Load Plan / Detect Mode

When a plan file path is provided, report what will be cooked:

```
Plan: {Feature Name}
Status: {status from plan.md}
Mode: {Interactive | Auto | Fast | Parallel}
Test:  {default | --no-test | --tdd}
Phases remaining:
  [ ] Phase 1: Setup
  [ ] Phase 2: Backend
  [ ] Phase 3: Testing
```

If `## Session Notes` exists in plan.md, output:
```
Resuming session:
  Last active:  {timestamp}
  Last phase:   {phase name}
  Last status:  {status line}
```
Then continue from where it left off.

When no plan file is provided, run a quick discovery:
- Read the feature request
- Ask 2–3 clarifying questions if needed
- Proceed once requirements are clear

---

### Step 2 — Implement

The main agent reads each `phase-XX-*.md` file and implements the steps in order:

1. Read `phase-XX-*.md` — understand requirements, architecture, steps, success criteria
2. Implement following codebase conventions
3. Verify success criteria for the phase
4. Write (overwrite) `## Session Notes` in plan.md, then mark phase complete `- [x] Phase N: {name}` (atomic: write notes before marking complete so state is consistent on interruption)
5. Report what was done

**Session Notes template** (write to plan.md after each phase):

   ```markdown
   ## Session Notes
   <!-- Updated by cook automatically — do not edit manually -->

   **Last active:** {YYYY-MM-DD HH:MM}
   **Phase in progress:** {phase-XX-name}
   **Status:** {one-line status}

   ### Decisions made this session
   {bullet list of non-obvious decisions, or "(none)"}

   ### Next immediate action
   {what cook will do next}
   ```

   Overwrite rule: always replace the entire `## Session Notes` section. Never append.

**Review Gate** — after each phase (or group of phases):
- **Interactive mode**: pause and wait for user approval before continuing
- **Auto mode**: continue automatically if no CRITICAL issues

```
// Reading: phase-01-setup.md
// Implementing: database schema, config files

// Reading: phase-02-backend.md
// Implementing: API routes, middleware

// [Review Gate] → waiting for approval...
```

Stop between phases if:
- A success criterion cannot be verified
- An unexpected blocker is found
- The phase requires user decisions not covered by the plan

---

### Step 3 — Test (tester sub-agent)

**Nano/Fast tier**: skip this step entirely — proceed directly to Step 3.S.

**[Build Gate]** — before running tests, verify the implementation compiles / has no syntax errors.
If the build check hook reported errors → `[GATE FAIL] Build gate: compilation errors detected — fix before proceeding to test.`
Bypass: `--no-test` skips this gate (implies build verification is also skipped — use when compilation check is not applicable or desired).

**`--no-test`**: skip this step entirely — proceed directly to Step 3.S.

**Default / `--tdd`**:

Default flow — spawn **`tester`** sub-agent after implementation:
- Writes comprehensive tests for implemented code
- Runs the full test suite — **100% pass required**
- If tests fail → spawn **`debugger`** sub-agent → apply fix → re-test

**Remediation cycle protocol:**
- **Cycle 1**: Apply fix from debugger → re-run tests
- **Cycle 2**: MUST use a different approach than cycle 1 (if cycle 1 edited tests → cycle 2 must fix implementation; if cycle 1 patched implementation → cycle 2 must refactor the logic) → re-run tests
- **Cycle 3**: MUST use a third distinct approach → re-run tests
- **Cycle 4**: STOP — do not attempt another fix

**Same-approach rule**: if the proposed fix for cycle N is the same as cycle N-1 (same file, same change type), reject it and force a different strategy before proceeding.

**`--tdd` flow** — invert the order per phase:
1. Spawn **`tester`** to write failing tests — use the phase's `### Tests to Write First` section if present, otherwise derive test cases from the phase's success criteria
2. Confirm tests fail (red) before implementing
3. Implement until tests go green
4. Run full suite — 100% pass required

```
// Default:
// main agent → spawns tester sub-agent
// Test results: 18/18 passed ✓
//
// --tdd:
// tester → writes failing tests (red) ✓
// main agent → implements
// tester → re-runs → 18/18 passed ✓
//
// --no-test:
// [Step 3 skipped] → proceed to Step 3.S
```

**[ESCALATION]** report on cycle 4 failure:
```
[ESCALATION] Test remediation exhausted
File:      {path/to/failing_test}
Error:     {exact error message}
Cycle 1:   {approach tried}
Cycle 2:   {approach tried}
Cycle 3:   {approach tried}
Action:    Awaiting user guidance
```

---

### Step 3.S — Auto-Simplify (threshold gate)

Before spawning the code-reviewer, check if `SIMPLIFY_TRIGGERED` appears in context (emitted by the `code-simplifier` PostToolUse hook).

**If triggered:**
1. Invoke the `simplify` skill on the files edited in this phase
2. Delete `.claude/session-data/simplify-tracker-{session_id}.json` to reset for the next phase
3. Proceed to Step 4

**If not triggered:** skip silently.

```
// [Step 3.S — threshold check]
// SIMPLIFY_TRIGGERED: total LOC 423 ≥ 400 — invoking simplify skill
//   simplify → 3 files reviewed, 38 lines removed
//   tracker reset ✓

// OR

// [Step 3.S — threshold check] → not triggered → proceed to Step 4
```

Thresholds are configured in `.ck.json` under `simplify.threshold`:

| Key | Default | Meaning |
|-----|---------|---------|
| `totalLoc` | 400 | Cumulative lines written/edited this session |
| `fileCount` | 8 | Unique files touched |
| `singleFileLoc` | 200 | Lines in a single Write/Edit call |
| `enabled` | true | Set `false` to disable entirely |

---

### Step 4 — Code Review (code-reviewer sub-agent)

**Nano/Fast tier**: skip this step entirely — proceed directly to Step 5.

**[Test Gate]** — before code review, verify all tests pass.
If tests did not pass (or were skipped without `--no-test`) → `[GATE FAIL] Test gate: tests must pass before review — re-run Step 3 or pass --no-test to skip.`
Bypass: `--no-test` was passed → gate is satisfied automatically.

Spawn the **`code-reviewer`** sub-agent after tests pass (or after Step 3.S if `--no-test`):

- Reviews correctness, security, regressions, code quality
- Produces a score and verdict: APPROVED / WARNING / BLOCK
- **Auto mode**: auto-approve if score ≥ 9.5 with 0 critical

Fix/re-review cycle protocol:
- **Cycle 1**: Apply fix → re-run code-reviewer
- **Cycle 2**: MUST use different approach than cycle 1 → re-run code-reviewer
- **Cycle 3**: MUST use third distinct approach → re-run code-reviewer
- **Cycle 4**: STOP — escalate to user with [ESCALATION] report listing all 3 approaches tried

```
// main agent → spawns code-reviewer sub-agent
//
// Review: 9.6/10 — APPROVED
//   Correctness: ✓
//   Security:    ✓
//   Quality:     ✓ (1 minor suggestion)
```

---

### Step 5 — Finalize (MANDATORY)

**[Approval Gate]** — before finalizing, verify review is approved.
If code-reviewer returned BLOCK or score < 9.5 without explicit user approval → `[GATE FAIL] Approval gate: review not approved — resolve BLOCK findings or explicitly approve before finalizing.`
Bypass: `--fast` tier or Nano/Fast score-tier skips code-reviewer → gate is satisfied automatically.

Step 5 is **always required** — cook is incomplete without git-manager.
**Nano tier**: run git-manager only — skip project-manager and docs-manager.
**Fast tier**: run git-manager only — skip project-manager and docs-manager.

**`project-manager`** — syncs task status and plan progress:
- Marks completed phases `[x]` in `plan.md`
- Updates `Status: ✅ Complete` when all phases done

**`docs-manager`** — updates project documentation:
- Updates relevant docs, README sections, or API contracts changed by the implementation

**`git-manager`** — creates conventional commits and prepares for push:
- Stages changed files by feature area
- Creates conventional commit messages (`feat:`, `fix:`, `refactor:`)
- Asks user whether to push

```
// MANDATORY: all 3 sub-agents required
//
// project-manager → plan status: Phase 1-3 complete ✓
// docs-manager    → README updated ✓
// git-manager     → feat(auth): add user authentication
//                → Push to remote? [y/N]
```

---

## Agents

| Agent / Skill | Step | Modes |
|---------------|------|-------|
| `tester` | 3 — write failing tests (--tdd) or verify after impl | All except --fast, --no-test, Nano tier, Fast tier |
| `debugger` | 3 — root cause analysis | When tests fail |
| `simplify` skill | 3.S — auto-simplify on threshold breach | All (hook-driven) |
| `code-reviewer` | 4 — review implementation | All except --fast, Nano tier, Fast tier |
| `project-manager` | 5 — sync plan + tasks | All except Nano tier, Fast tier |
| `docs-manager` | 5 — update docs | All except Nano tier, Fast tier |
| `git-manager` | 5 — commit + push | Always (mandatory, all tiers) |

---

## Integration

- `/ck:plan --hard <description>` — create a plan file first, then pass it to `/ck:cook`
- `/ck:fix --quick` — fix build errors during implementation
- `/ck:code-review` — standalone review if you skipped --fast

---

## Quick Reference

| Flag | What it does |
|------|-------------|
| `--auto` | Auto-approve phases when score ≥ 9.5 with 0 critical issues |
| `--fast` | Single-pass implement — skip tester and code-reviewer |
| `--parallel` | Multi-agent execution for 3+ independent phases |
| `--full` | Force Full tier — plan-reviewer + mandatory code-reviewer |
| `--nano` | Force Nano tier — git-manager only, skip all other sub-agents |
| `--no-test` | Skip tester sub-agent entirely |
| `--tdd` | Write failing tests first, then implement until they pass |
