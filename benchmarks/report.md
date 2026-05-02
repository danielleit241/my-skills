# Coding Level Benchmark Report

**Model:** `claude-sonnet-4-6`
**Prompt:** My query SELECT * FROM orders WHERE user_id = 42 AND status = 'pending' ORDER BY created_at DESC is slow. How do I fix it?

## Token & Cost Summary

| Lvl | Name | Sys words | Input tok | Output tok | Δ vs baseline | Cache↑ | Cost |
|-----|------|-----------|-----------|------------|---------------|--------|------|
| BASE | Baseline (no level) | 0 | 3 | 276 |  | 11910 | $0.03006 |
| L0 | ELI5 | 223 | 3 | 736 | +460 | 11915 | $0.03810 |
| L1 | Junior | 229 | 3 | 492 | +216 | 11915 | $0.03443 |
| L2 | Mid-level | 210 | 3 | 382 | +106 | 11915 | $0.03279 |
| L3 | Senior | 217 | 3 | 509 | +233 | 11915 | $0.03470 |
| L4 | Tech Lead | 215 | 3 | 500 | +224 | 11915 | $0.03449 |
| L5 | God Mode | 228 | 3 | 275 | -1 | 11915 | $0.03130 |

## Verbosity Summary

| Lvl | Name | Words | Sentences | Code | Bullets |
|-----|------|-------|-----------|------|---------|
| BASE | Baseline (no level) | 133 | 2 | ✓ | ✓ |
| L0 | ELI5 | 346 | 13 | ✓ | ✓ |
| L1 | Junior | 275 | 13 | ✓ | ✗ |
| L2 | Mid-level | 186 | 5 | ✓ | ✓ |
| L3 | Senior | 254 | 10 | ✓ | ✓ |
| L4 | Tech Lead | 176 | 15 | ✗ | ✓ |
| L5 | God Mode | 139 | 5 | ✓ | ✗ |

## Full Responses

### Baseline — Baseline (no level)
> *No coding level — raw Claude Code defaults*
> 276 output tokens · 133 words · $0.03006

Add a composite index on `(user_id, status, created_at)`:

```sql
CREATE INDEX idx_orders_user_status_created
  ON orders (user_id, status, created_at DESC);
```

**Why this works:**

- `user_id = 42` and `status = 'pending'` are equality filters — put them first in the index so the DB jumps directly to matching rows
- `created_at DESC` is the sort column — including it last lets the DB skip a filesort

**Verify it's used:**

```sql
EXPLAIN SELECT * FROM orders
WHERE user_id = 42 AND status = 'pending'
ORDER BY created_at DESC;
```

Look for `Using index` or an index scan on `idx_orders_user_status_created` instead of a full table scan.

**If `SELECT *` is still slow** (many columns, wide rows), consider a covering index by adding the columns you actually need, or rewrite the query to select only those columns.

### Level 0 — ELI5
> *No assumed knowledge, analogies, step-by-step*
> 736 output tokens · 346 words · $0.03810

Think of your database like a giant library with millions of books (rows of data), and your query is a librarian being asked to find all the books by a specific author that are "checked out," sorted by when they were borrowed — without any filing system, they have to check every single book one by one.

