Run the test suite.

## Default: run all tests
```bash
<your-full-test-command>
# Examples:
#   dotnet test
#   npm test
#   pytest
#   go test ./...
#   bundle exec rspec
```

## Run specific subset
```bash
<run-unit-tests-only>
<run-integration-tests-only>
<run-tests-matching-name>       # e.g. filter by class/module name
```

Adapt to your project's test runner. Check `package.json`, `Taskfile`, `Makefile`, or `pyproject.toml` for the configured commands.

## After tests run

1. **If all pass** — confirm count and report clean.
2. **If any fail** — read the failure output carefully:
   - Is the test assertion wrong (expected behavior changed), or is the implementation broken?
   - Trace the failing test to the service/validator it covers
   - Do not delete or weaken tests to make them pass
3. **If asked to fix failures**, use `/ck:fix` for the full structured pipeline.

## Interpreting results

- Unit tests are fast and isolate logic — failures here point to service/domain bugs
- Integration tests hit real infrastructure (DB, HTTP) — check your test DB is up if connections fail
- Flaky tests (pass sometimes) need investigation, not re-runs — find the race condition or side effect
