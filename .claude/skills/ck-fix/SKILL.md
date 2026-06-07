---
name: ck:fix
description: Fix a bug using Scout → Diagnose → Fix → Review → Finalize. Use when the user pastes an error message, stack trace, or test failure, or says "fix this bug", "something's broken", "tests are failing", "I'm getting an error". Modes (pick one): --fast (trivial errors — lint, type, build — skip scout and review), --hard (mandatory review, no auto-approve).
user-invocable: true
---

# ck:fix — Structured Bug-Fix Pipeline

Modes — mutually exclusive, pick one (default = Standard: auto-advance on APPROVED verdict with no critical findings):
- **`--fast`** — trivial issues (lint, type errors, build errors); skip scout, review, docs
- **`--hard`** — mandatory review, no auto-advance

**Activation baseline** — active throughout the entire pipeline regardless of mode:
- `sequential-thinking` — frames every reasoning step; prevents attention drift and premature conclusion
- `scout` — evidence layer; its blast radius and delta output inform all downstream steps
- `debugger` — hypothesis engine; active from Step 2 until root cause is confirmed

Conditional activations are described inline in their respective steps.

---

### Step 0 — Prerequisites + Scope

If no error message, stack trace, or concrete description provided:
→ "Paste the error message or stack trace." Wait before continuing.

```
# Scope:
#   Description: {what the user said}
#   Quick?      → {yes/no — reason}
#   Mode:       {Standard | Quick | Hard}
```

If `--fast` or clearly a build/compiler/lint error: skip Step 1 → go directly to Step 2.

---

### Step 1 — Scout

Spawn **`scout`** with the bug description. Scout must establish three things:

**Temporal Context** — git blame + last 20 commits touching affected files. The goal: understand *why* the code was written this way. Legacy constraints and historical trade-offs often explain what looks like "bad code".

**Blast Radius** — map callers and downstream dependents. If we change function A in file X, which callers in file Y/Z break? Does the data shape change? Scout must answer this before the debugger touches anything.

**Delta Analysis ("Why now?")** — find what *changed* between the last working state and now. Production bugs don't spontaneously appear; they're triggered by:
- Environment drift (runtime version, OS, container image)
- Incomplete data migration
- Dependency version mismatch
- A recent commit that regressed behavior

Without a confirmed Delta, any fix is symptom-addressing, not root-cause-addressing.

```
// Evidence:
//   Error pattern: NullReferenceException at auth.ts:45
//   Affected files: auth.ts, session.ts
//   Temporal: auth.ts rewritten in commit a3f2b1 (2h ago) to support OAuth
//   Blast radius: session.ts:validate() expects req.user non-null — shape broken
//   Delta: commit a3f2b1 removed null guard that existed in prior implementation
```

---

### Step 1.5 — Spec Anchor (skip `--fast`, skip if no spec.md)

After scout completes, check if a `spec.md` exists in the same plan directory (or `plans/*/spec.md` adjacent to any active plan).

If spec found, answer two questions:

**Q1 — Is this bug a spec gap?**
- Scan spec items (US-xx, FR-xx) — does any acceptance criterion cover the broken behavior?
- If yes: the bug is a regression — the fix must restore spec compliance, not negotiate a new behavior
- If no: the behavior was never specified — **this is a spec gap**, not just a bug

**Q2 — Spec-first decision:**
- **Regression** → proceed to Step 2; fix must satisfy the spec item's acceptance condition
- **Spec gap** → before writing any code, add a new acceptance criterion to the relevant spec item (or new item if entirely missing); this becomes the acceptance condition the fix must satisfy

```
# Spec Anchor
Bug type:     Regression | Spec gap
Spec item:    US-02 (regression) | none found (gap)
Action:       Fix must satisfy US-02 acceptance condition
              OR: spec.md updated — added US-05 · P1 covering {edge case}
```

Do not write any fix code until the spec anchor is established.

### Step 2 — Diagnose

Spawn **`debugger`** with a minimal handoff — scout evidence only, not the full conversation. The debugger needs: error pattern, affected files, temporal context, blast radius, confirmed delta. Nothing more. Excess context dilutes attention on the actual evidence.

The debugger, guided by `sequential-thinking` to structure hypothesis formation:
- Forms 2–3 hypotheses from the evidence
- Confirms or rejects each against the codebase
- Applies the minimal fix at the confirmed root cause

```
// Hypothesis A: null check missing in auth.ts:45 → CONFIRMED ✓
// Hypothesis B: race condition in session init   → REJECTED ✗
//
// Root cause: missing null guard on req.user before .validate()
// Fix applied: auth.ts:45
// Severity: HIGH | Scope: 1 file
```

