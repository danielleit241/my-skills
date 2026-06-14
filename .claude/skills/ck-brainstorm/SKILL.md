---
name: ck-brainstorm
description: Extract user intent through non-technical questions, scout the repo for technical context, debate approaches, and write a brainstorm report. Use when the right design is unclear or the user asks to brainstorm. Produces one report under plans/reports and never writes implementation code.
user-invocable: true
---

# ck:brainstorm

Hard gate: no implementation code, scaffolding, or implementation skill calls.
The workflow ends with a design report and an optional `/ck:plan` handoff.

## Principle

Users who invoke brainstorm typically don't know the technical landscape — that's
why they're brainstorming. Never ask technical questions to the user. Scout handles
all technical discovery. Questions to the user are about intent only: why, what
success looks like, and what matters most.

## Step 1 - Scout First (silent)

Before saying anything, inspect the repository. Map project type, relevant modules,
existing patterns, docs, plans, schemas, and constraints. This gives you the
technical context so the user doesn't have to provide it.

Do not spawn planner or docs-manager. Do not surface raw findings yet.

## Step 2 - Intent Extraction

Use AskUserQuestion (max 2 rounds, max 3 questions per round) to extract intent.
Ask only non-technical questions. Do not ask about modules, files, APIs, constraints,
or technical trade-offs.

Lock these five intents before moving on:

1. **Trigger** — What's the problem or pain that prompted this? What's happening now that shouldn't be?
2. **Success** — What would you be able to do after this that you can't do now?
3. **Priority** — If only one thing could be done, what matters most?
4. **Boundary** — What is explicitly NOT part of this?
5. **Immovable** — Is there anything that must stay exactly as it is?

Good question examples:
- "What made you think of this today?"
- "If this worked perfectly, what would be different about your day?"
- "What's the one thing that would make this feel like a success?"

Bad question examples (never ask these):
- "What are the acceptance criteria?" → too technical
- "Which modules are involved?" → scout already knows
- "What are the non-negotiable constraints?" → jargon
- "What's the existing file structure?" → scout already knows

If the request spans three or more independent problems, surface that clearly and
ask which to tackle first — do not decompose silently.

## Step 3 - Research

Using the scouted repo context and locked intents, gather only what's needed to
compare viable approaches. Use repo docs first, external documentation when needed.

## Step 4 - Analyze

Present 2-3 viable approaches with explicit pros, cons, risks, and maintenance
cost — written in plain language, not technical jargon. Apply YAGNI, KISS, DRY.
Challenge shortcuts and unsupported assumptions directly.

## Step 5 - Consensus

Use AskUserQuestion to select or refine the approach. Frame options in terms of
outcomes, not technical mechanisms. Do not finalize while any intent field is
unresolved. Obtain explicit approval for the selected direction.

## Step 6 - Report

Write exactly one report:

`plans/reports/brainstorm-YYMMDD-HHMM-{slug}.md`

The report contains:

1. Problem statement (from user intent) and scouted repository context
2. Locked intents
3. Evaluated approaches and trade-offs
4. Final recommendation
5. Implementation risks and assumptions
6. Success metrics
7. Next steps

Use `.ck.json` `spec.language` for report content.

## Step 7 - Handoff

Only after approval, no open intents, and a written report, offer:

1. `/ck:plan --tdd {report-path}` for refactors or critical logic
2. `/ck:plan {report-path}` for standard work
3. End session
