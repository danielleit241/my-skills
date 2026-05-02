# Coding Level Benchmark Report

**Model:** `claude-sonnet-4-6`
**Prompt:** My query SELECT \* FROM orders WHERE user_id = 42 AND status = 'pending' ORDER BY created_at DESC is slow. How do I fix it?

## Token & Cost Summary

| Lvl  | Name                | Sys words | Input tok | Output tok | Δ vs baseline | Cache↑ | Cost     |
| ---- | ------------------- | --------- | --------- | ---------- | ------------- | ------ | -------- |
| BASE | Baseline (no level) | 0         | 3         | 811        |               | 11910  | $0.04403 |
| L0   | ELI5                | 223       | 3         | 571        | -240          | 11915  | $0.04156 |
| L1   | Junior              | 229       | 3         | 705        | -106          | 11915  | $0.04357 |
| L2   | Mid-level           | 210       | 3         | 607        | -204          | 11915  | $0.04210 |
| L3   | Senior              | 217       | 3         | 704        | -107          | 11915  | $0.04356 |
| L4   | Tech Lead           | 215       | 3         | 562        | -249          | 11915  | $0.04136 |
| L5   | God Mode            | 228       | 3         | 320        | -491          | 11915  | $0.03791 |

## Verbosity Summary

| Lvl  | Name                | Words | Sentences | Code | Bullets |
| ---- | ------------------- | ----- | --------- | ---- | ------- |
| BASE | Baseline (no level) | 249   | 11        | ✓    | ✓       |
| L0   | ELI5                | 293   | 14        | ✓    | ✓       |
| L1   | Junior              | 242   | 10        | ✓    | ✓       |
| L2   | Mid-level           | 223   | 8         | ✓    | ✓       |
| L3   | Senior              | 247   | 7         | ✓    | ✓       |
| L4   | Tech Lead           | 183   | 3         | ✗    | ✓       |
| L5   | God Mode            | 159   | 7         | ✓    | ✓       |

## Full Responses

### Baseline — Baseline (no level)

> _No coding level — raw Claude Code defaults_
> 811 output tokens · 249 words · $0.04403

Composite index column order trades filter selectivity for sort elimination — the deciding factor is whether `status` has enough cardinality to be worth the middle slot.

**The fix:**

```sql
CREATE INDEX idx_orders_user_status_created
  ON orders (user_id, status, created_at DESC);
```

This covers the full query: equality predicates on `user_id` + `status` collapse the scan, `created_at DESC` eliminates the filesort.

**Verify it's used:**

```sql
EXPLAIN (ANALYZE, BUFFERS)
SELECT * FROM orders
WHERE user_id = 42 AND status = 'pending'
ORDER BY created_at DESC;
```

Look for `Index Scan` or `Index Only Scan`, not `Sort` node above it.

**The real killer — `SELECT *`:**

Even with the perfect index, `SELECT *` forces heap fetches for every row unless you list only the columns in the index. If you only need a few columns, make the index covering:

```sql
CREATE INDEX idx_orders_user_status_created
  ON orders (user_id, status, created_at DESC)
  INCLUDE (id, amount, updated_at); -- whatever the caller actually needs
```

**Production failure modes:**

- If `status = 'pending'` represents 80%+ of rows for a given user, Postgres may ignore the index entirely and seq-scan. Check with `pg_stats` — `n_distinct` on `status` column. If cardinality is too low, drop `status` from the index and filter post-scan.
- `created_at DESC` in the index definition only matters in Postgres 8+. In MySQL, drop the direction — it'll use the index in reverse.
- Index bloat: `orders` tables grow fast. Monitor with `pg_stat_user_indexes` — if `idx_scan` is low after a week of traffic, the planner has a reason.

### Level 0 — ELI5

> _No assumed knowledge, analogies, step-by-step_
> 571 output tokens · 293 words · $0.04156

Composite index column order trades write overhead for read selectivity — the deciding factor is cardinality and filter vs. sort usage.

Your query has three clauses the optimizer must satisfy: equality filters on `user_id` + `status`, then a sort on `created_at`. The fix is a covering composite index in the right order:

```sql
CREATE INDEX idx_orders_user_status_created
  ON orders (user_id, status, created_at DESC);
```

**Why this order:**

