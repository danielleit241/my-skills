# Code Quality — SOLID, Design Patterns, Clean Code

Apply SOLID principles, common design patterns, clean code practices, and refactoring techniques. Examples use pseudocode — adapt to your language.

---

## SOLID

### Single Responsibility (SRP) — one class, one reason to change

```
// Bad: one service doing too much
class UserService {
  createUser(req) { /* validate + save + send email + log audit */ }
}

// Good: each class has one job
class UserService     { createUser(req) { /* orchestrate */ } }
class EmailService    { sendWelcome(user) { /* email only */ } }
class AuditService    { logCreation(user) { /* audit only */ } }
```

### Open/Closed (OCP) — open for extension, closed for modification

```
// Bad: add new report format = modify this class
class ReportExporter {
  export(type, data) {
    if (type === "pdf") { ... }
    else if (type === "csv") { ... }   // adding Excel = touch this file
  }
}

// Good: strategy pattern — add formats without changing ReportExporter
interface ExportStrategy { export(data): bytes }
class PdfStrategy  implements ExportStrategy { ... }
class CsvStrategy  implements ExportStrategy { ... }
class ReportExporter(strategy: ExportStrategy) {
  export(data) => strategy.export(data)
}
```

### Liskov Substitution (LSP) — subtypes must be substitutable, never override to throw

```
// Bad: subtype throws, breaks callers
class ReadOnlyRepo extends UserRepo {
  save(user) { throw new Error("Not supported") }
}

// Good: split interfaces so implementations never need to throw
interface ReadUserRepo  { findById(id): User }
interface WriteUserRepo { save(user): void }
```

### Interface Segregation (ISP) — small, focused interfaces

```
// Bad: one fat interface forces every implementor to implement unused methods
interface Repository<T> {
  findById(id): T
  save(t: T): void
  bulkImport(items: T[]): void   // not every repo needs this
}

// Good:
interface ReadRepository<T>  { findById(id): T }
interface WriteRepository<T> { save(t: T): void }
interface BulkRepository<T>  { bulkImport(items: T[]): void }
```

### Dependency Inversion (DIP) — depend on abstractions, not concretions

```
// Bad: hard-coded concrete dependency
class OrderService {
  private repo = new PostgresOrderRepository()
}

// Good: constructor injection with interfaces
class OrderService(repo: IOrderRepository, mailer: IMailer, uow: IUnitOfWork) {
  async createOrder(req) {
    const order = req.toEntity()
    await repo.add(order)
    await uow.save()
    return successResponse(order.toResponse())
  }
}
```

---

## Design Patterns

### Repository + Unit of Work

Abstraction between business logic and data access. Multiple repos share one transaction via UoW.

```
interface UserRepository {
  findByEmail(email: string): User | null
  exists(email: string): boolean
  add(user: User): void
}

class UserService(repo: UserRepository, uow: UnitOfWork) {
  async register(req) {
    if (await repo.exists(req.email))
      return failure(ErrorCodes.EMAIL_TAKEN, 409)
    const user = req.toEntity()
    await repo.add(user)
    await uow.save()
    return success(user.toResponse(), 201)
  }
}
```

### Factory

Create objects without specifying exact type. Use when the concrete type varies at runtime.

```
interface NotificationChannel { send(to, message): void }
class EmailChannel  implements NotificationChannel { ... }
class SmsChannel    implements NotificationChannel { ... }
class SlackChannel  implements NotificationChannel { ... }

class NotificationFactory {
  static create(type: string): NotificationChannel {
    switch(type) {
      case "email": return new EmailChannel()
      case "sms":   return new SmsChannel()
      default: throw new Error(`Unknown channel: ${type}`)
    }
  }
}
```

### Decorator

Add behavior without modifying the original class. Ideal for cross-cutting concerns.

```
interface StorageService { upload(file, name): string }
class S3StorageService  implements StorageService { /* actual upload */ }

class LoggingStorageDecorator(inner: StorageService, logger: Logger) implements StorageService {
  upload(file, name) {
    logger.info(`Uploading: ${name}`)
    const url = inner.upload(file, name)
    logger.info(`Uploaded: ${url}`)
    return url
  }
}
```

---

## Clean Code

### Meaningful names — no abbreviations, no magic numbers

```
// Bad
async proc(id, t) { if (file.size > 52428800) { } }

// Good
const MAX_FILE_SIZE_BYTES = 50 * 1024 * 1024
async getProjectWithMembers(projectId: Guid, ct: CancelToken) {
  if (file.size > MAX_FILE_SIZE_BYTES) { }
}
```

### Guard clauses at top — no deep nesting

```
// Bad: arrow anti-pattern
async create(req) {
  if (req) {
    if (await repo.exists(req.name)) {
      // ... nested logic
    }
  }
}

// Good: fail fast, happy path is clear
async create(req, ct) {
  if (!req) return failure(ErrorCodes.INVALID_REQUEST, 400)
  if (await repo.exists(req.name, ct))
    return failure(ErrorCodes.NAME_TAKEN, 409)
  // happy path
}
```

### Error handling — use constants, let unexpected exceptions propagate

```
// Bad: silent catch, raw strings
try {
  const user = await repo.findById(id)
  return user
} catch (e) {
  console.log(e)
  return null
}

// Good: explicit checks, constants, unexpected errors surface to global handler
const user = await repo.findById(id, ct)
if (!user) return failure(ErrorCodes.USER_NOT_FOUND, 404)
// DB/network exceptions propagate → global error middleware → 500
```

### DRY — one validator, one mapping, one query builder

```
// Bad: duplicated validation in every handler
if (!req.email || !req.email.includes('@')) return error(...)

// Good: one validator used everywhere
class CreateUserValidator extends BaseValidator<CreateUserRequest> {
  constructor() {
    this.ruleFor('email')
      .notEmpty().withCode(Codes.EMAIL_REQUIRED)
      .emailFormat().withCode(Codes.EMAIL_INVALID)
  }
}
```

---

## Refactoring

### Extract Method — pull single-purpose blocks into named methods

```
// Bad: 150-line method mixing everything
async processOrder(orderId, userId) { /* query + validate + update + email */ }

// Good:
async processOrder(orderId, userId, ct) {
  const (order, user) = await validateAndFetchAsync(orderId, userId, ct)
  await assertInventoryAsync(order, ct)
  const result = await saveOrderAsync(order, user, ct)
  await notifyUserAsync(user, result, ct)
}
```

### Replace Conditional with Strategy

```
// Bad: type switch — every new type = modify this method
async sendNotification(type, to, msg) {
  if (type === "email") { ... }
  else if (type === "sms") { ... }
  else if (type === "push") { ... }
}

// Good: strategy — add channels without touching the service
interface NotificationChannel { canHandle(type: string): boolean; send(to, msg): void }
class NotificationService(channels: NotificationChannel[]) {
  send(type, to, msg) {
    const channel = channels.find(c => c.canHandle(type))
    return channel.send(to, msg)
  }
}
```

---

## Checklist

```
[ ] SOLID principles applied — each class has one reason to change
[ ] Methods are small and focused (≤ 20 lines ideal)
[ ] Meaningful names — no abbreviations, no magic numbers
[ ] Guard clauses at top — no deep nesting
[ ] Constants used for error codes, roles, statuses — no raw strings
[ ] No silent catch blocks — unexpected exceptions surface to global handler
[ ] DRY — validation, mapping, and query logic not duplicated
[ ] All dependencies injected via interfaces — testable in isolation
[ ] Comments explain "why", not "what" (code explains "what")
[ ] No feature beyond what is asked (YAGNI)
```
