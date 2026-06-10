---
name: ck-cook
description: Turn a reviewed plan or feature brief into working code through scout, exact requirements, planning, implementation, tests, review, and final sync. Modes: --fast, --auto, --parallel. Flags: --tdd, --no-test.
user-invocable: true
---

# ck:cook — Structured Implementation Pipeline

Modes — mutually exclusive, pick one (default = Standard):
- **Standard** — test + review; verdict derived from evidence checks, auto-advance on APPROVED
- **`--fast`** — skip heavy research, but still scout, create/review a short plan, implement, test, and review
- **`--auto`** — auto-approve only low-risk phases whose validation and review
  evidence pass. High-risk changes still stop before finalize, commit, or ship.
- **`--parallel`** — phases have exclusive File Ownership (from `ck:plan --parallel`); auto-continue between phases (no per-phase review gate), full test + review at end

Composable flag — combine with any mode:
- **`--tdd`** — write failing tests first, then implement until they pass

**Flag default** (no flag given): `--tdd` is off — standard test behavior applied.

---

### Step 0 — Plan Check

When no plan path provided:
1. Search `plans/` for any `plan.md` → ask: "Found `{path}`. Use this? [Y/n]"
2. If none found → ask: "No plan found. Continue anyway? [y/N]" — if No, suggest `/ck:plan`

---

### Step 0.5 — Scout and Exact Requirements

Unless a reviewed plan already supplies current repository context, scout project
type, relevant modules, patterns, docs, plans, and public contracts. Summarize
3-6 findings before asking questions.

Use AskUserQuestion until five fields are concrete: expected output, acceptance
criteria, scope boundary, non-negotiable constraints, and existing touchpoints.
No implementation before these requirements and the plan are approved.

---

### Step 1 — Load Plan / Detect Mode

Report what will be cooked:

```
Plan: {Feature Name}
Status: {status from plan.md}
Mode: {Standard | Fast | Auto | Parallel}
Test:  {default | --no-test | --tdd}
Phases remaining:
  [ ] Phase 1: ...
  [ ] Phase 2: ...
```

If `## Session Notes` exists in plan.md: output resume state and continue from where it left off.

When no plan file provided: read the feature request, ask 2–3 clarifying questions, proceed once clear.

---

### Step 2 — Implement

For each `phase-XX-*.md` in order:

1. Read phase file — understand requirements, architecture, steps, success criteria
2. Implement following codebase conventions
3. Verify success criteria for the phase
4. Write (overwrite) `## Session Notes` in plan.md, then mark phase complete `- [x] Phase N: {name}`
5. Report what was done

**Session Notes template** (overwrite, never append):

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

**Review Gate** — after each phase:
- **Standard**: pause and wait for user approval
- **`--auto`**: auto-continue only when current evidence passes and the phase is
  low risk; otherwise pause
- **`--fast`** / **`--parallel`**: continue automatically

Stop if: success criterion unverifiable, unexpected blocker, or phase needs user decisions not in the plan.

---

### Step 3 — Test (tester sub-agent)

**[Build Gate]**: verify compilation before tests. On failure: `[GATE FAIL] Build gate: compilation errors — fix before testing.`

**Default**: spawn **`tester`** → writes tests, runs full suite (100% pass required) → on failure: spawn **`debugger`** → fix → re-test.

**Remediation cycles**: each of cycles 1–3 must use a different approach than previous. Cycle 4: STOP.

```
[ESCALATION] Test remediation exhausted
File:    {path/to/failing_test}
Error:   {exact error message}
Cycles:  {approach 1} | {approach 2} | {approach 3}
Action:  Awaiting user guidance
```

**`--tdd`**: invert per phase:
1. `tester` writes failing tests (red) from `### Tests to Write First` or the
   approved acceptance criteria
2. Confirm red before implementing
3. Implement until green, full suite passes

Run simplification when edited code has accumulated avoidable complexity.

---

### Step 4 — Code Review

**`--parallel`**: run code review across all phases at once (not per-phase).

**[Test Gate]**: all tests must pass (or `--fast` set).

Spawn **`code-reviewer`** with minimal context: the code diff and the five exact
requirements from Step 0.5 or the governing plan. Not the full session.

The verdict is not stated by the reviewer — it is **derived from evidence**. The reviewer runs four evidence-producing checks; the verdict follows mechanically from the results:

**Check 1 — Acceptance criteria**: for each criterion, run or trace the exact
input and confirm the expected output.

**Check 2 — Blast radius** (from Step 0.5 Touchpoints): for each caller or downstream dependent listed, confirm it still behaves correctly. Each is `CLEAN` or `BROKEN` with evidence.

**Check 3 — Regression surface**: run tests covering paths adjacent to the change. Report pass/fail counts and any new failures introduced — not "looks fine".

**Check 4 — Adversarial**: attempt to break the implementation — invalid inputs, boundary conditions, concurrent access, missing auth. Each attempt is `HELD` or `BROKEN` with evidence.

**Verdict derived from checks:**
- All criteria `MET`, all blast radius `CLEAN`, no new test failures, no `BROKEN` adversarial → **APPROVED**
- Minor adversarial `BROKEN` with no user-data impact, documented → **WARNING**
- Any criterion `UNMET`, any blast radius `BROKEN`, new test failure, or critical adversarial `BROKEN` → **BLOCK** → enter fix cycle

**Fix cycle**: up to 3 cycles, each must use a different approach. After cycle 3 with no APPROVED: hard-stop. Do not retry. Surface to user:

```
[HARD BLOCK] Review gate: 3 cycles exhausted without APPROVED verdict
Last verdict: BLOCK
Critical finding: {exact issue}
Action required: human decision needed before proceeding
```

---

### Step 5 — Finalize (MANDATORY)

**[Approval Gate]**: code-reviewer approval and fresh test/build evidence are required.

**`project-manager`** (skip `--fast`): mark phases `[x]`, update plan status.

**`docs-manager`** (skip `--fast`): update docs, README, API contracts.

**`git-manager`** (always): conventional commits → ask to push.

Record a concise journal entry after plan, docs, and git state are synchronized.

---

## Agents

| Agent / Skill     | Step | Modes |
|-------------------|------|-------|
| `tester`          | 3    | All modes unless `--no-test` |
| `debugger`        | 3    | When tests fail |
| `simplify` skill  | 3    | When complexity warrants it |
| `code-reviewer`   | 4    | All modes |
| `project-manager` | 5    | All modes |
| `docs-manager`    | 5    | When docs or contracts changed |
| `git-manager`     | 5    | Always (mandatory) |
