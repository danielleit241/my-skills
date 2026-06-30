# Ship Readiness Checks

Use these checks to decide whether shipping is ready, not ready, or ready only
with explicitly accepted risk.

## Check Outcomes

| Check | READY | NOT READY |
| --- | --- | --- |
| Scope | Diff matches Design Contract, fix report, or stated intent | Unplanned behavior or unexplained files |
| Verification | Fresh build/test/lint/typecheck evidence passes | Missing, stale, or failing verification |
| Review | code-review has no unresolved critical/high findings | Missing review or blocking findings |
| Docs | User-facing/API/setup changes documented | Public behavior changed with no docs |
| Risk | Residual risk listed and acceptable | User-data/auth/migration risk unowned |
| Rollback | Revert path and caveats known | No safe rollback or data caveat hidden |
| Version | Release metadata matches package/changelog/tag | Version/changelog/tag mismatch |

## Risk Acceptance

Only the user can accept risk. When asking, quote the exact risk:

```text
Ship with accepted risk?
Risk: {specific risk}
Impact: {specific consequence}
Rollback: {available or unavailable}
```

Do not bundle multiple risks into a vague approval.

## Blocker Routing

- Scope blocker -> `/ck:plan` or revise active plan
- Verification blocker -> `/ck:cook` or `/ck:fix`
- Review blocker -> `code-review` fix/re-review cycle
- Docs blocker -> `docs-manager`
- Risk/rollback blocker -> human decision or release plan update
