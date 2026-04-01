Analyze CI/CD failure logs and create a fix plan: $ARGUMENTS

Accepts a GitHub Actions run URL (e.g. `https://github.com/owner/repo/actions/runs/123456`), a run ID, or a description of the CI failure.

## Step 1 — Fetch the failing logs

```bash
gh run view <run-id> --log-failed
```

Or read from the provided URL. Identify the exact step and error output.

## Step 2 — Classify the failure

| Type | Signal |
|---|---|
| Build failure | Compilation errors, linker errors, missing dependencies |
| Test failure | Test runner reports failed assertions |
| Workflow config | YAML parse error, missing secret, action version issue |
| Flaky test | Passes locally, intermittent in CI |
| Environment issue | DB not ready, missing env var, container startup failure |

## Step 3 — Create the fix plan

Structure the plan as:

**Root cause**: Exact file/line/configuration causing the failure.

**Why CI fails but local passes** (if applicable): environment difference (missing seed data, different runtime version, no Docker infrastructure, env vars not set, timing issues).

**Fix steps** (ordered):
1. File to change and what to change
2. Any workflow YAML changes needed
3. Test setup or seed data changes (if relevant)

**Verification**: How to confirm the fix works before pushing.

Do not implement the fix — only plan it. To proceed to implementation, use `/ck:fix` with the same description.