- `user_id` first — highest selectivity equality filter, prunes the most rows
- `status` second — low cardinality but still an equality filter, placed after the high-selectivity col
- `created_at` last — serves the `ORDER BY`, avoids a filesort

**Verify it's used:**

```sql
EXPLAIN (ANALYZE, BUFFERS)
SELECT * FROM orders
WHERE user_id = 42 AND status = 'pending'
ORDER BY created_at DESC;
```

Look for `Index Scan` (not `Seq Scan`) and `rows removed by filter` close to zero.

**Failure modes to watch:**

1. **`SELECT *` kills the covering index benefit** — if the index doesn't include all projected columns, you get index scan + heap fetch for every row. Either add the columns you actually need to the index (`INCLUDE (col1, col2)` in Postgres) or narrow the `SELECT`.

2. **Low-cardinality leading column** — if `status` had only 2 values across millions of rows, putting it first would make the index nearly useless. `user_id` as the leading column is correct here.

3. **Stale statistics** — if `EXPLAIN` shows a bad plan despite the index existing, run `ANALYZE orders` to refresh planner stats.

4. **Partial index if `status = 'pending'` is a common filter on a small subset:**
   ```sql
   CREATE INDEX idx_orders_pending
     ON orders (user_id, created_at DESC)
     WHERE status = 'pending';
   ```
   Smaller index, faster scans — but only helps queries with that exact `WHERE status = 'pending'` predicate.

### Level 1 — Junior

> _Explains WHY, mentor tone, encourages learning_
> 705 output tokens · 242 words · $0.04357

Composite index vs. partial index: the deciding factor is how selective `status = 'pending'` is over time.

**The standard fix** — index column order follows equality filters first, then sort:

```sql
CREATE INDEX idx_orders_user_status_date
  ON orders (user_id, status, created_at DESC);
```

Postgres can satisfy the `WHERE` with the first two columns and eliminate the `ORDER BY` sort entirely using the third. Without this, it's a seq scan or a full index scan + sort.

**The production failure mode**: `status` cardinality collapses as orders age. If 95% of rows are `'completed'`, the planner may still choose a full scan because the index statistics look unfavorable. Verify with:

```sql
EXPLAIN (ANALYZE, BUFFERS)
SELECT * FROM orders WHERE user_id = 42 AND status = 'pending' ORDER BY created_at DESC;
```

Look for `Index Scan` vs `Seq Scan` — if it's still seq scanning after the index, run `ANALYZE orders` to refresh statistics.

**If this is a hot read path**, `SELECT *` is a separate problem. A covering index avoids the heap fetch entirely:

```sql
CREATE INDEX idx_orders_covering
  ON orders (user_id, status, created_at DESC)
  INCLUDE (order_total, item_count, ...);  -- columns you actually need
```

**If `pending` is a small, stable subset**, a partial index is cheaper to maintain:

```sql
CREATE INDEX idx_orders_pending
  ON orders (user_id, created_at DESC)
  WHERE status = 'pending';
```

Half the size, faster writes, same read performance — but only works when the `WHERE status = 'pending'` predicate is literal in the query.

### Level 2 — Mid-level

> _Design patterns, brief trade-off notes_
> 607 output tokens · 223 words · $0.04210

Composite index vs. multiple single-column indexes: the deciding factor is whether the optimizer can use index-only scan for your sort.

**The fix:**

```sql
CREATE INDEX idx_orders_user_status_created
  ON orders (user_id, status, created_at DESC);
```

This turns the query into an index scan + forward read — no filesort, no heap fetch for the filter columns.

**Why column order matters:**

- `user_id` first — highest selectivity, equality predicate
- `status` second — low cardinality but eliminates heap rows early
- `created_at DESC` last — satisfies `ORDER BY` direction without a separate sort step

**What still hurts after the index:**

- `SELECT *` forces a heap fetch for every matched row. If you only need a few columns, a covering index avoids the heap entirely:
  ```sql
  CREATE INDEX idx_orders_covering
    ON orders (user_id, status, created_at DESC)
    INCLUDE (order_total, item_count); -- whatever columns you actually select
  ```
- If `status` has high cardinality (many distinct values), swap it with `created_at` in the index and filter in-memory.
- Pagination without a cursor (`LIMIT/OFFSET` deep pages) will still degrade — use keyset pagination on `created_at`.

**Verify with:**

