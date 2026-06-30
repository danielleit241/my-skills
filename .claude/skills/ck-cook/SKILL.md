---
name: ck-cook
description: >
  Execute an approved plan or concrete feature brief into working code through
  artifact-driven phases. Use after ck-plan or when the user provides a clear
  plan.md path. Guides ck-scout setup, phase briefs, conditional sub-agent
  dispatch, verification evidence, plan sync, review, docs, and git.
  Modes: --fast, --auto, --hard. Flag: --tdd.
user-invocable: true
---

# ck:cook

Cook executes a plan. It does not redesign the feature. The controller keeps
context small by handing phase artifacts to subagents only when the phase
benefits from isolated context, specialist review, or a durable worker report.
Small phases may be executed inline, with evidence proportional to risk.

Use this as an implementation discipline, not a rigid workflow script. Slash
commands may require plan artifacts; when the skill is loaded for a clear small
request, a concise requirement snapshot can be enough.

## Resources

| Need | Read |
| --- | --- |
| Phase execution loop | `references/phase-execution.md` |
| Evidence and status contract | `references/evidence-contract.md` |
| Phase brief artifact shape | `assets/phase-brief-template.md` |
| Phase evidence artifact shape | `assets/phase-evidence-template.md` |

## Modes

| Mode | Behavior |
| --- | --- |
| `--fast` | Smallest safe loop: phase brief, inline implementation by default, focused verification, evidence; use sub-agents only when the heuristic triggers |
| `--auto` | Default. Inline low-risk phases; dispatch implementer/tester/task-reviewer when thresholds or risk triggers apply; pause for blockers or contract changes |
| `--hard` | High-assurance loop. Bias toward per-phase verification, task-reviewer, final code-review, and pausing on unresolved warnings |

Default mode is `--auto`.

Flag:
- `--tdd`: tester writes failing tests from the phase contract before implementer
  writes production code.

## Support Skill Triggers

Before each phase, load only the support skills that match the phase brief or
scout evidence:

| Trigger | Load |
| --- | --- |
| `--tdd`, behavior change, bug guard, flaky/failing tests | `testing-strategy` |
| auth, user input, secrets, PII, webhooks, external integrations | `security-hardening` |
| version-sensitive framework/library/API usage | `source-grounding` |
| production critical path, job, dependency call, diagnosis gap | `observability` |
| schema/data/API migration, deprecation, compatibility risk | `migration-safety` |
| public docs, setup, API, architecture rationale | `documentation-adrs` |

## Sub-Agent Dispatch Heuristic

Before each phase, decide whether the main controller can safely execute inline
or whether a sub-agent is justified.

Use inline execution when all are true:

- phase likely touches one or two local files
- no public contract, data, auth, migration, concurrency, or operational risk
- acceptance criteria are clear and verification is a focused command or read
- expected tool/log output is small enough to keep in the main context

Dispatch sub-agents when one or more are true:

- phase likely touches more than two files, more than one module, or multiple layers
- `--tdd` is active
- behavior, security, data, migration, API, auth, concurrency, or production risk exists
- verification output, test output, or repo reading would pollute the main context
- the phase needs an independent review lens before it can be trusted
- the first inline attempt is uncertain, blocked, or fails verification

Mode guidance:

- `--fast`: prefer inline; dispatch only when the heuristic triggers.
- `--auto`: apply the heuristic per phase; do not spawn sub-agents by habit.
- `--hard`: strongly prefer `implementer`, `tester`, and `task-reviewer` for
  risky or multi-step phases; keep obvious low-risk mechanical edits inline
  when that is clearly cheaper and still verified.

## Step 1 - Scout And Load

1. Use `ck-scout --plan` with the plan path or selected phase scope when
   touchpoints, stack signals, commands, or context trust are uncertain.
