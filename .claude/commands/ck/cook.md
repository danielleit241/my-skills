Implement the following feature: $ARGUMENTS

---

## Flags

Parse `$ARGUMENTS` for flags before starting. Default mode is `--auto`.

| Flag            | Effect                                                                         |
| --------------- | ------------------------------------------------------------------------------ |
| `--auto`        | Run all phases without pausing. Default.                                       |
| `--interactive` | Pair programming mode — pause for user confirmation between each phase.        |
| `--fast`        | Skip deep planning. Single-pass scout, Analyze only (no Design/Plan output).   |
| `--parallel`    | Run Scout + Analyze as concurrent agents via the Agent tool.                   |

> `--interactive` takes precedence over `--parallel` at checkpoints.
> `--fast` and `--parallel` are additive and can be combined.

---

## Phase 1 — Scout

Invoke `/ck:scout` with the feature name and keywords from `$ARGUMENTS`.

Goal: locate the closest existing feature, identify entities/services/repos touched, note conventions in use (naming, response shapes, validator patterns, query style).

**`--fast`**: single targeted query; stop at first clear match.
**`--parallel`**: launch Scout as a concurrent Agent subagent alongside Phase 2 Analyze.

> **`--interactive` checkpoint**: report Scout findings and wait for user confirmation before continuing.

---

## Phase 2 — Plan

Inline planning phase. Do NOT write implementation code here — only design.

### Analyze

- **Module / Domain**: which bounded context owns this?
- **Entities involved**: list each model/table touched — read, written, or newly created
- **Current state**: what exists today vs. what must be added
- **Assumptions**: call out anything inferred, not confirmed — flag explicitly
- **Open questions**: anything that blocks design and needs a decision first

**`--fast`**: stop after Analyze. Proceed to Phase 3 with scope only — skip Design and Steps below.
**`--parallel`**: if Scout was launched as a concurrent agent, wait for its result before Analyze.

### Design

**API Contract**

- Route, HTTP method, request body shape, response body shape
- HTTP status codes for success and each distinct failure case
- Required auth roles / permissions

**Data Flow**

```
Request → Validation → Handler → Service → Repository → DB
                                         ↓
                                    Response shape
```

Note any async side-effects (cache invalidation, file ops, events).

**Interfaces / Contracts**

- New repository method signatures
- New service method signatures
- New or changed DTOs / request-response types

### Implementation Steps

Ordered, layer-by-layer. Each step names the exact file and what changes.

```
N. [Layer] File — what to add/change
   Depends on: (step numbers or "none")
```

Layer order: Domain → Application → Infrastructure → API

> **`--interactive` checkpoint**: present Design + Steps and wait for user approval before Phase 3.

---

## Phase 3 — Implement

Execute the implementation steps from Phase 2 in layer order.

Conventions to follow (non-negotiable):
- No business logic in route handlers — delegate to service layer
- No raw string literals for status codes, roles, or error messages — use constants
- Always async — never block threads
- Soft delete where applicable (set `deleted_at`, never hard delete)
- Always paginate list endpoints
- Validate at entry points; let unexpected exceptions surface to global error handler

**`--parallel`**: run independent layers as concurrent Agent subagents.
**`--interactive`**: checkpoint after each layer — report what was implemented and wait before the next.

---

## Phase 4 — Test

Every new service method, validator, and endpoint requires tests. Tests run before this phase is complete.

Placement (adapt to your project structure):
- New service method → unit test in `tests/services/<Domain>/`
- New validator → unit test in `tests/validators/<Domain>/`
- New endpoint with auth or complex logic → integration test

Naming: `method_scenario_expectedResult` (e.g. `createOrder_whenProductNotFound_returns404`)

```bash
<run-tests-for-specific-class>   # targeted run first
<run-full-test-suite>            # must pass before Phase 5
```

Fix all failures before proceeding. Do not skip or weaken tests.

**`--fast`**: run targeted test only; skip full suite.

> **`--interactive` checkpoint**: report test results and wait for user confirmation before Phase 5.

---

## Phase 5 — Review

Invoke `/code-review` on all changed files.

Apply any fixes surfaced before declaring done. Do not mark the task complete with open review findings.
