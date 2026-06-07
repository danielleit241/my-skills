---
name: ck-brainstorm
description: Clarify a feature idea and produce a spec before planning. Use when the user poses a design question, asks "how should I approach X", is unsure what to build, or says "let's brainstorm", "what's the best way to...", "I'm not sure how to tackle this". Output is a spec.md only — no code, no report. Always run before /ck:plan for novel or ambiguous features.
user-invocable: true
---

# ck:brainstorm — Clarify to Spec

**Philosophy: spec-driven development.** This session exists to produce one artifact: a tight `spec.md` that `/ck:plan` can build from. Idea exploration is the means, not the end.

**Hard gate: zero implementation code. Zero brainstorm reports.** Only clarify → spec → handoff.

---

### Step 0 — Listen First

Do NOT scout the codebase yet. Do NOT suggest options yet.

Ask one open question:

> "Tell me what you want to build — even roughly. What's the problem it solves?"

Wait for their answer. The user's framing is the starting point.

---

### Step 1 — Clarify the Shape

Use `AskUserQuestion` to close gaps. Ask 1–2 questions per turn, never a list.

Focus on what the spec needs:

- Who uses this, and what's the trigger?
- What does success look like — concretely?
- What's P1 (must ship) vs. P2 (nice-to-have)?
- What's explicitly out of scope?
- Any non-functional constraints (latency, security, scale)?

Add your own interpretation after the user speaks — confirm or correct.

Loop until you have enough to write a complete spec. Stop when you have: users, P1 stories, measurable success criteria, and known exclusions.

```
// Aim for 3–5 clarification turns, not open-ended exploration.
// If the user says "I'm not sure", give them two options to react to.
```

---

### Step 2 — Scout (Only If Needed)

If a clarification question requires codebase context, spawn 1–2 targeted **`Explore` sub-agents** inline.

```
// Scout is optional and reactive.
// Only spawn if "I need to check X before I can write the spec correctly."
```

---

### Step 3 — Clarification Gate

Before writing the spec, scan for remaining ambiguity:

- Flag at most **3 items** with `[NEEDS CLARIFICATION: <what's missing>]`
- Ask 1–2 targeted questions — stop when resolved or user signals "close enough"
- Red flags: no measurable success criteria, vague scale, missing P1/P2 signal

Don't block on minor uncertainty. Mark it in the spec and move on.

---

### Step 4 — Write Spec

Write **one file**: `plans/{slug}/spec.md` using `.claude/skills/ck-brainstorm/references/spec-template.md`.

Language: read `.ck.json` → `spec.language`. Write all spec content in that language (if `"vi"`, write in Vietnamese — headings, stories, criteria, everything).

Directory: read `.ck.json` → `spec.directory` (default `"plans"`) — write spec to `{directory}/{slug}/spec.md`.

Fill in the template:
- User stories with P1/P2/P3 from the clarified direction
- Measurable success criteria (numbers, not adjectives)
- `[NEEDS CLARIFICATION]` for any unresolved flags

```
// spec.md is the only artifact. It feeds directly into /ck:plan.
```

---

### Step 5 — Handoff

Output:

```
Spec written: plans/{slug}/spec.md

→ /ck:plan plans/{slug}/spec.md   (proceed to planning)
→ Keep clarifying                  (return to Step 1)
```
