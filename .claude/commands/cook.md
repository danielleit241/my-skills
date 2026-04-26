---
description: Guided feature development with codebase understanding and architecture focus. Accepts an optional plan file path: /cook plans/260418-auth/plan.md
---

# /cook — Structured Implementation Pipeline

## Usage

```
/cook [--auto | --fast | --parallel] [plan-file-path | feature-description]
```

Auto-detect mode if no flag given:
- **Interactive** (default) — stops at each Review Gate for approval
- **Auto** (`--auto`) — auto-approve if score ≥ 9.5 with 0 critical
- **Fast** (`--fast`) — skip tester/reviewer loop, single-pass implement
- **Parallel** (`--parallel`) — multi-agent execution for 3+ independent phases

---

### Step 1 — Load Plan / Detect Mode

When a plan file path is provided, report what will be cooked:

```
Plan: {Feature Name}
Status: {status from plan.md}
Mode: {Interactive | Auto | Fast | Parallel}
Phases remaining:
  [ ] Phase 1: Setup
  [ ] Phase 2: Backend
  [ ] Phase 3: Testing
```

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
4. Mark phase complete in `plan.md`: `- [x] Phase N: {name}`
5. Report what was done

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

Spawn the **`tester`** sub-agent after each phase (or all phases in --fast-skip):

- Writes comprehensive tests for implemented code
- Runs the full test suite — **100% pass required**
- If tests fail → spawns **`debugger`** sub-agent to investigate root cause
- Fix → re-test loop, **max 3 cycles**

```
// main agent → spawns tester sub-agent
//
// Test results: 18/18 passed ✓

// If failed:
//   main agent → spawns debugger sub-agent
//   debugger → root cause found → fix → re-test
```

If 3 cycles exhausted without passing: **stop and report to user**.

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

Spawn the **`code-reviewer`** sub-agent after tests pass:

- Reviews correctness, security, regressions, code quality
- Produces a score and verdict: APPROVED / WARNING / BLOCK
- **Auto mode**: auto-approve if score ≥ 9.5 with 0 critical
- Fix/re-review cycle up to **3 times**, then escalate to user

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

Step 5 is **always required** — cook is incomplete without all 3 sub-agents:

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
| `tester` | 3 — write + run tests | All except --fast |
| `debugger` | 3 — root cause analysis | When tests fail |
| `simplify` skill | 3.S — auto-simplify on threshold breach | All (hook-driven) |
| `code-reviewer` | 4 — review implementation | All except --fast |
| `project-manager` | 5 — sync plan + tasks | Always (mandatory) |
| `docs-manager` | 5 — update docs | Always (mandatory) |
| `git-manager` | 5 — commit + push | Always (mandatory) |

---

## Integration

- `/plan --hard <description>` — create a plan file first, then pass it to `/cook`
- `/fix --quick` — fix build errors during implementation
- `/code-review` — standalone review if you skipped --fast