```sql
EXPLAIN (ANALYZE, BUFFERS)
SELECT * FROM orders
WHERE user_id = 42 AND status = 'pending'
ORDER BY created_at DESC;
```

Look for `Index Scan` (good) vs `Seq Scan` or `Sort` nodes (bad). `Buffers: shared hit` tells you if you're going to disk.

### Level 3 — Senior

> _Trade-offs and architecture first, terse_
> 704 output tokens · 247 words · $0.04356

Composite index column order trades selectivity for sort elimination — get it wrong and you pay a filesort even with an index.

```sql
-- The fix: leading equality columns first, sort column last
CREATE INDEX idx_orders_user_status_created
  ON orders (user_id, status, created_at DESC);
```

This lets the engine satisfy all three clauses — equality filter, equality filter, ordered scan — in one B-tree traversal with no filesort.

**Failure modes worth knowing:**

`SELECT *` defeats a covering index. If `orders` has wide columns, the engine fetches the full row from the heap for every match, turning your index scan into N random I/Os. Either project only what you need or include the payload columns in the index:

```sql
-- Covering index if query is hot and columns are narrow
CREATE INDEX idx_orders_covering
  ON orders (user_id, status, created_at DESC)
  INCLUDE (order_total, item_count);  -- Postgres syntax; MySQL: just add them
```

**Wrong index orderings and why they break:**

| Index                           | Problem                                                                 |
| ------------------------------- | ----------------------------------------------------------------------- |
| `(status, user_id, created_at)` | `status` has low cardinality — scans more rows before filtering by user |
| `(user_id, created_at, status)` | Can't use `status` filter efficiently after a range/sort column         |
| `(user_id, status)`             | Satisfies the filter but causes filesort on `created_at`                |

**Verify with EXPLAIN:**

```sql
EXPLAIN (ANALYZE, BUFFERS) SELECT ...
```

You want `Index Scan` or `Index Only Scan`, not `Seq Scan` or `Sort` in the output. If you still see `Sort`, the index column order or DESC/ASC mismatch is the culprit.

### Level 4 — Tech Lead

> _Risk analysis, business impact, ops implications_
> 562 output tokens · 183 words · $0.04136

Add a composite index on `(user_id, status, created_at)` — this covers the filter, eliminates the sort, and turns a full table scan into a single index seek.

**Why this works and what to watch:**

- Index column order matters: filter columns first (`user_id`, `status`), sort column last (`created_at DESC`) — wrong order means the index is partially used or ignored
- **Blast radius:** index writes add ~5–10% overhead on INSERT/UPDATE to `orders` — acceptable for a read-heavy order table, but verify write volume before deploying
- **Reversal cost:** dropping an index is instant and safe; adding it on a large table locks reads briefly in older Postgres/MySQL — run `CREATE INDEX CONCURRENTLY` on prod
- If `orders` has millions of rows, index creation takes minutes — schedule it during low-traffic window
- `SELECT *` is a separate problem: pulling all columns defeats index-only scans; the team should lock down the column list

**Decision:** ship the composite index. If query is still slow after indexing, the bottleneck shifted to data volume — then the conversation becomes partitioning or archiving old orders, not query tuning.

### Level 5 — God Mode

> _Zero hand-holding, code-first, max terse_
> 320 output tokens · 159 words · $0.03791

Missing composite index trades write overhead for read speed — the deciding factor is read/write ratio on `orders`.

```sql
CREATE INDEX idx_orders_user_status_created
ON orders (user_id, status, created_at DESC);
```

Column order matters: equality predicates first (`user_id`, `status`), range/sort last (`created_at`). This lets the engine use the index for filter + sort without a filesort.

Verify with:

```sql
EXPLAIN (ANALYZE, BUFFERS)
SELECT * FROM orders WHERE user_id = 42 AND status = 'pending' ORDER BY created_at DESC;
```

Watch for `Index Scan` vs `Seq Scan` and `actual rows` vs `estimated rows` — a large divergence means stale statistics, fix with `ANALYZE orders`.

Two failure modes at scale:

- **Status cardinality**: if `pending` is >20% of rows, the planner may prefer a seq scan anyway. Partial index removes that ambiguity: `CREATE INDEX ... WHERE status = 'pending'`
- **`SELECT *`**: if the index covers your needed columns, add them to avoid heap fetches — or stop selecting everything you don't need