2. Locate the plan. If no plan path is provided, search `plans/*/plan.md` and ask before using one.
3. Read `plan.md`, `context.md` if present, and the next incomplete `phase-XX-*.md`.
4. Confirm whether a Design Contract or equivalent requirement snapshot exists.
   If missing for non-trivial work, route to `/ck:plan`; for small clear work,
   write the missing snapshot before editing.
5. Report mode, `--tdd` state, remaining phases, and resume state from `## Session Notes`.

## Step 2 - Preflight

Before implementing any phase:

- Check the next phase maps to the Design Contract.
- Confirm likely touchpoints are not contradicted by scout evidence.
- Surface contradictions between plan, code, and scout evidence.
- Load any support skill triggered by the phase risk and summarize its check in
  the phase brief.
- Decide inline vs sub-agent using the Sub-Agent Dispatch Heuristic and record the
  reason in the phase evidence.
- Ask one batched question only for blockers.

Do not ask "should I continue" between clean phases in `--auto`.

## Step 3 - Phase Loop

For each remaining phase, read `references/phase-execution.md` and execute:

1. Write `plans/{slug}/evidence/phase-NN-brief.md` from the phase file and Design Contract.
2. Record the current git base before implementation.
3. Choose execution path:
   - Inline path: main controller edits the scoped files, runs focused verification,
     and writes a short implementation note into phase evidence.
   - Sub-agent path: if `--tdd` is active, load `testing-strategy`, then spawn
     `tester` first with the brief and expected failing-test report path; spawn
     `implementer` with the brief path, report path, constraints, and expected
     status enum; handle status from `references/evidence-contract.md`.
4. Run verification:
   - Inline path: run the smallest command/read that proves the phase criteria.
   - Sub-agent path: spawn `tester` with the brief, changed files, and test expectations.
5. Write `plans/{slug}/evidence/phase-NN-evidence.md`.
6. Review:
   - Inline path: run self-review; spawn `task-reviewer` only if the dispatch
     heuristic triggers after seeing the diff or evidence.
   - Sub-agent path: spawn `task-reviewer` with brief, implementer report,
     evidence file, and diff/review package.
7. Fix and re-review critical/high findings before marking the phase complete.
8. Update `plan.md` checkbox and overwrite `## Session Notes`.

Pause for `BLOCKED`, unresolved `NEEDS_CONTEXT`, failed verification/review
after a retry, or a user decision that changes the Design Contract.

## Step 4 - Final Review

After the planned phases have appropriate evidence and review for their risk:

1. Run fresh build/test evidence.
2. Spawn `code-reviewer` for the whole branch/diff when mode is `--hard`, when
   any phase used inline execution without task-reviewer, or when the diff
   crosses contract/security/data/migration/module boundaries.
3. Resolve `BLOCK` findings with a single fix loop and re-review.
4. Record final review under `plans/{slug}/reviews/final-review.md`.

## Step 5 - Finalize

Completion check:

- all planned phases checked complete
- per-phase task reviews passed when triggered
- final code review is `APPROVED` or accepted `WARNING` when triggered
- fresh verification evidence exists

Then:

- run dead-code check and ask before removing orphaned symbols
- spawn `project-manager` unless `--fast`
- load `documentation-adrs` and spawn `docs-manager` when docs/contracts changed, or in `--hard`
- spawn `git-manager` for commit and push prompt
- hand off `/ck:ship --dry-run plans/{slug}/plan.md`

## Agents

| Agent / Skill | Role |
| --- | --- |
| `ck-scout` | Read-only setup and context trust |
| `context-scout` | Scoped scout worker dispatched by `ck-scout` when a subagent scan is useful |
| `implementer` | Implements one phase from a brief and writes report |
| `tester` | Writes/runs tests and reports evidence |
| `debugger` | Fixes reproducible test/build failures |
| `task-reviewer` | Reviews one phase against its brief and evidence |
| `code-reviewer` | Final whole-diff review |
| `project-manager` | Plan status sync |
| `docs-manager` | Minimal docs/contracts sync |
| `git-manager` | Commit and push handoff |
