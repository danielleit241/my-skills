Refactor the following code: $ARGUMENTS

Read the target code first. Understand why it exists before changing it.

## Goals
- Improve clarity and maintainability — not aesthetics
- Remove duplication only when the abstraction is clearly named and reused 3+ times
- No complexity for hypothetical future needs (YAGNI)

## Constraints
- Preserve all existing behavior (semantics-preserving)
- No public API contract changes (method signatures, route shapes, response shapes)
- Keep each piece in the correct architecture layer
- Preserve all auth and resource ownership checks
- Do not add features, error handling, or validation beyond what currently exists

## After refactoring — run tests
A refactor must not change behavior. Prove it with a green test run.

```bash
<run-tests-for-refactored-class>   # targeted run
<run-full-test-suite>              # if you touched shared infrastructure
```

If existing tests fail after refactoring, the refactor broke something — fix it before proceeding.
Do not update tests to make them pass unless the test was wrong to begin with (document why with a comment).

## Output
1. What the current code does (briefly)
2. What specific problems you're fixing
3. The refactored code
4. What changed and why
5. Test run result (pass/fail count)
