---
name: ck-brainstorm
description: Scout the repository, clarify exact requirements, debate approaches, and write a brainstorm report before planning. Use when the right design is unclear or the user asks to brainstorm. Produces one report under plans/reports and never writes implementation code.
user-invocable: true
---

# ck:brainstorm

Hard gate: no implementation code, scaffolding, or implementation skill calls.
The workflow ends with a design report and an optional `/ck:plan` handoff.

## Step 1 - Scout First

Before asking questions, inspect the repository directly or use the scout agent.
Map project type, relevant modules, existing patterns, docs, plans, schemas,
public APIs, and constraints. Summarize 3-6 concrete findings to the user.

Do not spawn planner or docs-manager through Task in this workflow. Their
concerns may be consulted inline.

## Step 2 - Exact Requirements

Use AskUserQuestion in short rounds until these five fields are concrete:

1. Expected output
2. Acceptance criteria
3. Scope boundary
4. Non-negotiable constraints
5. Existing file/module touchpoints

If the request spans three or more independent subsystems, decompose it into
separate brainstorm cycles before continuing.

## Step 3 - Research

Gather only evidence needed to compare the viable approaches. Use repository
docs first, then official external documentation when current facts matter.

## Step 4 - Analyze

Present 2-3 viable approaches with explicit pros, cons, risks, and maintenance
cost. Apply YAGNI, KISS, and DRY. Challenge shortcuts and unsupported
assumptions directly.

## Step 5 - Consensus

Use AskUserQuestion to select or refine the approach. Do not finalize while any
of the five requirement fields remain unresolved. Obtain explicit approval for
the selected design.

## Step 6 - Report

Write exactly one report:

`plans/reports/brainstorm-YYMMDD-HHMM-{slug}.md`

The report contains:

1. Problem statement and scouted repository context
2. Exact requirements
3. Evaluated approaches and trade-offs
4. Final recommendation
5. Implementation risks and assumptions
6. Success metrics
7. Next steps

Use `.ck.json` `spec.language` for report content.

## Step 7 - Handoff

Only after approval, no open questions, and a written report, offer:

1. `/ck:plan --tdd {report-path}` for refactors or critical logic
2. `/ck:plan {report-path}` for standard work
3. End session

Record a concise journal entry when the journal skill is available.