**Conditional: `problem-solving` activates when ≥ 2 hypotheses are rejected and no root cause is confirmed.** The problem space is likely larger than the evidence suggests — `problem-solving` widens the search: system-level interactions, concurrent state, implicit contracts, environmental assumptions. Do not loop on the same hypothesis set; the activation signal means the framing itself needs to change.

---

### Step 2.5 — Verification Gate (skip `--fast`)

Before review: confirm the fix addresses root cause, not just symptoms. A symptom-masked fix will re-emerge under different conditions.

Use Bash and `code-reviewer` to verify each point with evidence, not reasoning. If any point fails, return to Step 2 with the failure as new evidence.

1. **Exact symptoms** — does the fix address the precise error described, not a related-but-different issue?
2. **Reproduction** — run the original reproduction steps via Bash; confirm they no longer trigger the bug.
3. **Expected behavior** — run the positive-path test or command; confirm expected output is restored (not just error silenced).
4. **Root cause** — was the confirmed hypothesis from Step 2 actually resolved, not masked with a try/catch or fallback?
5. **"Why now?"** — does the fix address the delta from Step 1? If the delta was a version mismatch, fix the mismatch — not its symptoms.
6. **Blast radius** — run tests covering the callers and dependents mapped in Step 1; confirm they pass.

`code-reviewer` participates in points 1 and 4 (structural analysis of the diff). Bash executes points 2, 3, and 6 (runtime confirmation).

---

### Step 3 — Review

**`--fast`**: skip → Step 4.

Spawn **`code-reviewer`** with minimal context: the diff + blast radius map from Step 1. Not the full session — the reviewer's job is adversarial: find what's wrong, not validate what's right.

Approval is evidence-gated, not score-based. The reviewer must produce findings across five areas before a verdict is valid:

- **Context** — which code was reviewed, what patterns and contracts were established
- **Risk** — edge cases considered, what could regress or break under different conditions
- **Verification** — what was actually checked (grep, trace, test run) — not what "looks correct"
- **Decision** — APPROVED / WARNING / BLOCK with specific line-level reasoning
- **Adversarial** — what the reviewer specifically tried to break, and why it held (or didn't)

Verdict:
- **APPROVED** (all 5 areas addressed, no critical) → auto-advance (Standard) or wait (--hard)
- **WARNING** → auto-advance with notice (Standard) or wait (--hard)
- **BLOCK** → enter fix cycle

**Fix cycle** (Standard): up to 3 cycles, each must use a different approach than previous. After cycle 3 with no APPROVED: hard-stop. Do not loop further. Surface the blocker to the user explicitly:

```
[HARD BLOCK] Review gate: 3 cycles exhausted without APPROVED verdict
Last verdict: BLOCK
Critical finding: {exact issue}
Action required: human decision needed before proceeding
```

**`--hard`**: no auto-advance — human must explicitly approve before Step 4.

---

### Step 4 — Finalize (MANDATORY)

**`project-manager`** (skip `--fast`): sync plan progress if bug was tracked.
**`docs-manager`** (skip `--fast`): update docs if fix changes a public contract.

**Spec Sync** (skip `--fast`, skip if no spec.md): finalize spec changes from Step 1.5:
- If spec gap was added → confirm the new spec item's acceptance condition is now satisfied by the fix
- If regression fix → confirm the spec item's acceptance condition is met and mark it verified
- If fix revealed additional edge cases not in spec → add them as acceptance conditions now

Edit `spec.md` directly. The spec update commits alongside the fix.

**`git-manager`** (always): conventional commit + ask to push.

```
// git-manager → fix(auth): add null guard on req.user before validate
//            → Push to remote? [y/N]
```

---

## Activation Matrix

| Agent / Skill       | Activation | Condition |
|---------------------|------------|-----------|
| `sequential-thinking` | Always   | Baseline — active throughout all steps |
| `scout`             | Always     | Baseline — evidence layer for all downstream steps |
| `debugger`          | Always     | Baseline — active Steps 2–2.5 until root cause confirmed |
| `problem-solving`   | Conditional | ≥ 2 hypotheses rejected with no confirmed root cause |
| `code-reviewer`     | Step 2.5 + 3 | Structural diff analysis in verify; full review in Step 3 |
| Bash                | Step 2.5   | Runtime confirmation: repro, positive path, blast radius tests |
| `project-manager`   | Step 4     | Standard, `--hard` (skip `--fast`) |
| `docs-manager`      | Step 4     | Standard, `--hard` (skip `--fast`) |
| Spec Sync           | Step 1.5 + 4 | When spec.md present; skip `--fast` |
| `git-manager`       | Step 4     | Always (mandatory) |
