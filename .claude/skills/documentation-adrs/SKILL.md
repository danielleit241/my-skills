---
name: documentation-adrs
description: >
  Records durable documentation and architecture decisions. Use when changing
  public APIs, setup, commands, architecture, data contracts, operational
  behavior, or when a decision's rationale needs to survive beyond the current
  session.
---

# Documentation And ADRs

Docs should describe the current truth and the rationale future maintainers need.
Do not turn docs into a changelog unless the project already uses changelogs.

## Process

1. Choose the artifact:
   - README/setup: install, config, commands, environment variables
   - API docs: endpoint, request/response, errors, auth
   - architecture doc: system shape and boundaries
   - ADR: decision, alternatives, tradeoffs, consequences
   - changelog/release notes: user-facing release summary
2. Update minimal current-state docs:
   - what is true now
   - how to use or operate it
   - constraints and caveats
   - links to source artifacts when useful
3. Write ADRs only for decisions that are hard to reverse or likely to be
   questioned later.
4. Keep docs consistent with implementation:
   - no aspirational behavior
   - no stale setup steps
   - no hidden breaking changes
5. Record docs evidence in cook/fix/ship artifacts.

## ADR Shape

```markdown
# ADR: {decision}

Status: {proposed | accepted | superseded}
Date: {YYYY-MM-DD}

## Context
{forces and constraints}

## Decision
{what we chose}

## Alternatives
- {option}: {tradeoff}

## Consequences
- {positive}
- {negative or risk}
```

## Red Flags

- Public API changes but docs remain unchanged.
- Docs explain what changed instead of what is true.
- Architectural decision is hidden in chat or commit message only.
- README setup no longer matches commands/config.
- ADR records a trivial decision that does not need durable rationale.

## Verification

- [ ] Affected docs were found or absence was documented.
- [ ] Public/API/setup changes are reflected.
- [ ] ADR exists for durable architecture decisions.
- [ ] Docs match code and plan/fix artifacts.
