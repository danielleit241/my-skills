Run adversarial review against an existing plan or feature description: $ARGUMENTS

This subcommand runs Step 6 (Red-team) in isolation.
Use it when you have an existing plan and want a focused adversarial pass without redoing the full pipeline.

`$ARGUMENTS` can be:
- A feature name → look for `docs/plans/<slug>.md` first, fall back to the current conversation context
- A file path → read that file directly
- Empty → red-team the most recent plan in the current conversation

---

## Red-team Process

For each item below, state:

1. The **failure mode** (what breaks, for whom, under what condition)
2. Whether the plan **mitigates** it, **partially mitigates** it, or **leaves it open**
3. A **suggested fix** if unmitigated (one sentence — no code)

### Permission / Ownership

- Who can call this endpoint that the design did not intend?
- Can a lower-privilege caller reach this by crafting a valid but unauthorized request?
- Are ownership checks inside the service, or only at the route level?

### Concurrent Mutation

- What happens if two requests modify the same record simultaneously?
- Is there optimistic concurrency control (row version / ETag / conditional updates)?
- Is there a window where soft-delete + re-create produces a duplicate?

### Invalid State Transitions

- Which entity states make this operation illegal? (e.g. completed order, archived record)
- Does the plan enforce these transitions, or assume the client will not attempt them?

### Migration Safety

- Is this a new table, new column, or logic-only change?
- If new NOT NULL column: is there a default? Will the migration apply cleanly on existing data?
- Is the migration reversible without data loss?

### Missing Business Rules

- List every constraint in `docs/requirements/` that this feature touches
- For each: is it enforced in the plan? If not, flag it

### Scope Creep / Over-engineering

- Does any step in the plan add complexity beyond what the requirement asks?
- Is there a simpler path that achieves the same outcome?

---

## Output Format

```
## Red-team Report: <Feature Name>

### [Risk Category]
**Failure mode**: ...
**Mitigation status**: Mitigated / Partial / Open
**Suggested fix** (if open): ...
```

End with a **Risk Summary** table:

| Risk | Status | Priority |
| ---- | ------ | -------- |
| ...  | Open / Mitigated / Partial | High / Med / Low |

---

Do not rewrite the plan — only report findings.
Flag open risks that block implementation vs. risks that can be deferred.
