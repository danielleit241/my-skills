Summarize the codebase and create an overview document.

## What to cover

Read the codebase and produce a clear summary covering:

### 1. Project purpose
- What problem does this system solve?
- Who are the users? (derive from role constants, auth config, and API surface)

### 2. Domain model
- List all aggregates/entities
- Group by domain (e.g. User/Auth, Orders, Products, Inventory)
- Note key relationships between entities

### 3. API surface
- List all route groups / resource endpoints
- For each group: what it manages, who can access it (roles/permissions)

### 4. Key architectural decisions
- Layer structure and responsibilities
- Patterns enforced (e.g. soft delete, pagination, RBAC, async-only)
- External dependencies (DB, cache, email, storage, payment, etc.)

### 5. What's missing / in progress
- TODOs in code
- Entities with no endpoints yet
- Features partially implemented or stubbed out

## Output format

Write the summary to `docs/OVERVIEW.md` (create if absent, overwrite if present).

Keep it under 200 lines — scannable, not exhaustive. Use bullet lists and short sentences. A new team member should be able to read this in 5 minutes and know where to start.
