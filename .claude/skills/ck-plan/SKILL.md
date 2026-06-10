---
name: ck-plan
description: "Create a phased implementation plan with pre-check, cross-plan scan, research, red-team review, validation, task hydration, and cook handoff. Modes: --fast, --hard, --deep, --parallel, --two. Flags: --tdd, --no-tasks."
user-invocable: true
---

# ck:plan — Structured Planning Pipeline

## Mode Reference

| Mode         | Research                         | Red-Team     | Validate    | Cook handoff                     |
| ------------ | -------------------------------- | ------------ | ----------- | -------------------------------- |
| `--fast`     | —                                | —            | —           | `/ck:cook --fast`                |
| `--hard`     | 2 researchers                    | ✓            | optional    | `/ck:cook`                       |
| `--deep`     | 2-3 + per-phase scout            | ✓            | required    | `/ck:cook [--tdd]`               |
| `--two`      | 2 researchers (one per approach) | ✓ both plans | pick A or B | `/ck:cook [user-chosen mode]`    |
| `--parallel` | 2 researchers                    | ✓            | optional    | `/ck:cook --parallel`            |
| no mode      | Auto-detect from scope and risk  | Follows mode | Follows mode | Ask before cook                  |

**`--deep`** uses 2-3 researchers, per-phase scout context, forced validation,
and evidence-backed phase justification. Recommended with `--tdd`.

**Auto-detect** (no mode given): Fast if single-file, familiar, and low risk;
Hard for meaningful constraints; Deep for major refactors, 5+ areas, or
dependency-heavy architecture.

**Flag defaults**: `--tdd` and `--no-tasks` are both off.

### Step 0A - Plan Context and Cross-Plan Scan

Before scope challenge:

1. Detect active, suggested, or absent plan context. Ask whether to continue an
   active plan.
2. Read frontmatter from every unfinished `plans/*/plan.md`.
3. Detect overlapping files and shared dependencies.
4. Record `blockedBy` and `blocks` relationships bidirectionally when a real
   dependency exists.

---

### Step 0 — Scope Challenge

Before spawning any agents, detect mode and challenge scope:

```
# Scope Challenge:
#   Exists?     → [does this feature already exist in the codebase?]
#   Minimum?    → [smallest impl that satisfies requirements]
#   Complexity? → [Fast | Hard | Two | Parallel | Auto]
#
# Mode: [detected or explicit]
# Test:  [default | --tdd]
# Tasks: [default | --no-tasks]
```

If scope is too large: suggest splitting and **wait for user confirmation**.

If `--hard` / `--two` / `--parallel` and novel/ambiguous with no brainstorm report: "No brainstorm found. Run `/ck:brainstorm` first? [Y/n]" — if Yes, stop; if No, proceed.

---

### Step 1 — Research

**`--fast`**: skip entirely.

**`--hard` / `--parallel`**: spawn **2 `researcher` agents in parallel**:

- Instance A — role: `Primary` — recommended approach and best practices
- Instance B — role: `Alternative` — alternative approach and tradeoffs

**`--two`**: spawn **2 `researcher` agents in parallel**, each investigating one distinct approach:

- Instance A — role: `Approach A` — first viable approach (architecture, tradeoffs)
- Instance B — role: `Approach B` — second viable approach (meaningfully different strategy)

```
// Researcher A: [approach] → [verdict]
// Researcher B: [approach] → [verdict]
```

---

### Step 2 — Plan Creation

Spawn the **`planner` agent** with the feature description or brainstorm report,
mode, research reports, and test flag.

**After planner returns**: capture the plan directory path from its "Directory: plans/{date}-{slug}/" line — you'll need it in Step 3.

- **`--tdd`**: planner adds `### Tests to Write First` to each phase
- **`--two`**: planner writes `plan-a.md` + `plan-b.md` (one per approach) — no `plan.md` yet
- **`--parallel`**: planner adds `## File Ownership` section to each phase file

Output structure:

```
plans/{slug}/
  plan.md            ← all modes except --two
  plan-a.md          ← --two only
  plan-b.md          ← --two only
  phase-01-{name}.md
  phase-02-{name}.md
  ...
```

---

### Step 3 — Red-Team Review

**`--fast`**: skip.

**All other modes**: before spawning `plan-reviewer`, **verify plan files exist on disk** using Glob on the captured plan directory:
- Normal modes: `plans/{date}-{slug}/plan.md` must exist
- `--two` mode: `plans/{date}-{slug}/plan-a.md` + `plans/{date}-{slug}/plan-b.md` must exist

If files are missing: **stop** — output `"Planner failed to write files. Do not proceed."` Do not fall back to writing the plan inline.

Spawn **`plan-reviewer`** with all plan files and the brainstorm report when one
was provided.

**`--two`**: reviewer evaluates both plan-a and plan-b — flag risks in each separately.

Adjudicate each finding:

- `ACCEPTED` → edit the relevant plan file immediately
- `NOTED` → append to Risks section of `plan.md` (or `plan-a.md` / `plan-b.md` in `--two` mode)
- `REJECTED` → document reason

If `plan-reviewer` returns `BLOCK`: revise the flagged phase and re-run before proceeding.

---

### Step 4 — Validation + Handoff

**`--fast`**: skip questions — output cook command immediately.

**`--two`**: present a side-by-side comparison, then wait for the user to pick:

```
## Approach Comparison
Plan A: {1-line summary}
  Pros: {key strengths}  |  Cons: {key tradeoffs}

Plan B: {1-line summary}
  Pros: {key strengths}  |  Cons: {key tradeoffs}

Which approach? [A/B]
```

After selection: ask 2–3 targeted questions about the chosen plan. Merge chosen plan into `plan.md`, delete the rejected file.

**`--hard` / `--parallel`**: validation is optional; ask when material
uncertainty remains. **`--deep`** always validates.

After validation: hydrate Claude tasks per phase and critical step unless
`--no-tasks` is set.

Output the exact cook command:

| Mode         | Cook command                                                                                 |
| ------------ | -------------------------------------------------------------------------------------------- |
| `--fast`     | `/ck:cook --fast [--tdd] plans/{slug}/plan.md`                                               |
| `--hard`     | `/ck:cook [--tdd] plans/{slug}/plan.md`                                                      |
| `--deep`     | `/ck:cook [--tdd] plans/{slug}/plan.md`                                                      |
| `--two`      | `/ck:cook [--fast] [--tdd] plans/{slug}/plan.md`                                             |
| `--parallel` | `/ck:cook --parallel [--tdd] plans/{slug}/plan.md`                                           |
With no explicit mode, ask the user to validate, red-team again, run
`/ck:cook {absolute-plan-path}`, or end. Never auto-start cook.

---

## Agents

| Agent           | Step | Modes                                                      |
| --------------- | ---- | ---------------------------------------------------------- |
| `researcher`    | 1    | `--hard`/`--parallel`/`--two` (×2), `--deep` (×2-3)        |
| `planner`       | 2    | All                                                        |
| `plan-reviewer` | 3    | All except `--fast`                                        |
