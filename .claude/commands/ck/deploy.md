Deploy the backend application.

## Prerequisites check
Before deploying, confirm:
- [ ] Build passes locally
- [ ] All tests pass locally
- [ ] All migrations are applied (run migration tool if pending schema changes)
- [ ] Environment variables / secrets are configured for the target environment
- [ ] Infrastructure is available on target (DB, cache, message broker)

## Deploy steps

### Local / Development
```bash
<start-infrastructure>   # e.g. docker compose up -d
<run-migrations>         # e.g. dotnet ef database update / alembic upgrade head / npx prisma migrate deploy
<start-app>              # e.g. task run / npm start / go run . / uvicorn main:app
```
Migrations should run automatically on startup if your app is configured that way — verify.

### Container / Docker
```bash
docker build -t <app-name>:<tag> .
docker run -p <port>:<port> \
  -e DATABASE_URL="..." \
  -e REDIS_URL="..." \
  -e JWT_SECRET="..." \
  <app-name>:<tag>
```

### CI/CD / Cloud
Follow your project's deployment pipeline (GitHub Actions, GitLab CI, etc.).
Check `/.github/workflows/` or equivalent for the defined deploy workflow.

## Verify deployment
1. Health check: `GET /health` → 200
2. API docs (if applicable): `<host>:<port>/docs` or `/swagger` or `/scalar`
3. Logs: check your logging aggregator (Seq, Datadog, CloudWatch, etc.)
4. Smoke test: run 1–2 critical API calls manually

## If something goes wrong
- Check startup logs — migration errors, missing env vars, and connection failures surface there
- Confirm the database is reachable and credentials are correct
- Verify the correct image/artifact version was deployed
- Check for port conflicts or network configuration issues
- Roll back to the previous known-good deployment if the issue can't be resolved quickly
