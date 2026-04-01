Investigate and fix the following issue: $ARGUMENTS

## Investigation approach

1. **Reproduce the problem** — what exact input triggers it, what is the actual vs expected behavior
2. **Trace the call path** — from API endpoint → handler → service → repository → DB (or wherever it ends)
3. **Check authorization flow** if the issue involves 401/403 (role checks, resource ownership)
4. **Check data layer** if the issue involves wrong/missing data (query, ORM behavior, index)
5. **Check validation pipeline** if the issue involves unexpected 400s or accepted invalid input
6. **Check external service integration** if the issue involves email, file storage, payment, etc.

## Diagnosis format

- **Root cause** (be specific — not "the query is wrong" but which query, which condition, and why)
- **Why it went undetected** (missing validation? wrong assumption? missing test? no coverage?)
- **Fix**

## Fix approach

- Minimal change — don't refactor surrounding code unless it is the root cause
- Fix in the correct layer (domain logic in domain/application, persistence in infrastructure, routing in API)
- If the fix touches a DB query, check for N+1 risk
- If the fix changes auth logic, verify permission checks are still correct after the fix

## After fixing — run tests

```bash
<run-tests-for-affected-class>   # fast feedback on the fixed code path
<run-full-test-suite>            # if the fix touches shared infrastructure
```

If a previously passing test now fails, the fix introduced a regression — investigate before proceeding.
