# Backend Testing — Universal Guide

Apply test pyramid, frameworks, and practices for backend testing. Adapt commands and framework names to your stack.

---

## Test Pyramid (70–20–10)

```
        /\
       /E2E\     10% — End-to-end / full-stack API tests
      /------\
     /Integr.\ 20% — Integration (real DB, real HTTP)
    /----------\
   /   Unit     \ 70% — Unit (services, validators, domain logic)
  /--------------\
```

- **Unit:** Fast, cheap, isolate logic — mock repositories and external services.
- **Integration:** Real DB (e.g. Testcontainers, test instance) — verify ORM queries, endpoint behavior.
- **E2E/API:** Full app, validate critical user flows only (expensive to run and maintain).

---

## Unit Testing

### AAA Pattern + Single Responsibility

```
// Arrange: set up dependencies, inputs, mocks
// Act: call the unit under test (SUT)
// Assert: verify the outcome

test("createOrder with valid request returns created order") {
  // Arrange
  const repo = mockRepo({ exists: false })
  const sut = new OrderService(repo, mockUoW())

  // Act
  const result = await sut.create({ productId: "p1", quantity: 2 })

  // Assert
  expect(result.isSuccess).toBe(true)
  expect(result.data.status).toBe("pending")
  expect(repo.add).toHaveBeenCalledTimes(1)
}

test("createOrder when product not found returns 404") {
  // Arrange
  const repo = mockRepo({ productExists: false })
  const sut = new OrderService(repo, mockUoW())

  // Act
  const result = await sut.create({ productId: "missing", quantity: 1 })

  // Assert
  expect(result.isSuccess).toBe(false)
  expect(result.statusCode).toBe(404)
}
```

### Test Naming

`method_scenario_expectedResult`

Examples:

- `createOrder_withValidRequest_returnsCreatedOrder`
- `createOrder_whenProductNotFound_returns404`
- `createOrder_whenQuantityExceedsStock_returns400`

### Mocking

- Mock interfaces / abstractions only — keep domain entities real
- Verify side effects explicitly (e.g. `expect(repo.save).toHaveBeenCalledOnce()`)
- Mock `save()` / `commit()` to return `void` unless testing rollback behavior

---

## Integration Testing

### HTTP + Real Database

```
// Use an application factory that wires the real app
// Replace the DB connection with a test database

class OrderApiTests {
  setup() {
    this.app = createTestApp({
      db: testDatabaseConnection    // real DB, test schema
    })
    this.client = this.app.httpClient()
  }

  test("POST /orders with valid body returns 201") {
    const res = await this.client.post("/api/v1/orders", {
      body: { productId: "p1", quantity: 2 }
    })
    expect(res.status).toBe(201)
    expect(res.body.data.status).toBe("pending")
  }
}
```

- Run migrations in test setup; clean tables between tests
- Prefer transaction rollback per test over truncating tables
- Expose enough of your app bootstrapping to create a test version

### Test Containers (Isolated DB)

```
// Spin up a real DB in Docker for integration tests
// Example with Testcontainers (available for most languages):
const container = await new PostgresContainer("postgres:16-alpine").start()
const connString = container.getConnectionString()
// Run migrations, seed test data, run tests, stop container
```

Use the same major DB version as production to avoid version-specific behavior differences.

---

## Validator Tests

Test structural validators in isolation — one `[Theory]` per rule, cover valid + invalid cases.

```
// Test: email field validation
const cases = [
  { input: null,            valid: false },
  { input: "",              valid: false },
  { input: "not-an-email",  valid: false },
  { input: "user@test.com", valid: true  },
]

for (const { input, valid } of cases) {
  const result = validator.validate({ email: input })
  expect(result.isValid).toBe(valid)
}
```

---

## Code Coverage Targets

- **80%+ overall** across all services and validators
- **100%** on auth paths, payment flows, and data-write paths
- Run coverage in CI; fail builds on threshold drop

```bash
# Examples (adapt to your stack):
dotnet test --collect:"XPlat Code Coverage"
pytest --cov=src --cov-report=xml
jest --coverage
go test ./... -coverprofile=coverage.out
```

---

## Run Tests After Every Change

Every time you create or modify a function, service, or API endpoint, run the relevant tests before declaring the work done.

```bash
# Adapt these to your project's test runner:
<run-tests-for-specific-class>     # fast feedback during development
<run-full-test-suite>              # before marking anything complete

# Common patterns:
npm test -- --testPathPattern=OrderService
pytest tests/services/test_order_service.py
dotnet test --filter "FullyQualifiedName~OrderService"
go test ./internal/services/... -run TestOrder
```

**Scope guidance:**

- Changed a service method → run its test class at minimum
- Added/changed an endpoint → run integration tests for that endpoint
- Changed a validator → run validator test class
- Refactored shared code → run full suite

---

## Test Case Maintenance

When tests fail after a change, triage before patching.

| Why the test broke            | Correct action                                                             |
| ----------------------------- | -------------------------------------------------------------------------- |
| Requirements changed          | Update test to reflect new expected behavior; rename to match new scenario |
| Logic bug fixed               | Test was asserting wrong behavior — update assertion                       |
| Refactor (behavior unchanged) | Update setup/API calls; expected outcome stays the same                    |
| Duplicate of another test     | Delete this one; keep the one with the clearer name and better assertion   |
| Test is now obsolete          | Delete it; note why in the commit                                          |

**Never delete a test just because it's failing.** If it exposes a real regression, fix the production code.

### One Scenario Per Test

Each test must cover exactly one scenario. Warning signs it covers too much:

- Multiple `Act` steps
- Assertions on unrelated concerns
- Test name contains "and" or "also"

Split it.

---

## Best Practices

1. **AAA:** Arrange (mocks + input), Act (call SUT), Assert (verify outcome)
2. **Names:** `method_scenario_expectedResult`
3. **One scenario per test** — one Act, one logical concern
4. **No shared mutable state** — each test starts fresh
5. **Fast unit tests** (< tens of ms); integration tests use shared DB container
6. **Deterministic:** no `sleep()`, no time-dependent behavior without mocking the clock
7. **Independent:** tests must not depend on execution order or global state

---

## Checklist

```
[ ] Unit tests added/updated for every new or changed service method
[ ] Unit tests added/updated for every new or changed validator
[ ] Integration tests cover new/changed endpoints (create/update/delete + auth)
[ ] Tests run green after every change (exit 0)
[ ] No duplicate tests — each scenario covered exactly once
[ ] Broken tests triaged: updated, kept (bug found), or deleted (obsolete)
[ ] DB tests use isolated test DB; migrations applied before tests run
[ ] Coverage collected in CI; threshold enforced
[ ] No flaky tests; quarantine temporarily with skip + reason if unavoidable
```
