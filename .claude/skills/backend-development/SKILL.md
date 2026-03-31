---
name: backend-development
description: >
  Universal backend engineering guide — language and framework agnostic. Use when touching
  any backend work: adding entities/models, services, validators, or endpoints; writing or
  fixing tests; reviewing architecture or code quality; fixing performance or N+1 issues;
  adding DB migrations; or any task involving layers, response contracts, or domain constants.
  Covers Clean Architecture, REST design, SOLID, query hygiene, and testing. When in doubt
  about where code goes or how to structure a feature, consult this skill.
  References: api-design, architecture, code-quality, performance, testing.
---

# Backend Development — Universal Guide

Apply standards, patterns, and conventions for backend systems. Language and framework agnostic — adapt examples to your stack. Load only the references needed for the task.

## References

| Situation                                        | When to load           | File |
| ------------------------------------------------ | ---------------------- | ---- |
| New endpoint or API module                       | API design, routes     | `references/api-design.md` |
| Where code lives, layer structure                | Architecture decisions | `references/architecture.md` |
| SOLID, patterns, clean code, refactoring         | Code quality           | `references/code-quality.md` |
| Slow queries, N+1, caching, pagination           | Performance            | `references/performance.md` |
| Unit/integration tests, coverage                 | Testing                | `references/testing.md` |

---

## Decision Tree

```
TASK?
│
├─ New feature / endpoint
│  ├─ Where does it live?          → references/architecture.md
│  ├─ How to structure the API?    → references/api-design.md
│  └─ Service + validation code?   → references/code-quality.md
│
├─ Code review / quality check
│  ├─ Architecture violations?     → references/architecture.md
│  ├─ API contract issues?         → references/api-design.md
│  └─ Code style / patterns?       → references/code-quality.md
│
├─ Performance issue
│  └─ Slow query / N+1 / memory    → references/performance.md
│
├─ Writing or reviewing tests
│  └─ Unit, integration, E2E       → references/testing.md
│
└─ All of the above
   └─ Read relevant reference(s) before writing code
```

---

## Stack (Fill in per project)

| Concern      | Technology (adapt to your project)              |
| ------------ | ----------------------------------------------- |
| Language     | e.g. C#, Go, Python, Node.js, Java, Rust        |
| API style    | e.g. REST, GraphQL, gRPC                        |
| ORM / DB     | e.g. EF Core, GORM, SQLAlchemy, Prisma, TypeORM |
| Validation   | e.g. FluentValidation, Zod, Pydantic, Joi       |
| Auth         | e.g. JWT Bearer + RBAC, OAuth2, session-based   |
| Logging      | e.g. Serilog, Zap, structlog, Winston           |
| Caching      | e.g. Redis, Memcached, in-memory                |
| Test runner  | e.g. xUnit, pytest, Jest, Go test               |
| Task runner  | e.g. Taskfile, Make, npm scripts, Just          |

---

## Solution Layout (Clean Architecture)

Generic 5-layer layout. Adapt project names to your repo.

```
src/
├── domain/          → Entities, repository interfaces, domain constants — no external deps
├── application/     → Services, DTOs, validators, mappings, error messages
├── infrastructure/  → DB/ORM, repo implementations, external services (email, storage, etc.)
├── common/          → Shared utils (response envelope, pagination, middleware)
└── api/             → HTTP endpoints, routing, auth, bootstrapping
```

---

## Core Rules (Non-Negotiable)

1. **No mapping libraries for business objects** — explicit mapping methods only (`toResponse()`, `toEntity()`)
2. **No magic strings** — use constants for status codes, roles, error codes, and domain values
3. **Always async** — never block threads (`.Result`, `.Wait()`, sync-over-async)
4. **Always soft delete** — set `deleted_at`, never hard-delete unless explicitly required
5. **Always paginate lists** — never return unbounded collections from APIs
6. **Layer boundaries** — business logic in application layer, not in endpoints or DB layer
7. **Fail fast** — validate at entry points; never let invalid state propagate deep into the system

---

## Related

- **Refs:** See References table; load only what the task needs.
- **Other skills:** `code-review` for review feedback and verification gates.
