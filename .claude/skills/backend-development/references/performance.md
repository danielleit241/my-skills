# Performance Reference — Backend / Database

Apply query hygiene, N+1 prevention, caching, and async patterns. Applies to any backend with an ORM and relational DB.

---

## Query Hygiene

### Always paginate lists

```
// Use paginated query — never load all rows
const { items, total } = await repo.findPaged({
  page: pageNumber,
  pageSize,
  filter: { deletedAt: null },
  orderBy: { createdAt: 'desc' },
  tracking: false     // read-only → skip change tracking
})
```

### No-tracking for reads

Only enable change tracking when you intend to write the entity back.

```
// Read-only: disable tracking (faster, less memory)
const entity = await repo.findById(id, { tracking: false })

// Write path: enable tracking so ORM detects changes
const entity = await repo.findById(id, { tracking: true })
entity.status = 'active'
await uow.save()
```

### Always filter soft-deleted rows

```
// Every query, without exception:
filter: { deletedAt: null }
```

---

## N+1 Prevention

**The problem:** 1 query to load a list, then 1 query per item for a related entity.

**Fix 1 — Eager load with joins/includes:**

```
// Load related data in one query
const orders = await repo.findPaged({
  includes: ['customer', 'items'],
  filter: { deletedAt: null }
})
```

**Fix 2 — Projection (select only what you need):**

```
// Avoid loading full entities when only a few fields are needed
const summaries = await db.orders
  .where({ deletedAt: null })
  .select(['id', 'status', 'totalAmount'])
  .execute()
```

**Fix 3 — Batch loading for complex joins:**

```
// Build query once, count + fetch in two round-trips
const baseQuery = db.orders
  .where({ deletedAt: null, status: 'active' })
  .include('items')
  .orderBy('createdAt', 'desc')

const total = await baseQuery.count()
const items = await baseQuery.skip((page-1) * size).take(size).get()
```

---

## Caching

Use cache-aside pattern. Cache stable reference data, not user-specific or security-sensitive data.

```
// Read: check cache first, fallback to DB
const cacheKey = "config:features"
const cached = await cache.get(cacheKey)
if (cached) return success(cached)

const data = await repo.findAll(...)
await cache.set(cacheKey, data, { ttl: 30 * 60 })  // 30 min
return success(data)

// Write: always invalidate after mutation
await uow.save()
await cache.delete("config:features")
```

**Cache-worthy:** stable reference data (config, roles, permissions, lookup tables).

**Do NOT cache:** OTPs, session tokens, user-owned resources, anything where stale = wrong behavior.

---

## Async Patterns

```
// Never block the thread — always await
const x = await someAsync()           // correct
const x = someAsync().resultSync()    // WRONG — deadlock risk

// Always propagate cancellation tokens / abort signals
async findById(id, signal?) {
  return await db.query({ where: { id }, signal })
}

// Parallel independent calls
const [userResult, orderResult] = await Promise.all([
  userRepo.findById(userId),
  orderRepo.findByUser(userId)
])

// Sequential dependent calls
const user = await userRepo.findById(userId)
if (!user) return notFound()
const orders = await orderRepo.findByUser(user.id)
```

---

## Database Indexes

Always index columns used in `WHERE`, `ORDER BY`, or `JOIN`. Use partial indexes for soft-delete tables.

```sql
-- Partial index — only indexes active rows (much smaller)
CREATE INDEX idx_orders_status ON orders(status) WHERE deleted_at IS NULL;

-- Composite index for multi-column filters
CREATE INDEX idx_orders_user_status ON orders(user_id, status);

-- Unique with null and soft-delete exclusion
CREATE UNIQUE INDEX idx_users_email ON users(email)
  WHERE email IS NOT NULL AND deleted_at IS NULL;
```

---

## SaveChanges / Commit Discipline

```
// One commit per logical operation — not per entity
await repo.add(order)
await repo.add(orderItem)
await uow.save()   // single round-trip to DB

// Use explicit transaction only when you need multiple commits
await db.transaction(async (tx) => {
  await tx.orders.save(order)
  await tx.inventory.decrement(order.items)
})
```

---

## Anti-Pattern Checklist

| Anti-pattern                                     | Fix                                     |
| ------------------------------------------------ | --------------------------------------- |
| `findAll()` on large table                       | `findPaged()` with page + size          |
| Change tracking enabled for read-only query      | `tracking: false`                       |
| Missing `deletedAt IS NULL` filter               | Add to every query                      |
| Loop + separate DB call per item (N+1)           | Eager load or batch query               |
| Blocking async (`.result`, sync-over-async)      | `await`                                 |
| No index on FK or filter column                  | Add partial/composite index             |
| Cache set without invalidation on write          | Delete/invalidate cache after mutation  |
| Multiple commits without transaction             | Wrap in transaction                     |
| Returning unbounded list from API                | Paginate with max page size             |
