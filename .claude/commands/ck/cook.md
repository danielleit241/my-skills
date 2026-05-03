---
description: Guided feature development with codebase understanding and architecture focus. Modes: --fast (skip test/review), --hard (mandatory reviewers, no auto-approve). Flags: --no-test (skip tester), --tdd (tests-first). Accepts an optional plan file path: /ck:cook plans/260418-auth/plan.md
---

# /ck:cook — Structured Implementation Pipeline

## Usage

```
/ck:cook [--fast | --hard] [--no-test | --tdd] [plan-file-path | feature-description]
```

No flag → **Standard** — test + review gate, auto-approve if score ≥ 9.5 with 0 CRITICAL.

- **`--fast`** — skip tester and code-reviewer; no inter-phase review pauses (Step 2 continues automatically); git-manager only in Step 5
- **`--hard`** — mandatory test + mandatory review, no auto-approve (human eyes required)
- **`--no-test`** — skip the tester sub-agent entirely; proceed directly to Step 3.S → Step 4
- **`--tdd`** — invert Step 3: write failing tests first, then implement until they pass

---

### Step 0 — Plan Check

When no plan file path is provided as an argument:

1. Search `plans/` for any `plan.md` files
2. If found → ask: "Found `{path}`. Use this plan? [Y/n]"
3. If not found → ask: "No plan found. Continue without a plan? [y/N]" — if No, suggest `/ck:plan`

When a plan file path is provided as an argument, skip this check.

---

### Step 1 — Load Plan / Detect Mode

When a plan file path is provided, report what will be cooked:

```
Plan: {Feature Name}
Status: {status from plan.md}
Mode: {Standard | Fast | Hard}
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
- **Standard / `--hard` mode**: pause and wait for user approval before continuing
- **`--fast` mode**: continue automatically

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

**`--fast`**: skip this step entirely — proceed directly to Step 3.S.

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

**`--fast`**: skip this step entirely — proceed directly to Step 5.

**[Test Gate]** — before code review, verify all tests pass.
- Gate FAILS if: tests failed, or tests were skipped without `--no-test`
- Gate PASSES if: all tests passed, or `--no-test` was explicitly set

Spawn the **`code-reviewer`** sub-agent after tests pass (or after Step 3.S if `--no-test`):

- Reviews correctness, security, regressions, code quality
- Produces a score and verdict: APPROVED / WARNING / BLOCK
- **Standard mode**: auto-approve if score ≥ 9.5 with 0 CRITICAL
- **`--hard` mode**: no auto-approve — human must explicitly approve before Step 5

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
If code-reviewer returned BLOCK or (`--hard` and no explicit user approval) → `[GATE FAIL] Approval gate: review not approved — resolve BLOCK findings or explicitly approve before finalizing.`
Bypass: `--fast` skips code-reviewer → gate is satisfied automatically.

Step 5 is **always required** — cook is incomplete without git-manager.
**`--fast`**: run git-manager only — skip project-manager and docs-manager.

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
// MANDATORY: all 3 sub-agents required (Standard / --hard)
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
| `tester` | 3 — write failing tests (--tdd) or verify after impl | Standard, `--hard` (skip for `--fast`, `--no-test`) |
| `debugger` | 3 — root cause analysis | When tests fail |
| `simplify` skill | 3.S — auto-simplify on threshold breach | All (hook-driven) |
| `code-reviewer` | 4 — review implementation | Standard, `--hard` (skip for `--fast`) |
| `project-manager` | 5 — sync plan + tasks | Standard, `--hard` (skip for `--fast`) |
| `docs-manager` | 5 — update docs | Standard, `--hard` (skip for `--fast`) |
| `git-manager` | 5 — commit + push | Always (mandatory, all modes) |

---

## Integration

- `/ck:plan --hard <description>` — create a plan file first, then pass it to `/ck:cook`
- `/ck:fix --quick` — fix build errors during implementation
- `/ck:code-review` — standalone review if you skipped --fast

---

## Quick Reference

| Flag | What it does |
|------|-------------|
| `--fast` | Skip tester and code-reviewer; git-manager only |
| `--hard` | Mandatory test + mandatory review, no auto-approve |
| `--no-test` | Skip tester sub-agent entirely |
| `--tdd` | Write failing tests first, then implement until they pass |
