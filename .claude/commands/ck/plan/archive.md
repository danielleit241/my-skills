Save the current plan to the docs archive: $ARGUMENTS

This subcommand runs AFTER a plan has already been produced in the conversation.
It does NOT re-run the planning pipeline — it only persists the plan output.

---

## Behavior

1. **Determine slug** from `$ARGUMENTS` or infer from the feature name in the plan.
   - Slug format: lowercase, hyphen-separated (e.g. `user-auth`, `order-checkout`, `product-search`).

2. **Resolve output path**: `docs/plans/<slug>.md`
   - If `docs/plans/` does not exist, create it.
   - If the file already exists, confirm with the user before overwriting.

3. **Write the plan** to that file using this header:

```markdown
---
feature: <feature name>
date: <today's date>
status: draft
---

# Plan: <Feature Name>

<plan content verbatim from the conversation>
```

4. **Confirm** to the user: file path written, word count, status field.

---

Do not re-generate or summarize the plan — archive it exactly as produced.
Do not open the file in the editor or run any build commands.
