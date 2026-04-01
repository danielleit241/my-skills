Alias for `/ck:plan --two`. Run the full planning pipeline with two alternative approaches for: $ARGUMENTS

Execute `/ck:plan` with the `--two` flag applied. The pipeline is identical to the main plan command with one difference: at Step 3 (Design), fork into Approach A and Approach B instead of producing a single design.

---

## Steps 1–2 (shared)

Run Scout and Analyze exactly as in `/ck:plan`. Both approaches share the same scouting context and analysis.

Supports all flags from `/ck:plan`:
- `--fast`, `--hard`, `--auto`, `--parallel`, `--no-tasks`

---

## Step 3 — Design (forked)

Produce two complete design blocks.

### Approach A — [Short Name]

**Summary**: One sentence.

**API Contract**: route, method, request/response shape, status codes, required roles.

**Data Flow**:
```
Request → Validation → Handler → Service → Repository → DB
```

**Interfaces / Contracts**: new repository methods, service methods, DTOs.

---

### Approach B — [Short Name]

_(same structure as Approach A)_

---

## Steps 4–6 (per approach)

For each approach, produce its own:

- **Plan** (Step 4): ordered implementation steps with `Depends on:` annotations
- **Validate** (Step 5): if schema or auth changes are present
- **Red-team** (Step 6): if `--hard` or mandatory risks exist

Keep steps clearly scoped to their approach (prefix with `A.` or `B.`).

---

## Recommendation

State which approach you recommend and why, given:

- Current codebase conventions and patterns (from Scout findings)
- Risk profile (from Red-team findings)
- Complexity vs. benefit trade-off

If the decision depends on something only the team knows (query volume, extensibility plans, undocumented policy), **name that dependency explicitly** — do not guess.

---

Do not write implementation code — only the plan.
Flag any assumption that needs confirmation before implementation begins.
