---
name: ck-ship
description: Release-readiness guide for finished cook/fix work. Use when preparing to ship, merge, publish, deploy, tag, or hand off completed changes after implementation and review. Produces ship readiness evidence and surfaces blockers, accepted risk, rollback, docs, tests, review, and versioning status.
---

# ck:ship

Decide whether completed work is ready to leave the branch. Treat shipping as a
risk decision, not a celebration step.

Boundary: do not merge, tag, publish, deploy, or push release changes without
fresh readiness evidence or an explicit user decision accepting the written
risk.

## Resources

| Need                              | Read                            |
| --------------------------------- | ------------------------------- |
| Readiness checks and blocker handling | `references/readiness-gates.md` |
| Readiness artifact shape          | `assets/readiness-template.md`  |

## Modes

| Mode         | Use                                                                          |
| ------------ | ---------------------------------------------------------------------------- |
| default      | Readiness check for normal completed work                                    |
| `--dry-run`  | Produce readiness report only, no release actions                            |
| `--fast`     | Small internal change; still keep fresh verification and review evidence |
| `--release`  | Version/tag/package/publish path after readiness passes                      |
| `--rollback` | Prepare or execute rollback plan for a shipped change                        |

## Support Skill Triggers

Readiness checks may load support skills for specialist evidence:

| Check / Trigger | Load |
| --- | --- |
| missing or weak verification evidence | `testing-strategy` |
| user-data, auth, secrets, input, webhook, external integration risk | `security-hardening` |
| release depends on framework/library/provider behavior | `source-grounding` |
| production path lacks logs, metrics, traces, alerts, or runbook | `observability` |
| schema/data/API migration, deprecation, rollback caveat | `migration-safety` |
| public docs, ADR, setup, changelog, API docs missing | `documentation-adrs` |

## Specialist Dispatch Heuristic

Shipping does not fan out to every reviewer for every change. Reuse existing
evidence when it is fresh, scoped to the current diff, and recorded in the
active work-item folder.

Run checks inline when all are true:

- change is small, internal, and already has fresh build/test evidence
- no public contract, user-data, auth, migration, release, or operational risk
- an existing review artifact covers the current diff

Dispatch specialists when the risk or missing evidence needs an independent lens:

| Specialist | Dispatch when |
| --- | --- |
| `code-reviewer` | no fresh review exists, diff changed after review, public contract changed, or mode is `--release` |
| `tester` | verification evidence is missing/weak, behavior changed, tests are failing/flaky, or rollback depends on test confidence |
| `security-hardening` | auth, secrets, PII, user input, webhook, external integration, or privilege boundary is touched |
| `migration-safety` | schema/data/API compatibility, deprecation, irreversible data change, or rollback caveat exists |
| `observability` | production path, background job, dependency call, alerting, logging, metrics, trace, or runbook is needed |
| `documentation-adrs` | public API/setup/architecture/changelog/release docs are affected |

For independent high-risk checks, fan out in parallel and merge the reports in
the readiness artifact. For small `--fast` changes, do not dispatch a sub-agent
just to restate evidence the controller already verified.

## Readiness Checks

Read `references/readiness-gates.md` when the change is non-trivial, risky, or
the user is asking for a release decision rather than a quick dry-run.

Run checks in order. On a blocker, report it and the risk. Continue only when
the user accepts the risk or asks for a narrower dry-run.

1. **Scope check** - Confirm the shipped diff matches the accepted plan, fix report, or stated intent.
2. **Verification check** - Run fresh build/test/lint commands appropriate to the changed surface.
3. **Review check** - Look for `code-review` evidence with no unresolved critical/high findings; dispatch `code-reviewer` only when existing evidence is absent, stale, or too narrow.
4. **Docs check** - Confirm public behavior, commands, APIs, or setup changes are documented.
5. **Risk check** - Identify user-data, auth, migration, performance, and operational risk.
6. **Rollback check** - State how to revert safely and what data cannot be rolled back.
7. **Version check** - For release mode, confirm changelog, version, tag, and package contents.

When a check triggers a support skill, include the support skill verdict or notes
in the readiness artifact.

## Output Artifact

Write or update:

```text
plans/{active-plan}/ship/readiness.md
```

If no active plan exists, write:

```text
plans/ship/readiness-YYMMDD-HHMM-{slug}.md
```

Use `assets/readiness-template.md`.

Recommended structure:

```markdown
# Ship Readiness: {change}

## Verdict

{READY | NOT READY | READY WITH ACCEPTED RISK}

## Scope

- Intent:
- Diff summary:
- Out of scope checked:

## Evidence

- Build:
- Tests:
- Lint/typecheck:
- Review:

## Risk

- User/data risk:
- Operational risk:
- Migration risk:
- Residual risk:

## Rollback

- Command/path:
- Data caveats:
- Owner/check:

## Release Actions

- Version/changelog:
- Tag/package:
- Push/deploy:
```

## Final Action

- `READY`: hand off to `git-manager` for commit/tag/push steps.
- `READY WITH ACCEPTED RISK`: ask the user to confirm the exact risk line before release action.
- `NOT READY`: list blockers and the command or workflow that should resolve each one.