That slowness is called a **full table scan** (the database reads every row, even ones it doesn't need). The fix is to give the database a **filing system** — called an **index** — so it can jump straight to the right rows.

## The fix: add a composite index

A **composite index** is like a card catalog sorted by multiple things at once (author, then status, then date). Run this once:

```sql
-- This creates a "shortcut" the database can use for your exact query
CREATE INDEX idx_orders_user_status_date
  ON orders (user_id, status, created_at DESC);
```

That's it. Your query doesn't change at all — the database will automatically use this index from now on.

## Why this index works for your query

Your query filters on three things in this order:
1. `user_id = 42` — narrows to one person's orders
2. `status = 'pending'` — narrows further to pending only
3. `ORDER BY created_at DESC` — sorts what's left

The index is built in the same order, so the database can satisfy all three steps without scanning unrelated rows.

## Verify it's working

```sql
-- EXPLAIN shows you the database's "game plan" before it runs
EXPLAIN SELECT * FROM orders WHERE user_id = 42 AND status = 'pending' ORDER BY created_at DESC;
```

Look for `Using index` or `Index Scan` in the output — that means the index is being used. If you still see `Full Table Scan` or `Seq Scan`, the index wasn't picked up (usually means the table is very small or stats are stale — run `ANALYZE orders;` to refresh).

**Practically speaking:** this one index can turn a query that took seconds into one that takes milliseconds, even on a table with millions of rows.

### Level 1 — Junior
> *Explains WHY, mentor tone, encourages learning*
> 492 output tokens · 275 words · $0.03443

The query is slow because the database is scanning every row in `orders` to find matches — it has no shortcut to jump directly to rows where `user_id = 42` and `status = 'pending'`. The fix is a **composite index** on the columns you filter and sort by.

## Why this works

An index is a pre-sorted lookup structure. Without one, the database does a **full table scan** — O(n). With the right index, it jumps straight to matching rows — O(log n).

The column order in a composite index matters: put the **equality filters first**, then the **range/sort column last**. Your query filters on `user_id` and `status` (equality), then sorts on `created_at` — so:

```sql
CREATE INDEX idx_orders_user_status_date
  ON orders (user_id, status, created_at DESC);
```

This lets the database:
1. Jump directly to rows where `user_id = 42`
2. Filter within those to `status = 'pending'`
3. Return them already sorted by `created_at DESC` — no sort step needed

## Verify it's being used

```sql
EXPLAIN SELECT * FROM orders
WHERE user_id = 42 AND status = 'pending'
ORDER BY created_at DESC;
```

Look for `Index Scan` or `Index Only Scan` in the output. If you still see `Seq Scan`, the planner may think the table is too small to bother — it will kick in as the table grows.

## The pitfall to watch for

`SELECT *` fetches every column, which forces a **heap lookup** even with an index (the index doesn't store all columns). If you only need a few columns, select them explicitly — this enables an **index-only scan**, which is faster because it never touches the main table at all.

### Level 2 — Mid-level
> *Design patterns, brief trade-off notes*
> 382 output tokens · 186 words · $0.03279

Add a composite index on `(user_id, status, created_at)`:

```sql
CREATE INDEX idx_orders_user_status_date
  ON orders (user_id, status, created_at DESC);
```

**Why this works:** The index satisfies all three clauses in one scan — equality on `user_id` and `status` narrows the rows, then `created_at DESC` delivers them pre-sorted, eliminating a filesort.

**Column order matters:**
- Equality columns first (`user_id`, `status`), range/sort column last (`created_at`)
- Flipping the order forces the optimizer to sort after filtering

**Verify it's being used:**
```sql
EXPLAIN SELECT * FROM orders
WHERE user_id = 42 AND status = 'pending'
ORDER BY created_at DESC;
```
Look for `Using index` (MySQL) or `Index Scan` (Postgres) — not `filesort` or `Seq Scan`.

**Other things to check:**
- If `SELECT *` pulls wide rows, consider selecting only needed columns — may allow an index-only scan
- If `status` has very low cardinality (e.g., 2–3 distinct values) and most rows are non-pending, the optimizer may skip the index; a partial index helps: `WHERE status = 'pending'`
- Make sure the table's `user_id` FK doesn't already have a single-column index that's now superseded — drop it to avoid write overhead

### Level 3 — Senior
> *Trade-offs and architecture first, terse*
> 509 output tokens · 254 words · $0.03470

Composite index column order trades write overhead for read selectivity — the deciding factor is cardinality and filter type.

**The fix: a composite index on `(user_id, status, created_at)`**

```sql
CREATE INDEX idx_orders_user_status_date
  ON orders (user_id, status, created_at DESC);
```

**Why this order:**
1. `user_id` — equality filter, highest selectivity, goes first
2. `status` — equality filter, low cardinality but narrows the range scan
3. `created_at DESC` — range/sort, must be last or the index can't satisfy `ORDER BY` without a filesort

The query becomes an **index-only range scan** — no sort step, no heap fetch if you add a covering index.

**Covering index (eliminates heap lookups entirely):**

```sql
CREATE INDEX idx_orders_user_status_date
  ON orders (user_id, status, created_at DESC)
  INCLUDE (order_id, total, ...); -- whatever SELECT * actually needs
```

**Verify with `EXPLAIN`:**

```sql
EXPLAIN (ANALYZE, BUFFERS)
SELECT * FROM orders
WHERE user_id = 42 AND status = 'pending'
ORDER BY created_at DESC;
```

Watch for:
- `Index Scan` or `Index Only Scan` — good
- `Sort` node still present — `created_at` direction mismatch or index not used
- `Bitmap Heap Scan` — partial index use, check filter vs. index condition

**Common failure modes:**
- `status` has ~3 values → its selectivity is low, but it still helps eliminate rows before the sort; don't skip it
- `SELECT *` forces heap fetches unless you use `INCLUDE` — on wide tables this dominates
- If `user_id` is nearly unique (e.g., most users have 1 order), a single-column index on `user_id` may be sufficient and cheaper to maintain

### Level 4 — Tech Lead
> *Risk analysis, business impact, ops implications*
> 500 output tokens · 176 words · $0.03449

Add a composite index on `(user_id, status, created_at DESC)` — in that column order.

**Why it's slow now:** The database is filtering on two columns then sorting, likely doing a full table scan or two separate index lookups followed by an in-memory sort.

**Decision considerations:**

- **Risk:** Low. Index adds are non-blocking on most modern databases (Postgres, MySQL 5.6+, SQL Server online mode). Verify your DB version supports online index creation before scheduling.
- **Blast radius:** Write performance degrades slightly on the `orders` table — acceptable unless you're insert-heavy (>10k inserts/sec).
- **Reversal cost:** Trivial. Drop the index with zero data loss.
- **Column order matters:** `user_id` first (equality filter), `status` second (equality filter), `created_at` last (range/sort). Changing this order breaks the optimization.
- **If `orders` is large (>50M rows):** Run the index creation during off-peak hours and monitor replication lag if you have replicas.

**Recommendation:** Ship it. This is a textbook case — the index pays for itself immediately and carries near-zero risk. Delegate to a DBA or senior engineer for a 30-minute change window.

### Level 5 — God Mode
> *Zero hand-holding, code-first, max terse*
> 275 output tokens · 139 words · $0.03130

Add a composite index:

```sql
CREATE INDEX idx_orders_user_status_created 
ON orders (user_id, status, created_at DESC);
```

Column order matters: equality filters first (`user_id`, `status`), then the sort key (`created_at`). This lets the DB satisfy the `WHERE` clause via index seek and return rows already sorted — no filesort.

Verify it's used:

```sql
EXPLAIN SELECT * FROM orders WHERE user_id = 42 AND status = 'pending' ORDER BY created_at DESC;
```

Look for `Index Scan` / `Index Range Scan` on the new index. If you still see a `filesort` or `Sort`, check that `created_at DESC` matches the index direction (Postgres handles mixed DESC automatically; MySQL 8+ does too, older MySQL doesn't).

If `SELECT *` is pulling wide rows, add a covering index by appending the columns you actually need — but only if profiling shows the heap fetch is the bottleneck.
