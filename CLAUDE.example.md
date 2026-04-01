# CLAUDE.md — Backend Project

> Copy this file to your backend project root as `CLAUDE.md`.
> Fill in the Stack section and remove comments that don't apply.

---

## Project Stack

| Concern      | Technology                             |
| ------------ | -------------------------------------- |
| Language     | <!-- e.g. C#, Go, Python, Node.js --> |
| Framework    | <!-- e.g. ASP.NET Core, FastAPI, Express, Gin --> |
| API style    | <!-- REST / GraphQL / gRPC -->         |
| ORM / DB     | <!-- e.g. EF Core, GORM, SQLAlchemy, Prisma, TypeORM --> |
| DB engine    | <!-- e.g. PostgreSQL 16, MySQL 8, SQLite --> |
| Validation   | <!-- e.g. FluentValidation, Zod, Pydantic, Joi --> |
| Auth         | <!-- e.g. JWT Bearer + RBAC, OAuth2, session-based --> |
| Logging      | <!-- e.g. Serilog, Zap, structlog, Winston --> |
| Caching      | <!-- e.g. Redis, in-memory -->         |
| Test runner  | <!-- e.g. xUnit, pytest, Jest, Go test --> |

---

## Solution Layout

```
src/
├── domain/          → Entities, repository interfaces, domain constants
├── application/     → Services, DTOs, validators, mappings, error messages
├── infrastructure/  → DB/ORM, repo implementations, external services
├── common/          → Response envelope, pagination, global error handler
└── api/             → HTTP endpoints, routing, auth, bootstrapping
```

### Dependency Rule

```
Api → Application → Domain
Infrastructure → Application + Domain
Common ← (used by all layers)
```

Dependencies flow **inward only**. Inner layers never import outer layers.

---

## Core Rules — Non-Negotiable

1. **No mapping libraries for business objects** — use explicit mapping functions (`toResponse()`, `toEntity()`, `applyUpdate()`)
2. **No magic strings** — constants for roles, statuses, error codes, domain values
3. **Always async** — never block threads (`.Result`, `.Wait()`, sync-over-async)
4. **Always soft delete** — set `deleted_at`, never hard-delete unless explicitly required
5. **Always paginate lists** — no unbounded collections from any API endpoint
6. **Business logic in Application layer** — not in endpoints, not in DB layer
7. **Fail fast** — validate at entry points; never let invalid state propagate deep

---

## Architecture — Layer Responsibilities

### Domain — _What exists_

- Entities (state + simple invariants, no HTTP or DB dependencies)
- Repository interfaces (`IUserRepository`, `IGenericRepository<T>`)
- Domain constants (roles, statuses, allowed values)

**Must NOT contain:** DTOs, ORM query builders, HTTP types, references to Application or Infrastructure.

### Application — _What to do_

- Services: orchestrate repos + external services, return response envelopes
- DTOs: request/response shapes
- Validators: structural rules at entry points only
- Mappings: explicit conversion functions
- Error/message constants: all user-facing error codes defined here

**Must NOT contain:** DB context, ORM queries, HTTP context, endpoint registration.

### Infrastructure — _How to persist / communicate_

- ORM context, configurations, migrations
- Repository implementations
- External service clients (email, storage, payment, SMS)

**Must NOT contain:** Business rules, DTOs, endpoint logic.

### Api — _How to expose_

- Route/endpoint definitions (one module per resource)
- Thin handlers: parse → validate → call service → return
- Bootstrapping: DI wiring, middleware, route groups

**Must NOT contain:** Business logic, direct DB access, complex data transformation.

### Common — _Plumbing_

- Response envelope (`ApiResponse<T>`, success/failure helpers)
- Pagination request/response types
- Global error handler / exception middleware
- Shared interfaces (`ICurrentUser`, `ICacheService`)

---

## API Design

### Routes

```
GET    /api/v1/{resources}          → paginated list
GET    /api/v1/{resources}/{id}     → single item
POST   /api/v1/{resources}          → create
PUT    /api/v1/{resources}/{id}     → full update
PATCH  /api/v1/{resources}/{id}     → partial update
DELETE /api/v1/{resources}/{id}     → soft delete
POST   /api/v1/{resources}/{id}/{action}  → sub-action
```

**URL depth:** max 3 levels after base. If deeper, flatten under a top-level resource.

### Response Contract

Every endpoint returns the same envelope:

```json
{
  "isSuccess": true,
  "statusCode": 200,
  "code": null,
  "message": "Resource created successfully.",
  "data": { },
  "meta": null
}
```

On failure:

```json
{
  "isSuccess": false,
  "statusCode": 404,
  "code": "RESOURCE_NOT_FOUND",
  "message": "The requested resource was not found.",
  "data": null,
  "meta": null
}
```

On validation failure — include `meta.errors`:

```json
{
  "isSuccess": false,
  "statusCode": 400,
  "code": "VALIDATION_ERROR",
  "message": "Validation failed.",
  "data": null,
  "meta": {
    "errors": [{ "field": "email", "message": "Email is required.", "code": "EMAIL_REQUIRED" }]
  }
}
```

