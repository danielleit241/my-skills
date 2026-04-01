Update existing documentation to reflect recent code changes.

## What triggers this
- New entities/models or schema migrations added
- API routes added, removed, or renamed
- Business rules or constants changed
- Architecture decisions made (new pattern adopted, old pattern removed)
- New domain modules added

## Step 1 — Identify what changed
```bash
git log --oneline -20
git diff main...HEAD --name-only
```

Read the diff to understand the scope of changes.

## Step 2 — Update the relevant docs

| Changed area | Update this doc |
|---|---|
| New/modified entity or table | `docs/design/<module>.md` — schema + relationships |
| New API endpoint or route group | `docs/architecture/integrations.md` or module doc |
| New domain constant (roles, statuses) | `docs/architecture/domain-model.md` |
| New architectural pattern | `docs/architecture/layers.md` or new ADR |
| New business rule or constraint | `docs/requirements/user-stories.md` or `constraints.md` |

## Step 3 — Write clearly

- Document **intent**, not just structure — why a decision was made, not just what it is
- If a decision was made under constraints, note the constraint
- Keep it short: a doc no one reads is worse than no doc

## What not to change

- Do not rewrite docs that are still accurate
- Do not delete ADRs — mark deprecated ones with `**Status**: Deprecated` and explain why
- Do not add docs for things already obvious from reading the code
