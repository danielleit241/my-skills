---
name: ck-cook
description: Implement a planned feature phase by phase. Use when the user says "cook this", "implement it", "let's build", "start coding", or passes a plan.md path. Spec-aware — auto-loads spec.md alongside plan for SDD+TDD. Modes (pick one): --fast (skip test/review), --hard (mandatory human approval), --auto (auto-approve low-risk phases, the handoff target of ck:plan --auto), --parallel (File-Ownership phases, review at end). Composable flag: --tdd (write failing tests before implementing).
user-invocable: true
---

# ck:cook — Structured Implementation Pipeline

Modes — mutually exclusive, pick one (default = Standard):
- **Standard** — test + review; verdict derived from evidence checks, auto-advance on APPROVED
- **`--fast`** — skip tester and code-reviewer; git-manager only in Step 5
- **`--hard`** — mandatory test + mandatory review, no auto-approve
- **`--auto`** — full test + review run, but the per-phase Review Gate auto-approves when the derived verdict is APPROVED **and** the phase carries no HIGH-risk touchpoint (from `risk-gate.json`). Any WARNING/BLOCK, or any phase flagged HIGH risk, falls back to waiting for the user. This is the mode `ck:plan --auto` hands off to.
- **`--parallel`** — phases have exclusive File Ownership (from `ck:plan --parallel`); auto-continue between phases (no per-phase review gate), full test + review at end

Composable flag — combine with any mode:
- **`--tdd`** — write failing tests first, then implement until they pass

**Flag default** (no flag given): `--tdd` is off — standard test behavior applied.

**Artifacts** — written to the plan directory alongside `plan.md`. Schemas in `templates/`.

| File | Written at |
|------|-----------|
| `context-snippets.json` | Step 0.5 |
| `risk-gate.json` | Step 0.5 |
| `verification.json` | Step 3 |
| `review-decision.json` | Step 4 |
| `adversarial-validation.json` | Step 4 |

---

### Step 0 — Plan Check

When no plan path provided:
1. Search `plans/` for any `plan.md` → ask: "Found `{path}`. Use this? [Y/n]"
2. If none found → ask: "No plan found. Continue anyway? [y/N]" — if No, suggest `/ck:plan`

After resolving plan path: check for `spec.md` in the same directory. If found, load it — activates **spec-driven mode** for Steps 1 and 2.

**Spec-first rule** (applies whenever spec.md is loaded): spec is the source of truth. If the user wants to change behavior, they edit the spec — code follows. If a request to cook would contradict a P1 spec item without an updated spec, surface it:
```
[SPEC CONFLICT] This phase contradicts US-02 (spec.md).
Edit spec first? [Y/n]
```
Do not proceed until the spec is updated or the user explicitly overrides.

---

### Step 0.5 — Design Contract (skip for `--fast`)

Before writing any code, establish a contract the user confirms. Under-specified requests cause the model to fill gaps with high-probability guesses — the contract forces ambiguity to surface before it becomes a bug.

```
## Design Contract — {Feature Name}

**Output artifacts** (what will exist when done):
- {exact files/objects — e.g., "src/auth/jwt.service.ts", "POST /api/auth/token → {token, expires}"}

**Acceptance criteria** (testable inputs/outputs, not vibes):
- Given {input} → expect {output/behavior}

**In scope (will touch):**
- {explicit file/module list}

**Out of scope (MUST NOT touch):**
- {explicit list — prevents scope creep}

**Non-negotiable constraints:**
- {performance, security, compatibility floors — e.g., "no sync I/O on request path", "BCrypt rounds ≥ 12"}

**Touchpoints** (public contracts that change vs. stay stable):
- {changed}: {before} → {after}
- {stable}: {contract remains unchanged}
```

Present the contract and wait for explicit approval before proceeding. If the user modifies scope, update the contract and confirm again.

→ write `context-snippets.json`, `risk-gate.json`

---

### Step 1 — Load Plan / Detect Mode

Report what will be cooked:

```
Plan: {Feature Name}
Status: {status from plan.md}
Mode: {Standard | Fast | Hard | Auto | Parallel}
Test:  {default | --no-test | --tdd}
Spec:  {plans/{slug}/spec.md — N P1 stories, N success criteria | none}
Phases remaining:
  [ ] Phase 1: ...
  [ ] Phase 2: ...
```

If spec loaded + `--tdd` not set:
`Spec detected. Consider --tdd: acceptance criteria in spec.md are ready-made test anchors.`

If `## Session Notes` exists in plan.md: output resume state and continue from where it left off.

When no plan file provided: read the feature request, ask 2–3 clarifying questions, proceed once clear.

---

### Step 2 — Implement

**Activate the artifact gate** (skip `--fast`): write `.claude/session-data/cook-active.json` = `{ "plan_dir": "{absolute plan dir}", "phase_active": true }`. This signals `workflow_artifact_gate.py` (PreToolUse) that a cook is running and the 5 artifacts must exist — without this flag the gate fails open (never blocks). The gate skips writes to `session-data/` itself, so writing this flag does not trip it. Requires `.ck.json` → `artifactGate.enabled: true` to actually enforce.

For each `phase-XX-*.md` in order:

1. Read phase file — understand requirements, architecture, steps, success criteria
2. Implement following codebase conventions
3. Verify success criteria for the phase
4. **If spec loaded**: `P1 coverage: {N}/{total} stories addressed this phase`
5. Write (overwrite) `## Session Notes` in plan.md, then mark phase complete `- [x] Phase N: {name}`
6. Report what was done

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
- **Standard / `--hard`**: pause and wait for user approval
- **`--auto`**: auto-continue only if the phase verdict is APPROVED **and** the phase is not HIGH risk in `risk-gate.json`; otherwise pause and wait (same as Standard)
- **`--fast`** / **`--parallel`**: continue automatically

