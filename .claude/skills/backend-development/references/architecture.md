# Architecture Reference — Clean Architecture

Apply Clean Architecture: layered structure, strict dependency direction, single responsibility per layer.

---

## Dependency Rule

```
Api / Transport Layer       ← HTTP in/out, routing, auth, middleware
  └─ depends on → Application, Common (Infrastructure at composition root only)

Application Layer           ← Business logic, use cases, DTOs, validators, mappings
  └─ depends on → Domain, Common

Infrastructure Layer        ← Data access (ORM), external services (email, storage, etc.)
  └─ depends on → Application, Domain, Common (implements interfaces)

Domain Layer                ← Entities, repository interfaces — NO external dependencies
Common / Shared             ← Shared utilities (response envelope, pagination, errors)
```

**The rule:** Dependencies flow inward only. Nothing in the inner layers knows about outer layers. Infrastructure implements interfaces defined in Domain/Application.

---

## Layer Responsibilities

### Domain — What exists

- Entities (state + simple invariants, no HTTP or DB dependencies)
- Repository interfaces (`IUserRepository`, `IGenericRepository<T>`)
- Domain constants (roles, statuses, allowed values)
- Value objects and domain events (if applicable)

**No:** ORM attributes (beyond simple column mapping), DTOs, business orchestration, external packages.

### Application — What to do

- Services: orchestrate repositories + external services, return response envelopes
- DTOs: request/response shapes
- Validators: structural rules at entry points
- Mappings: explicit conversion functions (`toResponse()`, `toEntity()`, `applyUpdate()`)
- Error/message constants: all user-facing error codes and messages defined here
- Service interfaces registered via DI

### Infrastructure — How to persist / communicate

- ORM context, configurations, migrations
- Repository implementations
- External service clients (email, file storage, payment, SMS, etc.)
- Seed data

### Api / Transport — How to expose

- Route/endpoint definitions (one module per resource)
- Thin handlers: parse request → validate → call service → serialize response
- Bootstrapping: wire DI, middleware, route groups
- No business logic here

### Common / Shared — Plumbing

- Response envelope (`ApiResponse<T>`, success/failure helpers)
- Pagination request/response types
- Validation extension utilities
- Global error handler / exception middleware
- Shared interfaces (`ICurrentUser`, `ICacheService`, etc.)

---

## What Goes Where — Quick Reference

| Thing                          | Layer          | Location pattern                               |
| ------------------------------ | -------------- | ---------------------------------------------- |
| Entity / model class           | Domain         | `domain/entities/{Name}`                       |
| Domain constant                | Domain         | `domain/constants/{Name}Constants`             |
| Repository interface           | Domain         | `domain/repositories/I{Name}Repository`        |
| Service interface              | Application    | `application/services/interfaces/I{Name}Service` |
| Service implementation         | Application    | `application/services/{Name}Service`           |
| Request / response DTO         | Application    | `application/dtos/{module}/`                   |
| Validator                      | Application    | `application/validators/{module}/`             |
| Mapping / conversion functions | Application    | `application/mappings/{Name}Mappings`          |
| Error / message constants      | Application    | `application/constants/messages/`              |
| ORM configuration / migration  | Infrastructure | `infrastructure/persistence/`                  |
| Repository implementation      | Infrastructure | `infrastructure/repositories/{Name}Repository` |
| External service client        | Infrastructure | `infrastructure/services/`                     |
| Endpoint / route definitions   | Api            | `api/endpoints/{Module}Endpoints`              |
| App bootstrapping / DI wiring  | Api            | `api/bootstrap/`                               |

---

## Boundary Rules

**Domain must NOT contain:** DTOs, ORM query builders, HTTP types, references to Application or Infrastructure.

**Application must NOT contain:** DB context, ORM queries, HTTP context, endpoint registration, references to Infrastructure.

**Infrastructure must NOT contain:** Business rules, DTOs, endpoint logic — only persistence and external I/O.

**Api must NOT contain:** Business logic, direct DB access, complex data transformation — delegate to Application.

---

## Checklist: Adding a New Feature

```
Domain
[ ] Entity in domain/entities/
[ ] Repository interface in domain/repositories/
[ ] Domain constants if needed (roles, statuses, enum-like values)

Application
[ ] Service interface
[ ] Service implementation
[ ] Request + response DTOs
[ ] Mapping functions
[ ] Validator (structural rules only)
[ ] Error message constants
[ ] Service registered in DI

Infrastructure
[ ] Repository implementation
[ ] ORM entity configuration
[ ] Migration (if schema changes)
[ ] External service client (if needed)

Api
[ ] Endpoint / route handler
[ ] Route registered in app bootstrapping
```

---

## Migration Rules

**Never create manually** — always use your ORM's migration tool:

```bash
# Examples (adapt to your stack):
dotnet ef migrations add <Name>                    # EF Core (.NET)
alembic revision --autogenerate -m "<Name>"        # SQLAlchemy / Python
npx prisma migrate dev --name <Name>               # Prisma (Node.js)
rails generate migration <Name>                    # ActiveRecord (Ruby)
go run . migrate create -seq <name>                # golang-migrate
```

**Commit migration files together** with the entity change that triggered them.

**Use idempotent SQL** for data backfills: `IF NOT EXISTS`, `IF EXISTS`, `ON CONFLICT DO NOTHING`.

**Deploy order:** apply migrations to production DB *before* deploying new code — never after.
