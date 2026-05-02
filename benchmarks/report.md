# Coding Level Benchmark Report

**Model:** `claude-sonnet-4-6`
**Prompt:** My query SELECT * FROM orders WHERE user_id = 42 AND status = 'pending' ORDER BY created_at DESC is slow. How do I fix it?

## Token & Cost Summary

| Lvl | Name | Sys words | Input tok | Output tok | Δ vs baseline | Cache↑ | Cost |
|-----|------|-----------|-----------|------------|---------------|--------|------|
| BASE | Baseline (no level) | 0 | 3 | 503 |  | 17906 | $0.01293 |
| L0 | ELI5 | 223 | 3 | 561 | +58 | 11915 | $0.03562 |
| L1 | Junior | 229 | 3 | 500 | -3 | 11915 | $0.03470 |
| L2 | Mid-level | 210 | 3 | 384 | -119 | 11915 | $0.03296 |
| L3 | Senior | 217 | 3 | 487 | -16 | 11915 | $0.03451 |
| L4 | Tech Lead | 215 | 3 | 397 | -106 | 11915 | $0.03309 |
| L5 | God Mode | 228 | 3 | 670 | +167 | 18243 | $0.01553 |

## Verbosity Summary

| Lvl | Name | Words | Sentences | Code | Bullets |
|-----|------|-------|-----------|------|---------|
| BASE | Baseline (no level) | 194 | 6 | ✓ | ✓ |
| L0 | ELI5 | 264 | 7 | ✓ | ✓ |
| L1 | Junior | 248 | 10 | ✓ | ✓ |
| L2 | Mid-level | 182 | 4 | ✓ | ✓ |
| L3 | Senior | 261 | 14 | ✓ | ✓ |
| L4 | Tech Lead | 186 | 3 | ✗ | ✓ |
| L5 | God Mode | 171 | 7 | ✓ | ✓ |

## Full Responses

### Baseline — Baseline (no level)
> *No coding level — raw Claude Code defaults*
> 503 output tokens · 194 words · $0.01293

## Fix: Add a composite index

```sql
CREATE INDEX idx_orders_user_status_date
  ON orders (user_id, status, created_at DESC);
```

This single index satisfies all three operations — equality filter on `user_id`, equality filter on `status`, and the `ORDER BY created_at DESC` — so the DB scans only matching rows in order without a sort step.

**Column order matters:** put equality columns first (`user_id`, `status`), range/sort column last (`created_at`).

---

**Also worth doing:**

Replace `SELECT *` with only the columns you need:
```sql
SELECT id, amount, created_at FROM orders
WHERE user_id = 42 AND status = 'pending'
ORDER BY created_at DESC;
```

If the selected columns are all in the index (a *covering index*), the DB never touches the table itself:
```sql
CREATE INDEX idx_orders_covering
  ON orders (user_id, status, created_at DESC)
  INCLUDE (id, amount);  -- PostgreSQL syntax; omit INCLUDE for MySQL
```

---

**Verify it's being used:**
```sql
EXPLAIN ANALYZE
  SELECT * FROM orders WHERE user_id = 42 AND status = 'pending' ORDER BY created_at DESC;
```

