---
name: ck-brainstorm
description: >
  Extract user intent, explore solution space, and write a design report. Use
  when the right design is unclear, requirements are vague, or the user asks to
  brainstorm. Can produce `brainstorm.md` inside a shared work-item folder and
  hand off to ck-plan when the user wants implementation planning.
user-invocable: true
---

# ck:brainstorm

Use this as an idea-refinement guide, not a rigid command script. Slash
commands may run the full workflow; the skill itself should scale to the user's
request. For early ideas, prefer a durable report. For a small clarification,
answer in chat and offer a plan handoff.

## Principle

Users who brainstorm don't know the technical landscape — that's why they're here.
Avoid asking the user for repo/module details that tools can discover. Keep
questions focused on intent, audience, success, and scope.

---

## Step 0 — Optional Scout

Use `ck-scout --repo` when repo context would change the design options, when
the user references existing code, or when a later plan is likely. Skip scout
for pure product ideation, copy exploration, or a small conceptual question.

---

## Step 1 — Intent Interview

State a hypothesis with confidence number before the first question:

```
HYPOTHESIS: You want X because Y — "feature name" was the word that came to mind.
CONFIDENCE: ~30% — missing: who this is for, what success looks like
```

Then interview one question at a time, each with your guess attached:

```
Q: [one focused question]
GUESS: I think [answer] because [reasoning] — correct me if I'm wrong.
```

Why one at a time: the third question often depends on the answer to the first.
Why attach a guess: users react to a wrong guess faster than they generate from scratch.

**Stop when:** can you predict the user's reaction to the next 3 questions you'd ask? If yes → proceed.
After 5+ rounds with no convergence: "Something foundational is missing — want to step back?"

Never ask:
- "What are the acceptance criteria?" → too technical
- "Which modules are involved?" → `ck-scout --repo` already knows
- "What are the non-negotiable constraints?" → jargon

If the request spans 3+ independent problems, surface it and ask which to tackle first.

When confident, write a restate the user can confirm line by line:

```
Here's what I understand:
- Outcome:      [one line]
- Who benefits: [one line]
- Why now:      [one line]
- Success:      [one line — testable]
- Not doing:    [one line — explicit scope boundary]

Yes / no / refine?
```

For consequential scope choices, get an explicit confirmation. For lightweight
brainstorming, summarize the assumption and continue.

---

## Step 2 — Diverge

Restate the confirmed intent as a "How Might We" question. Then generate 3-5 variations.
Pick the lenses that fit — don't run all mechanically:

- **Inversion** — what if you did the opposite of the obvious approach?
- **Constraint removal** — what if time, tech, or budget weren't factors?
- **Simplification** — what's the version that's 10x simpler?
- **10x scale** — what would this look like serving 100× the current load or users?
- **Audience shift** — what if this were built for a completely different user?

Push past the first obvious answer. Each variation should feel meaningfully different, not
just a feature tweak. Tell a story for each — not just a bullet.

---

## Step 3 — Analyze & Converge

Cluster variations into 2-3 distinct directions. For each direction:

**User value** — painkiller (users actively seek this, have workarounds, will switch) or
vitamin (nice-to-have, won't change behavior)?

**Feasibility** — what's the hardest part? What must exist first? Time to first working version?

**Differentiation** — what makes this genuinely different from what already exists?

Surface hidden assumptions per direction:

```
Must be true:   [what kills the idea if wrong — validate before building]
Should be true: [what changes the approach if wrong — adjustable]
Might be true:  [secondary bets — validate only after core is proven]
```

Be honest, not supportive. If a direction is weak, say so with a specific reason.

---

## Step 4 — Consensus

Ask the user to select or refine when multiple viable directions remain. Frame
options as outcomes, not technical mechanisms. If the user has already chosen a
direction, proceed with that and mark remaining assumptions.

---

## Step 5 — Report

When a durable handoff is useful, create or reuse one work-item folder and write
one report:

```text
plans/YYMMDD-{slug}/
  brainstorm.md
  evidence/
  reviews/
  fixes/
  ship/
```

The artifact path is `plans/YYMMDD-{slug}/brainstorm.md`.
Prefer colocating brainstorm output with the future plan, cook evidence, fixes,
and ship readiness artifacts.

Sections:
1. Problem statement + scouted repo context
2. Confirmed intent (restate from Step 1)
3. Directions explored — why each was kept or dropped
4. Chosen direction + rationale
5. Hidden assumptions (Must / Should / Might be true)
6. **Not Doing** — explicit list of what's out of scope and why
7. Success metrics — testable, not vague
8. Next steps

---

## Step 6 — Handoff

After approval and written report, offer:

1. `/ck:plan --tdd plans/YYMMDD-{slug}/brainstorm.md` — plan with tests-first phases
2. `/ck:plan plans/YYMMDD-{slug}/brainstorm.md` — standard plan with Design Contract
3. End session
