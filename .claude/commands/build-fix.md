# Build and Fix — ResearchHub (.NET)

Incrementally fix build and compiler errors with minimal, safe changes.

## Step 1: Run Build

```bash
task build
```

If `task build` is unavailable, fallback:
```bash
dotnet build src/ResearchHub.Api --no-restore -q
```

## Step 2: Parse and Group Errors

1. Capture output — only lines matching `: error CS\d+:` are real compiler errors
2. Group by file path
3. Fix upstream errors first (Domain → Application → Infrastructure → Api) — errors cascade

## Step 3: Fix Loop (One Error at a Time)

For each error:

1. **Read the file** — see full context around the error line
2. **Diagnose** — missing `using`, wrong type, renamed symbol, broken interface?
3. **Fix minimally** — smallest edit that resolves the error
4. **Re-run build** — verify the error is gone, no new errors introduced
5. **Move to next**

## Step 4: Guardrails

Stop and ask the user if:
- A fix introduces **more errors than it resolves**
- The **same error persists after 3 attempts** (likely a deeper structural issue)
- The fix requires **architectural changes** (not just a build fix)
- Error is caused by a **missing migration** — run `task migration:add -- <Name>` instead

## Step 5: Common .NET Error Patterns

| Error | Likely Cause | Fix |
|-------|-------------|-----|
| `CS0246` — type not found | Missing `using` or namespace not in `GlobalUsings.cs` | Add to `GlobalUsings.cs` of the affected project |
| `CS0115` — no suitable method to override | Interface changed | Update implementation to match new signature |
| `CS0161` — not all paths return | Missing return in branch | Add `return` or `throw` |
| `CS8600/CS8602` — nullable dereference | Null reference not guarded | Add `?` or null check — never suppress with `!` |
| `CS1998` — async method lacks await | Forgot `await` or method doesn't need to be async | Add `await` or remove `async` |
| `CS0103` — name not found | Wrong constant path or typo | Check `AppMessages.*`, `RoleConstants.*`, `ValidatorMessages.*` |

## Step 6: Summary

Report:
- Errors fixed (file + error code)
- Errors remaining (if any, with reason)
- Run `task test:unit` after clean build to confirm nothing regressed
