---
name: ck-code-review
description: Review a PR, commit, or pending changes through a 3-stage adversarial gate (Spec Compliance → Code Quality → Adversarial). Use when the user says "review this PR", "review my changes", "code review", pastes a PR number or commit hash, or wants a full codebase audit. Runs standalone — no cook/fix pipeline required. Input modes — pick one: #<PR> (gh diff), <commit-hash> (git show), --pending (working tree), codebase parallel (full audit).
user-invocable: true
---

# ck:code-review — Three-Stage Adversarial Review

Reviews code through three mandatory stages. The verdict is **derived from evidence**, never self-assigned. Stage 1 is a HARD GATE; Stages 2–3 are delegated to the `code-reviewer` agent (reused, not duplicated).

## Input Modes — pick one

| Mode | Trigger | Resolve diff with |
|------|---------|-------------------|
| PR | `#123` | `gh pr diff 123` (needs `gh` CLI + auth) |
| Commit | `<hash>` | `git show <hash>` |
| Pending | `--pending` | `git diff HEAD` (staged + unstaged) |
| Codebase | `codebase parallel` | full audit — spawn parallel reviewers per module |

If a mode's tool is unavailable (e.g. `gh` not installed / not authed), **stop and report the exact missing dependency** — do not silently fall back to another mode.

---

### Step 0 — Resolve Diff + Locate Spec

1. Resolve the diff for the chosen mode (table above). Capture changed files + line counts.
2. Find the governing spec/plan: look for `spec.md` / `plan.md` in `plans/*/` adjacent to the change. If none, Stage 1 degrades to "no spec — scope check against the change's own stated intent."

---

### Step 1 — Spec Compliance (HARD GATE, inline)

Handled by the main agent inline — no sub-agent. For each changed file/hunk:

- Does it map to a spec item (US-xx / FR-xx) or a stated intent? Cite the ID.
- Is anything **out of declared scope** (touches files the spec marked Out of Scope)?
- Does any change **violate an acceptance criterion** of a covered item?

Output a violation list with spec-ID citations. **Any Critical spec violation forces the final verdict to BLOCK** regardless of Stage 2–3 results. This is the hard gate — a change that contradicts the spec does not pass review even if the code is clean.

---

### Step 2 — Edge-Case Scout + Code Quality

First run scout with an edge-case focus. For broad changes, use 2-6 scoped
parallel scans across data flow, error paths, boundaries, and contracts.

Then spawn the **`code-reviewer`** agent with the diff, Stage 1 violations, and
scout findings. For 3+ changed files, split review scopes where ownership is
clear and deduplicate findings afterward.

---

### Step 3 — Adversarial (code-reviewer agent, second pass)

Stage 3 runs on every review except when the strict scope gate is met:
**≤2 files, ≤30 lines, and no security-sensitive code**. Record the exemption
and its measured file/line counts.

Otherwise, instruct `code-reviewer` to actively **try to break the code**: invalid inputs, boundary conditions, concurrent access, missing auth, injection. Each attempt is reported as `HELD` or `BROKEN` with evidence (the exact input + observed result) — never "looks safe".

---

### Step 4 — Verdict (derived, not assigned) + Artifact

The verdict follows mechanically from the three stages:

| Condition | Verdict |
|-----------|---------|
| Any Critical spec violation (Stage 1), OR any CRITICAL finding (Stage 2), OR any critical `BROKEN` (Stage 3) | **BLOCK** |
| HIGH findings only, or minor `BROKEN` with no user-data impact (documented) | **REQUEST CHANGES** |
| No spec violation, no CRITICAL/HIGH, all adversarial `HELD` | **APPROVE** |

> **Verdict label mapping:** the `code-reviewer` agent emits `APPROVED / WARNING / BLOCK`. When aggregating, map its `WARNING` → **REQUEST CHANGES** and `APPROVED` → **APPROVE**; `BLOCK` stays `BLOCK`. ck:code-review's public verdict is always one of APPROVE / REQUEST CHANGES / BLOCK.

The main agent writes the final review report, aggregating findings by severity,
per-finding adjudication, and the derived verdict.

Output the findings grouped by severity, then the verdict line.

**Fix-review cycle** (if the user asks to fix and re-review): max 3 cycles, each using a different approach than the last. After cycle 3 with no APPROVE:

```
[HARD BLOCK] Review gate: 3 cycles exhausted without APPROVE
Last verdict: {verdict}
Critical finding: {exact issue}
Action required: human decision needed
```

---

### Verification Gate — IRON LAW

Before claiming the review is complete: **run build + tests, read the output, and confirm 0 failures with FRESH evidence** (command output, exit code, log line). Do not state a verdict from reasoning alone. Banned in the final report: "should", "probably", "seems to", "looks fine". Every claim cites evidence or it does not appear.

This is behavioral guidance enforced in-skill, not a harness hook — the reviewer must hold itself to it.

---

## Agents

| Agent | Stage | Notes |
|-------|-------|-------|
| (main agent, inline) | 1 | Spec compliance hard gate |
| `code-reviewer` | 2, 3 | Reused; cannot write — orchestrator writes the artifact |
