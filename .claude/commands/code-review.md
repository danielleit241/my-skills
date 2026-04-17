---
description: Code review — local uncommitted changes or GitHub PR (pass PR number/URL for PR mode)
argument-hint: [pr-number | pr-url | blank for local review]
---

# Code Review — ResearchHub (.NET)

**Input**: $ARGUMENTS

---

## Mode Selection

If `$ARGUMENTS` contains a PR number, PR URL, or `--pr`:
→ Jump to **PR Review Mode**.

Otherwise:
→ Use **Local Review Mode**.

---

## Local Review Mode

Review uncommitted C# changes against ResearchHub conventions.

### Phase 1 — GATHER

```bash
git diff --name-only HEAD
```

If no changed files, stop: "Nothing to review."

Filter to `.cs` files. Read each changed file **in full** — not just the diff hunks.

### Phase 2 — REVIEW

Apply the checklist across these categories:

#### CRITICAL — Security & Data Integrity

- **Hardcoded secrets** — keys/passwords/connection strings in source
- **SQL injection** — `FromSqlRaw` with string interpolation
- **Missing authorization** — endpoint without `.RequireAuthorization()` or `AllowAnonymous()`
- **Hard delete** — `dbContext.Remove()` is banned; must use `entity.DeletedAt = DateTime.UtcNow`
- **Stack traces in responses** — `Results.Problem(detail: ex.ToString())` — use `AppMessages.*`
- **Secrets in logs** — passwords, OTPs, tokens logged in plaintext
- **DRY violation** — duplicate logic that should be extracted to a helper/service

#### HIGH — ResearchHub Constraints

- **Missing `ValidateRequest`** — POST/PUT/PATCH handlers must call `req.ValidateRequest(validator, out var validationResult)` before the service call
- **Missing `ApiResponse<T>`** — all public endpoint responses must go through `.ToHttpResult()`
- **Wrong validator message** — must use `WithValidatorMessage(ValidatorMessages.X)`, not bare `.WithMessage()` + `.WithErrorCode()`
- **Soft-delete filter missing** — queries on soft-deletable entities must filter `DeletedAt == null`
- **Caller identity via HttpContext** — must use `ICurrentUserService`, not `ctx.User.FindFirstValue` directly
- **Blocking async** — `.Result`, `.Wait()`, `.GetAwaiter().GetResult()` — always `await`
- **Missing `CancellationToken`** — async public methods must accept and pass `ct`

#### HIGH — Code Quality

- **Empty catch blocks** — `catch { }` — handle, log, or rethrow
- **Large methods** (>50 lines) — extract helpers
- **Deep nesting** (>4 levels) — use guard clauses / early returns
- **N+1 EF queries** — fetching related data in a loop without `Include`

#### MEDIUM — Patterns

- **AutoMapper usage** — banned; use static `ToEntity()` / `ToResponse()` extensions
- **MediatR usage** — banned; call `IUnitOfWork` repositories directly
- **`[FromQuery]` on list endpoints** — must inherit `PaginationRequest` with `[AsParameters]`
- **Missing `AsNoTracking`** — read-only EF queries should use `.AsNoTracking()`
- **Missing `SaveChangesAsync`** — mutations must call `_uow.SaveChangesAsync(ct)` after changes
- **Endpoint nesting > 3 levels** — flatten to independent resource (api-design rule)
- **Wrong GlobalUsings** — new namespaces must be added to `GlobalUsings.cs`; `Application/GlobalUsings.cs` must not import Infrastructure types

#### LOW

- **Nullable suppression `!`** — investigate root cause, don't suppress
- **Magic role strings** — use `RoleConstants.*`, not hardcoded `"Admin"`
- **TODO without ticket** — must reference a tracked issue

### Phase 3 — VALIDATE

```bash
dotnet build src/ResearchHub.Api --no-restore -q
task test:unit
```

Report pass/fail for build and tests.

### Phase 4 — REPORT

```
[CRITICAL] Missing soft delete
File: src/ResearchHub.Application/Services/Project/ProjectService.cs:87
Issue: `_uow.Projects.Remove(project)` — hard delete is banned.
Fix: project.DeletedAt = DateTime.UtcNow; project.DeletedBy = callerId;

---
## Review Summary

| Severity | Count |
|----------|-------|
| CRITICAL | 0     |
| HIGH     | 1     |
| MEDIUM   | 2     |
| LOW      | 0     |

Build: PASS
Tests: PASS

Verdict: WARNING — 1 HIGH issue should be resolved before merge.
```

**Decision rules**:

- **Approve**: No CRITICAL/HIGH, build + tests pass
- **Warning**: HIGH issues only (can merge with caution)
- **Block**: Any CRITICAL issue or build failure

---

## PR Review Mode

### Phase 1 — FETCH

Parse input:

| Input                          | Action            |
| ------------------------------ | ----------------- |
| Number (e.g. `42`)             | Use as PR number  |
| URL (`github.com/.../pull/42`) | Extract PR number |

```bash
gh pr view <NUMBER> --json number,title,body,author,baseRefName,headRefName,changedFiles,additions,deletions
gh pr diff <NUMBER>
```

### Phase 2 — CONTEXT

1. Read `CLAUDE.md` for project constraints
2. Parse PR description for goals and linked issues
3. List changed `.cs` files

### Phase 3 — REVIEW

Read each changed file **in full**. Apply the same checklist from Local Review Mode.

Additionally check:

- **Migration safety** — new NOT NULL columns must have defaults or be nullable
- **RBAC correctness** — roles used in `.RequireRole()` exist in `RoleConstants`
- **No missing migration** — if entity changed, check for new migration file

### Phase 4 — VALIDATE

```bash
dotnet build src/ResearchHub.Api --no-restore -q
task test:unit
```

### Phase 5 — PUBLISH

```bash
# Approve
gh pr review <NUMBER> --approve --body "<summary>"

# Request changes
gh pr review <NUMBER> --request-changes --body "<summary with required fixes>"

# Comment only (draft PR)
gh pr review <NUMBER> --comment --body "<summary>"
```

For inline comments:

```bash
gh api "repos/{owner}/{repo}/pulls/<NUMBER>/comments" \
  -f body="<comment>" \
  -f path="<file>" \
  -F line=<line-number> \
  -f side="RIGHT" \
  -f commit_id="$(gh pr view <NUMBER> --json headRefOid --jq .headRefOid)"
```

### Phase 6 — OUTPUT

```
PR #<NUMBER>: <TITLE>
Decision: <APPROVE | REQUEST CHANGES | BLOCK>

Issues: <critical> critical, <high> high, <medium> medium, <low> low
Build: PASS / FAIL
Tests: PASS / FAIL

Next steps: <contextual suggestions>
```

## Related Agents

This command invokes the `code-reviewer` agent provided by ECC.

For manual installs, the source file lives at:
`agents/code-reviewer.md`
