Research and create an implementation plan for: $ARGUMENTS

---

## Flags

Parse `$ARGUMENTS` for the following flags before starting. Default mode is `--auto`.

| Flag         | Effect                                                                                        |
| ------------ | --------------------------------------------------------------------------------------------- |
| `--fast`     | Shallow Scout (single pass). Skip Steps 5–6. Best for simple CRUD or low-risk changes.        |
| `--hard`     | Deep Scout across all layers. Force Steps 5 AND 6. Expand each section with more detail.      |
| `--auto`     | No confirmation pauses between steps. Run all applicable steps to completion.                 |
| `--parallel` | Run Scout + Analyze concurrently using the Agent tool.                                        |
| `--two`      | Fork at Step 3: produce Approach A + Approach B + Recommendation instead of a single design.  |
| `--no-tasks` | Do not use TodoWrite to track implementation tasks.                                           |

If no flags: run Steps 1–4 and include Steps 5–6 only when schema or auth changes are present.

Subcommands available: `/ck:plan:archive`, `/ck:plan:red-team`, `/ck:plan:validate`

---

## Step 1 — Scout

Invoke `/ck:scout` to locate the relevant code before proposing anything.

Pass the feature name or keywords as the scout target. Scout will:

- Find the closest existing feature (similar endpoint, similar entity lifecycle)
- Identify entities, repositories, and services that handle adjacent logic
- Note conventions in use: naming, response shapes, validation patterns, query style

After `/ck:scout` returns, also check:

- `docs/requirements/`, `docs/architecture/`, `docs/design/` for documented constraints

**With `--fast`**: run `/ck:scout` with a single targeted query; stop at first clear match.
**With `--hard`**: run `/ck:scout` across the full call chain. Make multiple scout passes if needed.
**With `--parallel`**: launch `/ck:scout` and Step 2 (Analyze) as concurrent agents.

---

## Step 2 — Analyze

Clarify scope and surface ambiguities before designing.

- **Module / Domain**: which bounded context owns this?
- **Entities involved**: list each model/table touched — read, written, or newly created
- **Current state**: what exists today vs. what must be added
- **Assumptions**: call out anything inferred, not confirmed. Flag explicitly.
- **Open questions**: anything that blocks design and needs a decision first

**With `--hard`**: invoke the `sequential-thinking` skill for this step. Use it to reason through the domain incrementally — revising assumptions, branching on ambiguous rules, and surfacing hidden dependencies.

---

## Step 3 — Design

Lay out the structure before listing steps.

### API Contract

- Route, HTTP method, request body shape, response body shape
- HTTP status codes for success and each distinct failure case
- Required roles / permissions (use constants, not inline strings)

### Data Flow

```
Request → Validation → Handler → Service → Repository → DB
                                          ↓
                                     Response shape
```

Note any async side-effects (cache invalidation, events, file ops).

### Interfaces / Contracts

- New repository method signatures
- New service method signatures
- New or changed DTOs / request-response types

**With `--two`**: fork here. Produce two full Design blocks (Approach A + Approach B), each with its own API Contract, Data Flow, and Interfaces. Continue Steps 4–6 per approach. Add a **Recommendation** section at the end.

---

## Step 4 — Plan

Ordered, layer-by-layer implementation steps. Each step names the **exact file** and **what changes**.

Format each step as:

```
N. [Layer] File — what to add/change
   Depends on: (step numbers this requires first, or "none")
```

Layer order: Domain → Application → Infrastructure → API

Include where applicable:

- New entity fields or new entities
- New constants (roles, statuses, error codes, messages)
- New/updated repository interface + implementation
- Service method + validation logic
- Endpoint handler + route registration
- Migration (if schema changes)

**Without `--no-tasks`**: after listing steps, emit a TodoWrite block with each step as a task.

---

## Step 5 — Validate _(skip with `--fast`; mandatory with `--hard` or schema/auth changes)_

- **Migration safety**: no silent data loss; NOT NULL columns have defaults or are nullable
- **Auth**: listed roles can actually reach this endpoint given existing middleware
- **No N+1** introduced by new queries
- **Response shape** matches the project's response envelope contract
- **Layer integrity**: business logic stays in application layer, not in handlers or DB layer

---

## Step 6 — Red-team _(skip with `--fast`; mandatory with `--hard`)_

Think adversarially. For each item: state the failure mode and whether the plan mitigates it or leaves it open.

- **Permission / ownership edge cases**: who can call this that the design did not intend?
- **Concurrent mutation**: race condition on the same record?
- **Invalid state transitions**: which entity states make this operation illegal?
- **Migration impact**: rollback safe?
- **Missing business rule**: constraint in requirements not enforced by the plan?

---

Do not write implementation code — only the plan.
Flag any assumption that needs confirmation before implementation begins.