### HTTP Status Codes

| Situation                          | Code |
| ---------------------------------- | ---- |
| Success                            | 200  |
| Created                            | 201  |
| No content (delete)                | 204  |
| Validation / business rule failure | 400  |
| Unauthenticated                    | 401  |
| Forbidden (wrong role / ownership) | 403  |
| Not found                          | 404  |
| Conflict (duplicate)               | 409  |
| Unhandled exception                | 500  |

### Validation Flow

Two separate layers — never mix:

```
1. Structural validation (handler level)
   → required fields, format, length, type
   → on failure: 400 VALIDATION_ERROR

2. Business validation (service level)
   → uniqueness, FK existence, state transitions, ownership
   → on failure: appropriate status code + error code constant
```

### Authorization

- Auth check on every non-public route
- **Route-level:** required role check
- **Resource-level:** ownership check inside the service

---

## Code Quality

### SOLID Quick Reference

| Principle | Rule |
| --------- | ---- |
| SRP | One class, one reason to change |
| OCP | Extend with new classes, don't modify existing |
| LSP | Subtypes must be substitutable — never override to throw |
| ISP | Small focused interfaces over fat ones |
| DIP | Depend on abstractions; inject via constructor |

### Clean Code Rules

- **Guard clauses at top** — fail fast, keep happy path flat
- **Methods ≤ 20 lines** — extract if longer
- **Meaningful names** — no abbreviations, no magic numbers
- **Constants** — for error codes, roles, statuses, domain values
- **No silent catch blocks** — unexpected exceptions surface to global handler
- **Comments explain "why"** — not "what" (code explains "what")
- **YAGNI** — no features beyond what is asked

---

## Performance

- **Paginate all lists** — clamp `pageSize` to max (e.g. 100), default to 20
- **No-tracking for reads** — disable change tracking on read-only queries
- **Filter soft-deleted rows** — `WHERE deleted_at IS NULL` on every query
- **Eager load related data** — prevent N+1 with joins/includes
- **Parallel async calls** — use `Promise.all` / `Task.WhenAll` for independent I/O
- **Index FK and filter columns** — use partial indexes for soft-delete tables
- **Cache-aside** — stable reference data only; invalidate after mutation
- **One commit per logical operation** — not per entity

### N+1 Red Flags

- Looping over a list and querying per item
- Accessing a navigation property outside the original query scope
- `SELECT *` on large tables without projection

---

## Testing

### Test Pyramid

```
E2E (10%)          — critical user flows, full stack
Integration (20%)  — real DB, real HTTP, endpoint behavior
Unit (70%)         — services, validators, domain logic (mocked repos)
```

### Naming Convention

`method_scenario_expectedResult`

Examples: `createOrder_withValidRequest_returnsCreatedOrder`, `createOrder_whenProductNotFound_returns404`

### Rules

- **AAA pattern:** Arrange → Act → Assert
- **One scenario per test** — one Act, one logical concern
- **No shared mutable state** — each test starts fresh
- **Deterministic** — no `sleep()`, mock the clock for time-dependent behavior
- **Mock interfaces, not concretions** — domain entities stay real
- **Integration tests use real DB** — Testcontainers or a dedicated test instance
- Run migrations before tests; use transaction rollback or table truncation between tests

### Coverage Targets

- **80%+** overall
- **100%** on auth paths, payment flows, and data-write paths
- Fail CI builds on threshold drop

---

## Migrations

- **Never write migration SQL manually** — always use your ORM's migration tool
- **Commit migration files together** with the entity change that triggered them
- **Use idempotent SQL** for data backfills: `IF NOT EXISTS`, `ON CONFLICT DO NOTHING`
- **Deploy order:** apply migrations to production DB _before_ deploying new code

---

## Checklist — Adding a New Feature

```
Domain
[ ] Entity in domain/entities/
[ ] Repository interface in domain/repositories/
[ ] Domain constants if needed

Application
[ ] Service interface
[ ] Service implementation
[ ] Request + response DTOs
[ ] Mapping functions (toResponse, toEntity)
[ ] Validator (structural rules only)
[ ] Error message constants
[ ] Service registered in DI

Infrastructure
[ ] Repository implementation
[ ] ORM entity configuration
[ ] Migration (if schema changes)
[ ] External service client (if needed)

Api
[ ] Endpoint / route handler (thin — validate → service → return)
[ ] Route registered in bootstrapping

Tests
[ ] Unit tests for service (happy path + each failure case)
[ ] Unit tests for validator (valid + each invalid case)
[ ] Integration tests for endpoint (create/update/delete + auth)
[ ] All tests green

Review
[ ] No business logic in handler or infrastructure
[ ] No direct DB access from Api layer
[ ] All list endpoints paginated
[ ] Soft delete applied (not hard delete)
[ ] No magic strings — constants used
[ ] Response uses shared envelope shape
[ ] Auth check applied to non-public routes
[ ] Ownership check in service (not handler)
```
