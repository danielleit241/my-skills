Create initial documentation structure for this project.

## Scaffold `docs/` layout

Create the following structure if it does not exist:

```
docs/
├── requirements/
│   ├── vision.md          — project goals, stakeholders, success criteria
│   ├── scope.md           — in-scope features, out-of-scope items
│   ├── user-stories.md    — user roles and their key workflows
│   └── constraints.md     — tech constraints, compliance, performance requirements
├── architecture/
│   ├── domain-model.md    — aggregates, entities, value objects, relationships
│   ├── layers.md          — layer responsibilities and dependency rules
│   ├── integrations.md    — external services (email, storage, auth, payment, etc.)
│   └── decisions/         — ADRs (Architecture Decision Records)
│       └── adr-001-template.md
├── design/
│   └── 01-<module>.md     — one file per major domain module (e.g. 01-user-auth.md)
└── plans/                 — implementation plans (created by /ck:plan:archive)
```

## What to populate

1. **Read** the entity/model definitions to derive the domain model
2. **Read** the route/endpoint definitions to list all exposed API surfaces
3. **Read** existing config files (CLAUDE.md, README, package.json, etc.) for architectural context
4. Populate each file with what is derivable from the code — do not invent requirements
5. Mark any section `<!-- TODO: confirm with team -->` where intent is unclear from code alone

## ADR template (`adr-001-template.md`)

```markdown
# ADR-001: [Decision Title]

**Status**: Proposed / Accepted / Deprecated
**Date**: YYYY-MM-DD

## Context
What problem are we solving?

## Decision
What did we decide?

## Consequences
What becomes easier or harder as a result?
```

Do not create files that are already present. Update them instead.
