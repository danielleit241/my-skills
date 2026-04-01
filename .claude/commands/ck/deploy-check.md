Check deployment readiness for the current project.

Run each check and report pass/fail with a short explanation for any failure.

## Checklist

### Build
```bash
<your-build-command>
# Examples: dotnet build / npm run build / go build ./... / mvn package
```
Must complete with 0 errors.

### Tests
```bash
<your-test-command>
# Examples: dotnet test / npm test / pytest / go test ./...
```
All tests must pass. Integration tests may require infrastructure (DB, cache) to be running.

### Pending migrations
Check if there are unapplied database migrations:
```bash
<your-migration-status-command>
# Examples:
#   dotnet ef migrations list
#   alembic current / alembic heads
#   npx prisma migrate status
#   rails db:migrate:status
```
Flag any migration that shows as pending/not applied.

### Environment variables
Verify that required env vars are set for the target environment. Common ones:
- Database connection string
- Cache connection string (if applicable)
- Auth secret / JWT signing key
- External service API keys (email, storage, payment)
- Log aggregation endpoint (prod)

Check your `.env.example` or deployment docs for the full list.

### Git status
```bash
git status
git log origin/main..HEAD --oneline
```
No uncommitted changes. All commits pushed to remote.

### Infrastructure
Verify required services are reachable (DB, cache, message broker if applicable):
```bash
# Examples:
docker ps                          # check containers running
pg_isready -h localhost -p 5432    # check PostgreSQL
redis-cli ping                     # check Redis
```

## Output format

Report each section as `✓ PASS` or `✗ FAIL: <reason>`.

Summarize at the end: **ready to deploy** or **blocked** (list blockers).