Look for `Index Scan` (good) vs `Seq Scan` (bad). If you still see a seq scan, check for type mismatches (e.g., `user_id` stored as `varchar` but you're passing an integer).

### Level 0 — ELI5
> *No assumed knowledge, analogies, step-by-step*
> 561 output tokens · 264 words · $0.03562

Imagine a librarian who has to flip through every single book in a huge library to find the ones you want — an **index** (a sorted lookup card catalog) lets them skip straight to the right shelf instead.

Your database is doing the same thing: scanning every row in `orders` to find the matching ones. The fix is to add an index — a pre-sorted guide — on the columns your query filters and sorts by.

**Run this once:**

```sql
CREATE INDEX idx_orders_user_status_date
ON orders (user_id, status, created_at DESC);
```

What each part means:
- `CREATE INDEX` — tells the database to build the card catalog
- `idx_orders_user_status_date` — just a name you give it (can be anything)
- `ON orders` — which table (your "library shelf") to index
- `(user_id, status, created_at DESC)` — the three columns the query uses, in this exact order: filter by `user_id` first, then `status`, then sort by `created_at`

**Why the order matters:** The columns you filter on (`user_id`, `status`) go first, and the column you sort on (`created_at`) goes last. Putting them in any other order is like sorting books by title when you're searching by author — it won't help.

**To verify it's working**, run:

```sql
EXPLAIN SELECT * FROM orders WHERE user_id = 42 AND status = 'pending' ORDER BY created_at DESC;
```

Look for `Index Scan` or `Index Seek` in the output — that means the database is now using your new card catalog instead of scanning everything.

Practically: this one index should make your query go from seconds to milliseconds on large tables.

### Level 1 — Junior
> *Explains WHY, mentor tone, encourages learning*
> 500 output tokens · 248 words · $0.03470

The query is slow because the database is scanning every row in `orders` to find matching ones — it has no shortcut. The fix is a **composite index** on the columns used in your `WHERE` clause.

## Why indexes work

An index is like a book's appendix: instead of reading every page to find "pending orders for user 42", the database jumps straight to the relevant rows. Without one, it does a **full table scan** — O(n) regardless of how many rows match.

## The fix

Create a composite index on `(user_id, status)`:

```sql
CREATE INDEX idx_orders_user_status
ON orders (user_id, status);
```

## Why column order matters (the pitfall)

Put the **equality filters first**, range/sort columns last. Your query filters on `user_id = 42` (equality) and `status = 'pending'` (equality), then sorts by `created_at`. If you frequently sort or range-filter on `created_at`, extend the index:

```sql
CREATE INDEX idx_orders_user_status_created
ON orders (user_id, status, created_at DESC);
```

This lets the database satisfy the `WHERE` and `ORDER BY` entirely from the index — no sort step needed.

**The pitfall:** if you put `created_at` first in the index, the equality filters on `user_id` and `status` can't use it efficiently. Index columns must match the query's filter pattern from left to right.

## Verify it works

```sql
EXPLAIN SELECT * FROM orders
WHERE user_id = 42 AND status = 'pending'
ORDER BY created_at DESC;
```

Look for `Index Scan` (good) instead of `Seq Scan` / `Full Table Scan` (bad) in the output.

### Level 2 — Mid-level
> *Design patterns, brief trade-off notes*
> 384 output tokens · 182 words · $0.03296

Add a composite index on `(user_id, status, created_at DESC)`:

```sql
CREATE INDEX idx_orders_user_status_created
  ON orders (user_id, status, created_at DESC);
```

This covers the full query — the optimizer satisfies the `WHERE` equality filters and `ORDER BY` without a filesort, turning it into an index range scan.

**Why composite over separate indexes:**
- Single-column indexes on `user_id` or `status` alone force a merge or secondary sort
- Column order matters: equality predicates first (`user_id`, `status`), range/sort last (`created_at`)

**Verify it's used:**

```sql
EXPLAIN SELECT * FROM orders
WHERE user_id = 42 AND status = 'pending'
ORDER BY created_at DESC;
```

Look for `Using index` (MySQL) or `Index Scan` (Postgres) — not `Using filesort` or `Seq Scan`.

**If `SELECT *` is fetching many columns** and the table is wide, consider a covering index or projecting only needed columns to avoid heap fetches:

```sql
SELECT id, amount, created_at FROM orders
WHERE user_id = 42 AND status = 'pending'
ORDER BY created_at DESC;
```

**Trade-off:** This index costs write performance on `INSERT`/`UPDATE` to `orders`. Acceptable for read-heavy order tables; worth profiling if write throughput is high.

### Level 3 — Senior
> *Trade-offs and architecture first, terse*
> 487 output tokens · 261 words · $0.03451

Index selectivity vs. index order trades read speed for write overhead — the deciding factor is which column eliminates the most rows first.

**Add a composite index:**

```sql
CREATE INDEX idx_orders_user_status_created
  ON orders (user_id, status, created_at DESC);
```

This covers the full query — `user_id` + `status` filter, `created_at` sort — so the engine never touches the table (index-only scan).

**Column order matters:**

1. `user_id` first — equality predicate, highest selectivity if you have many users
2. `status` second — equality predicate, low cardinality but still eliminates rows
3. `created_at` last — matches `ORDER BY`, avoids a filesort

If `status` has only 2–3 values, some planners will skip it for a range scan — verify with `EXPLAIN ANALYZE`.

**Verify the plan:**

```sql
EXPLAIN (ANALYZE, BUFFERS) 
SELECT * FROM orders WHERE user_id = 42 AND status = 'pending' ORDER BY created_at DESC;
```

Look for:
- `Index Only Scan` — ideal
- `Index Scan` — fine, hitting table for non-indexed columns
- `Seq Scan` or `Sort` — index isn't being used

**Failure modes to watch:**

- `SELECT *` pulls columns not in the index, forcing a heap fetch per row. If this query runs hot, project only the columns you need.
- If `user_id` is low cardinality (e.g., a handful of power users with thousands of orders), the planner may prefer a seq scan — add `WHERE created_at > now() - interval '30 days'` to bound the scan.
- Partial index if `status = 'pending'` is a small, stable subset: `CREATE INDEX ... WHERE status = 'pending'` — smaller index, faster writes.

### Level 4 — Tech Lead
> *Risk analysis, business impact, ops implications*
> 397 output tokens · 186 words · $0.03309

Add a composite index on `(user_id, status, created_at DESC)` — that single change will likely drop this query from a full table scan to a sub-millisecond index seek.

**Why this works**
- The index covers all three operations: filter on `user_id`, filter on `status`, sort on `created_at` — no rows fetched just to be discarded
- Without it, every query for any user's pending orders scans the entire `orders` table

**Risks and trade-offs**
- Write overhead: every INSERT/UPDATE/DELETE on `orders` becomes slightly slower — acceptable unless you're writing millions of rows/second
- Storage cost: modest, proportional to row count
- Easy to reverse: drop the index at any time with no data loss

**What to watch**
- `SELECT *` is a flag — if the table is wide, pulling all columns adds I/O even with a perfect index; worth asking the team whether all columns are actually used
- If `orders` is already large and this is a production table, build the index concurrently to avoid a table lock

**Recommendation:** Ship the index. The risk is low, the reversal is trivial, and the impact is immediate.

### Level 5 — God Mode
> *Zero hand-holding, code-first, max terse*
> 670 output tokens · 171 words · $0.01553

```sql
CREATE INDEX idx_orders_user_status_created
  ON orders (user_id, status, created_at DESC);
```

Column order matters: equality predicates first (`user_id`, `status`), then the sort column (`created_at`). The engine walks the index directly to matching rows already in order — no filesort, no extra scan.

Verify with:

```sql
EXPLAIN SELECT * FROM orders
WHERE user_id = 42 AND status = 'pending'
ORDER BY created_at DESC;
```

Look for `Using index` (MySQL) or `Index Scan` (Postgres) — not `Using filesort` or `Seq Scan`.

---

Two follow-on considerations:

**`SELECT *`** — if this query runs hot, a covering index (adding the columns you actually need) eliminates the heap fetch entirely:
```sql
CREATE INDEX idx_orders_covering
  ON orders (user_id, status, created_at DESC)
  INCLUDE (id, amount, ...);  -- Postgres 11+ / SQL Server syntax
```

**Low cardinality on `status`** — if `pending` is a small fraction of rows, the composite index is fine. If most orders are `pending`, the planner may prefer just `(user_id, created_at DESC)` and filter status in-memory. Check row counts with `EXPLAIN ANALYZE` to confirm selectivity.