Stop if: success criterion unverifiable, unexpected blocker, or phase needs user decisions not in the plan.

---

### Step 3 — Test (tester sub-agent)

**`--fast`**: skip → Step 3.S.

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
1. `tester` writes failing tests (red) — from `### Tests to Write First` or spec acceptance criteria
2. Confirm red before implementing
3. Implement until green, full suite passes

→ write `verification.json`

---

### Step 3.S — Auto-Simplify

Check if `SIMPLIFY_TRIGGERED` in context (emitted by `code-simplifier` hook).

If triggered: invoke `simplify` skill on files edited this phase → delete simplify tracker → proceed to Step 4.
If not triggered: skip silently.

Thresholds (`.ck.json` → `simplify.threshold`): `totalLoc` 400, `fileCount` 8, `singleFileLoc` 200.

---

### Step 4 — Code Review

**`--fast`**: skip → Step 5.

**`--parallel`**: run code review across all phases at once (not per-phase).

**[Test Gate]**: all tests must pass (or `--fast` set).

Spawn **`code-reviewer`** with minimal context: the code diff + acceptance criteria from the Design Contract (Step 0.5) or spec. Not the full plan, not the full session. The reviewer's job is adversarial — find what broke, not confirm what works.

The verdict is not stated by the reviewer — it is **derived from evidence**. The reviewer runs four evidence-producing checks; the verdict follows mechanically from the results:

**Check 1 — Acceptance criteria** (from Design Contract): for each criterion, run or trace the exact input → confirm the exact expected output. Each criterion is `MET` or `UNMET` with evidence (command output, stack trace, log line).

**Check 2 — Blast radius** (from Step 0.5 Touchpoints): for each caller or downstream dependent listed, confirm it still behaves correctly. Each is `CLEAN` or `BROKEN` with evidence.

**Check 3 — Regression surface**: run tests covering paths adjacent to the change. Report pass/fail counts and any new failures introduced — not "looks fine".

**Check 4 — Adversarial**: attempt to break the implementation — invalid inputs, boundary conditions, concurrent access, missing auth. Each attempt is `HELD` or `BROKEN` with evidence.

**Verdict derived from checks:**
- All criteria `MET`, all blast radius `CLEAN`, no new test failures, no `BROKEN` adversarial → **APPROVED** → auto-advance (Standard) or wait (--hard)
- Minor adversarial `BROKEN` with no user-data impact, documented → **WARNING** → auto-advance with notice (Standard) or wait (--hard)
- Any criterion `UNMET`, any blast radius `BROKEN`, new test failure, or critical adversarial `BROKEN` → **BLOCK** → enter fix cycle

→ write `review-decision.json`, `adversarial-validation.json`

**Fix cycle**: up to 3 cycles, each must use a different approach. After cycle 3 with no APPROVED: hard-stop. Do not retry. Surface to user:

```
[HARD BLOCK] Review gate: 3 cycles exhausted without APPROVED verdict
Last verdict: BLOCK
Critical finding: {exact issue}
Action required: human decision needed before proceeding
```

---

### Step 5 — Finalize (MANDATORY)

**[Approval Gate]**: code-reviewer APPROVED required (or `--fast` bypass).

**Deactivate the artifact gate**: set `phase_active: false` in `.claude/session-data/cook-active.json` (or delete the file) so the gate stops enforcing once the cook is done. Skip if `--fast` (flag was never written).

**`project-manager`** (skip `--fast`): mark phases `[x]`, update plan status.

**`docs-manager`** (skip `--fast`): update docs, README, API contracts.

**If spec loaded** — run **Spec Sync** before git-manager:

1. For each completed phase, read its `## Covers` IDs and compare against spec.md items
2. For each covered spec item, check if:
   - Acceptance criteria wording matches what was actually implemented — if more specific/nuanced now, **update spec to match**
   - A new edge case or constraint was discovered during implementation — **add to spec as NFR or acceptance condition**
   - An item was found to be out of scope or split differently — **update spec Out of Scope / P3 accordingly**
3. Bump spec `Status:` to `Approved` if all P1 items are covered and verified

Output:
```
# Spec Sync
Updated: {N} items refined in spec.md
  - US-02: acceptance criteria tightened (added rate-limit condition)
  - FR-03: marked Approved after verification
Uncovered P1: {list any, or "none"}
```

Edit `spec.md` directly with the changes before proceeding to git-manager. The spec commit lands in the same commit as the implementation.

**`git-manager`** (always): conventional commits → ask to push.

---

## Agents

| Agent / Skill     | Step | Modes |
|-------------------|------|-------|
| `tester`          | 3    | Standard, `--hard`, `--auto`, `--parallel` (skip for `--fast`) |
| `debugger`        | 3    | When tests fail |
| `simplify` skill  | 3.S  | All (hook-driven) |
| `code-reviewer`   | 4    | Standard, `--hard`, `--auto`, `--parallel` (skip for `--fast`) |
| `project-manager` | 5    | Standard, `--hard`, `--auto`, `--parallel` (skip for `--fast`) |
| `docs-manager`    | 5    | Standard, `--hard`, `--auto`, `--parallel` (skip for `--fast`) |
| `git-manager`     | 5    | Always (mandatory) |
