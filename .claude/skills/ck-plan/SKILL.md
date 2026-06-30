---
name: ck-plan
description: >
  Create the implementation source of truth from a brainstorm report, feature
  brief, or concrete request. Use for non-trivial feature work before coding.
  Helps produce a Design Contract, phased plan, verification strategy, optional
  review, and cook handoff. Modes: --fast, --auto, --hard, --deep. Flag: --tdd.
user-invocable: true
---

# ck:plan

Turn intent into an implementation contract. With the standalone spec step
removed, `plan.md` is the preferred source of truth for non-trivial work and
should include the Design Contract when implementation will span phases,
contracts, risk, or multiple files.

Use this as a planning guide. Slash commands can enforce the full artifact
workflow; when the skill triggers opportunistically, scale the ceremony to the
risk and avoid treating every request as a full workflow.

## Resources

| Need | Read |
| --- | --- |
| Design Contract fields and quality bar | `references/design-contract.md` |
| Phase and dependency rules | `references/phase-planning.md` |
| Plan file shape | `assets/plan-template.md` |
| Phase file shape | `assets/phase-template.md` |

Load only the resource needed for the current step.

## Support Skill Triggers

Load support skills only when their trigger appears in the request, scout report,
or Design Contract:

| Trigger | Load |
| --- | --- |
| `--tdd`, behavior change, unclear verification | `testing-strategy` |
| auth, user input, secrets, PII, webhooks, external integrations | `security-hardening` |
| version-sensitive framework/library/API decision | `source-grounding` |
| production critical path, background job, external dependency | `observability` |
| database/schema/API contract migration, deprecation, removal | `migration-safety` |
| public API/setup/architecture decision | `documentation-adrs` |

## Modes

| Mode | Research | Red-Team | Validation | Cook Handoff |
| --- | --- | --- | --- | --- |
| `--fast` | skip unless local evidence is insufficient | skip | minimal sanity check | `/ck:cook --fast` |
| `--auto` | risk-based | risk-based | risk-based | `/ck:cook --auto` |
| `--hard` | 2 researchers | recommended | material assumptions | `/ck:cook --hard` |
| `--deep` | 2-3 researchers + per-phase scout notes | recommended | user-facing assumptions | `/ck:cook --hard` |

Default mode is `--auto`.

Auto-detect inside `--auto`: Fast behavior for single-file familiar changes;
Hard behavior for meaningful constraints or cross-module work; Deep behavior for
major refactors, 5+ areas, migrations, security, data loss risk, or
dependency-heavy architecture.

Flag:
- `--tdd`: include tests to write first in phase files and hand off to
  `/ck:cook --tdd`.

## Step 1 - Context Scan

1. Detect active, suggested, or absent plan context.
2. Read frontmatter from unfinished `plans/*/plan.md`.
3. Use `ck-scout --plan` when existing behavior, dependencies, or likely
   touchpoints are not obvious from local context.
4. Record real `blockedBy` / `blocks` relationships when plans overlap.

If the user provides a brainstorm report, feature brief, issue, or legacy spec,
read it fully. Treat it as input evidence, not as the final contract.
If the input path is `plans/YYMMDD-{slug}/brainstorm.md` or a work-item folder,
write the plan artifacts into that same folder. Do not create a second plan
folder for the same work item.

## Step 2 - Scope Challenge

Before creating files, output a compact challenge:

```text
Scope Challenge:
Exists?      {does this already exist?}
Minimum?     {smallest useful implementation}
Complexity?  {Fast | Auto | Hard | Deep}
Mode:        {detected or explicit}
Test:        {default | --tdd}
```

If scope is too large, propose a split and wait for confirmation.

If work is novel or ambiguous and no brainstorm report was provided, ask whether
to run `/ck:brainstorm` first. If the user chooses to continue, plan from the
available request and mark assumptions explicitly in the Design Contract.

## Step 3 - Design Contract

Read `references/design-contract.md`. Build the contract before dependency or
phase design.

The contract should contain:

- Objective
- User / operator value
- Success metrics
- Acceptance criteria
- Not Doing
- Constraints
- Assumptions
- Open questions
- Verification strategy
- Support checks
- Ship criteria

Resolve questions that materially change the implementation shape. Non-blocking
unknowns stay in the contract as assumptions or risks.

## Step 4 - Dependency Graph

Read `references/phase-planning.md`. Map build order:

```text
Foundation: {data, shared contracts, migrations, config}
Features:   {services, endpoints, workflows}
Surface:    {UI, CLI, public docs, release behavior}
```

Prefer vertical slices, but keep hard dependencies earlier. If dependency order
is uncertain, note the risk and make the earliest phase prove the risky contract.

## Step 5 - Research

Skip research in `--fast` unless local repo evidence cannot answer an important
unknown.

For `--auto`, decide from risk:
- no research for familiar local changes
- one `researcher` for uncertain implementation patterns
- two `researcher` agents when there are credible alternatives
- `source-grounding` when a framework/library/API decision depends on current or
  version-specific behavior

For `--hard`, spawn two `researcher` agents:
- Primary: recommended approach and current best practices
- Alternative: viable alternative and tradeoffs

For `--deep`, spawn 2-3 `researcher` agents and add `ck-scout --plan` notes per
phase once draft phases exist.

## Step 6 - Plan Creation

Spawn `planner` with:

- input artifact path or request
- Design Contract
- dependency graph
- mode and `--tdd` flag state
- scout and research reports
- support skill notes that apply to the plan
- template requirements from `assets/plan-template.md` and `assets/phase-template.md`

For non-trivial work, write plan files to disk. For small or exploratory work,
an inline plan is acceptable when the user has not asked for durable artifacts.

Expected structure:

```text
plans/YYMMDD-{slug}/
  brainstorm.md        # present when started from ck-brainstorm
  plan.md
  context.md
  phase-01-{name}.md
  phase-02-{name}.md
  evidence/
  reviews/
  fixes/
  ship/
```

## Step 7 - Red-Team Review

Skip only in explicit `--fast`.

Before review, verify the expected plan files exist. If files are missing,
repair the artifact set or ask whether an inline plan is sufficient.

In `--auto`, run `plan-reviewer` when scope crosses modules, security/data,
public contracts, migrations, or unclear acceptance criteria.

In `--hard` and `--deep`, prefer `plan-reviewer` with plan files, the
Design Contract, research reports, scout report, and source input. Adjudicate
findings:

- `ACCEPTED`: edit the plan immediately
- `NOTED`: add to Risk Register
- `REJECTED`: document why

If review returns `BLOCK`, revise before handoff. Re-run review when the change
was material or the user asked for a strict plan review.

## Step 8 - Validation And Handoff

`--fast`: output cook command immediately after sanity check.

`--auto`: validate only the assumptions that affect scope, data, or public
behavior. Ask before cook unless the user explicitly requested end-to-end
execution.

`--hard`: validate material uncertainty before cook.

`--deep`: validate unresolved assumptions with the user and record decisions in
`context.md`.

Output exact handoff:

| Mode | Cook Command |
| --- | --- |
| `--fast` | `/ck:cook --fast [--tdd] plans/YYMMDD-{slug}/plan.md` |
| `--auto` | `/ck:cook --auto [--tdd] plans/YYMMDD-{slug}/plan.md` |
| `--hard` | `/ck:cook --hard [--tdd] plans/YYMMDD-{slug}/plan.md` |
| `--deep` | `/ck:cook --hard [--tdd] plans/YYMMDD-{slug}/plan.md` |

Do not auto-start cook unless the user explicitly asked to continue through
implementation.
