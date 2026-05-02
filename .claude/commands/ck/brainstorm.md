---
description: Explore and debate solutions before writing code — scout codebase, ask clarifying questions, research options, and produce a structured decision report. Ends with → /ck:plan (implement) or /ck:journal (archive). No code is written.
---

# /ck:brainstorm — Explore Ideas, Not Code

## HARD GATE

**This command writes zero implementation code.** Only: explore → debate → report.
Any code blocks in output are illustrative pseudocode or architecture diagrams only.
Implementation happens later via `/ck:plan → /ck:cook`.

---

## Usage

```
/ck:brainstorm <challenge description>
```

Example: `/ck:brainstorm best auth approach for our SaaS app`

---

### Step 0 — Scope Decomposition

Read `$ARGUMENTS`. If the description contains 3+ independent subsystems (e.g. "build platform with chat, billing, analytics"), split into sub-problems and **ask the user to confirm scope** via `AskUserQuestion` before proceeding.

```
// Scope check:
//   3+ independent concerns? → decompose, confirm with user
//   Single concern? → proceed
```

---

### Step 1 — Scout (Parallel)

Spawn 2–4 **`Explore` sub-agents** in parallel based on project size. Scale to what's useful — don't spawn agents for concerns that don't exist.

```
// Explore #1 → scan src/ for existing patterns relevant to the challenge
// Explore #2 → scan config/, package.json, *.toml for tech stack
// Explore #3 → scan docs/, CLAUDE.md, README for constraints (if present)
// Explore #4 → scan existing tests for coverage signals (large projects only)
//
// Each: isolated context, returns structured findings to main agent
```

Each agent returns: existing patterns, tech constraints, and anything that affects the solution space.

---

### Step 2 — Discovery

Run directly on the main agent — no sub-agents. Use `AskUserQuestion` with targeted probing questions. Typical questions (adapt to challenge):

- What are the hard constraints? (latency, compliance, team size, existing infra)
- What does "success" look like in 6 months?
- What has already been tried or ruled out, and why?
- What's the riskiest assumption in the current thinking?

Loop until you fully understand the problem. Challenge the user's initial framing if it contains hidden assumptions.

```
// AskUserQuestion → probing questions (1–3 per turn, not all at once)
// Loop until: constraints clear + success criteria defined + assumptions surfaced
```

---

### Step 3 — Research (Optional)

Skip if the decision space is already well-understood.

Use when: unfamiliar domain, rapidly-evolving ecosystem, or specific library/version decisions needed.

Spawn **2 `plan-researcher` agents in parallel** — same pattern as `/ck:plan`:

```
// plan-researcher A (Primary): investigate recommended approach + best practices
// plan-researcher B (Alternative): investigate alternative strategy or library
//
// Each: ≤5 tool calls, returns structured Research Report
// If DB schema relevant → main agent queries directly (not a sub-agent)
```

---

### Step 4 — Analyze + Debate

Run directly on the main agent. Present **2–3 viable approaches** — no more.

For each option:
- Name and one-sentence summary
- Concrete pros (what it does well for **this** project)
- Concrete cons (what it costs or risks)
- When to choose it

Enforce: YAGNI · KISS · DRY · Brutal honesty. If an option is over-engineered or unrealistic for this team/context, say so directly.

Activate `sequential-thinking` skill if multi-step reasoning across constraints is needed (runs in main agent context).

Use `AskUserQuestion` to iterate until consensus is reached on the preferred direction.

```
// Option A: [name] — [one-liner]
//   ✓ [pro specific to this project]
//   ✗ [real cost or risk]
//
// Option B: [name] — [one-liner]
//   ✓ ...
//   ✗ ...
//
// AskUserQuestion → confirm direction or iterate
```

---

### Step 5 — Report + Handoff

Write a structured markdown summary to `plans/reports/YYMMDD-{slug}-brainstorm.md`:

```markdown
# Brainstorm: {challenge}

**Date:** YYYY-MM-DD
**Chosen direction:** {option name}

## Context
{constraints, tech stack, key findings from scout}

## Options Considered
{table: option / pros / cons / verdict}

## Decision
{chosen option + rationale — why this, why not the others}

## Open Questions
{unresolved items that /ck:plan must address}

## Risks
{top 2–3 risks with mitigation notes}
```

Then ask via `AskUserQuestion`:

**"Brainstorm complete. What next?"**
Options:
- `Create implementation plan → /ck:plan` — spawn `/ck:plan` with the chosen direction as input
- `Save to journal → /ck:journal` — archive findings, no plan created
- `Keep exploring` — loop back to Step 2 or Step 3

```
// Report saved → plans/reports/YYMMDD-{slug}-brainstorm.md
//
// → /ck:plan: passes chosen direction + open questions as context
// → /ck:journal: spawns journal-writer sub-agent, session ends
// → Keep exploring: return to Step 2 or 3
```

---

## Agents

| Agent | Step | Số lượng | Khi nào |
|-------|------|----------|---------|
| `Explore` ×2–4 | 1 — Scout | 2–4, song song | Luôn luôn |
| `plan-researcher` ×2 | 3 — Research | 2, song song | Tùy chọn |
