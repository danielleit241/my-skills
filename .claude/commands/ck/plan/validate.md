Run a validation pass against an existing plan or feature description: $ARGUMENTS

This subcommand runs Step 5 (Validate) in isolation.
Use it after a plan exists and you want a focused feasibility check without redoing the full pipeline.

`$ARGUMENTS` can be:
- A feature name → look for `docs/plans/<slug>.md` first, fall back to current conversation context
- A file path → read that file directly
- Empty → validate the most recent plan in the current conversation

---

## Validation Checks

Run each check and report **Pass**, **Fail**, or **Warning** with a one-line reason.

### Migration Safety

- [ ] Does this plan add a NOT NULL column? If yes: does it have a default or applied after backfill?
- [ ] Is the migration reversible without data loss?
- [ ] Does the migration touch a high-volume table? Flag for index review.

### Auth / Permissions

- [ ] Are the listed roles / permissions correct? (not over-permissive, not too restrictive)
- [ ] Is ownership checked inside the service in addition to the route-level policy?
- [ ] Are unauthenticated callers explicitly blocked on all non-public routes?

### Query Safety

- [ ] Does any new query produce an N+1 (missing eager load or batched query)?
- [ ] Are paginated queries using `skip`/`take` (or equivalent) with an explicit `orderBy`?
- [ ] Are any unbounded queries (no pagination, no `limit`) introduced?

### Response Contract

- [ ] Does the success response match the project's response envelope shape?
- [ ] Are all failure paths returning structured error responses with constant error codes?
- [ ] Are all new error codes added to the constants file?

### Layer Integrity

- [ ] Does business logic stay in the application/service layer — not in handlers or DB queries?
- [ ] Are new DTOs placed in the application layer (not domain or transport)?
- [ ] Does the domain layer remain free of ORM and HTTP dependencies?

---

## Output Format

```
## Validation Report: <Feature Name>

| Check | Result | Note |
|---|---|---|
| NOT NULL default | Pass | Column is nullable |
| Auth over-permissive | Warning | Admin + Editor both allowed — confirm with team |
| N+1 query | Fail | getOrders loop missing eager load for customer |
...

### Action Items
- [Fail] Fix N+1: add eager load to getOrders query in Step 4.
- [Warning] Confirm: should Editor be allowed to call DELETE /orders/{id}?
```

---

Do not rewrite the plan — only report findings and required action items.
**Fail** items block implementation. **Warning** items need team confirmation before proceeding.
