# Phase Planning

Use the dependency graph to create small, verifiable phases that can be cooked
without re-opening product decisions.

## Dependency Order

```text
Foundation -> Features -> Surface -> Ship
```

- **Foundation**: migrations, shared types/contracts, config, low-level services.
- **Features**: business behavior, endpoints, workflows, integrations.
- **Surface**: UI, CLI, docs, public behavior, release switches.
- **Ship**: verification, rollback, changelog, release artifacts.

## Vertical Slice Rule

Prefer phases that deliver one working path end to end. Avoid horizontal phases
that create all schema first, all APIs second, and all UI last unless the
dependency graph makes that unavoidable.

## Phase Sizing

| Size | Files | Rule |
| --- | --- | --- |
| S | 1-2 | Good default for risky or unfamiliar areas |
| M | 3-5 | Good default for normal feature slices |
| L | 6-8 | Allowed only with clear ownership and tests |
| XL | 9+ | Split before cook |

Split a phase when:

- it spans independent subsystems
- acceptance criteria need more than 3 bullets
- it mixes migration, behavior, and UI without a working checkpoint
- it cannot be reviewed from a focused diff

## Checkpoints

Add a checkpoint after every 2-3 implementation phases:

```markdown
## Checkpoint: After Phase N
- [ ] All planned verification for completed phases passes
- [ ] Design Contract still holds
- [ ] Review findings resolved or documented
- [ ] User approval before continuing if scope/risk changed
```

## Touchpoints

For each phase, record likely files, modules, contracts, or tests involved. Use
touchpoints to focus cook/review context, not to promise exclusive ownership.
