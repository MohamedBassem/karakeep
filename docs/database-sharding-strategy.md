# Database Sharding Strategy for Karakeep

## Current State

Karakeep uses **SQLite** (single file at `${DATA_DIR}/db.db`) with Drizzle ORM. The schema has ~32 tables, all scoped by `userId`. This is a single-process, single-database architecture.

## Why Shard?

SQLite is a great fit for small-to-medium deployments, but it has hard limits:
- Single-writer concurrency (WAL mode helps reads, not writes)
- Vertical scaling only (one machine)
- No read replicas
- Database file size becomes unwieldy at scale

## Recommended Approach: User-Based Sharding

The natural shard key is **`userId`**. This works because:

1. **Every table already has a `userId` column** (or is reachable via one FK hop from a table that does)
2. **Queries are already user-scoped** -- tRPC routers filter by `ctx.user.id` on every operation
3. **No cross-user joins** in normal operations (the one exception is shared lists, addressed below)

### Shard Topology

```
                    ┌──────────────┐
                    │  Routing     │
                    │  Layer       │
                    │  (userId →   │
                    │   shard)     │
                    └──────┬───────┘
              ┌────────────┼────────────┐
              ▼            ▼            ▼
        ┌──────────┐ ┌──────────┐ ┌──────────┐
        │ Shard 0  │ │ Shard 1  │ │ Shard 2  │
        │ users    │ │ users    │ │ users    │
        │ 0-999    │ │ 1000-    │ │ 2000-    │
        │          │ │ 1999     │ │ 2999     │
        └──────────┘ └──────────┘ └──────────┘

   + Global DB (accounts, sessions, config, invites)
```

### Phase 1: Migrate from SQLite to PostgreSQL

Before sharding, move to PostgreSQL. This is a prerequisite because:
- PostgreSQL supports multiple concurrent writers
- Native support for logical replication and partitioning
- Drizzle ORM already supports PostgreSQL (dialect swap + schema adjustments)
- Connection pooling (PgBouncer) handles many concurrent connections

**Steps:**
1. Add a `pg` dialect variant of the Drizzle schema (change `sqliteTable` → `pgTable`, adjust types)
2. Write a migration script that reads SQLite and bulk-inserts into PostgreSQL
3. Update `drizzle.config.ts` and `drizzle.ts` to use `postgres-js` driver
4. Replace SQLite-specific features:
   - `text("normalizedName").generatedAlwaysAs(...)` → PostgreSQL generated column or `citext`
   - JSON columns → native `jsonb`
   - `integer` timestamps → proper `timestamp` type

### Phase 2: Partition by User (Single DB, Table Partitioning)

Before distributed sharding, use PostgreSQL's native **declarative partitioning** to validate the model:

```sql
-- Example: partition bookmarks by userId hash
CREATE TABLE bookmarks (
    id TEXT NOT NULL,
    user_id TEXT NOT NULL,
    ...
) PARTITION BY HASH (user_id);

CREATE TABLE bookmarks_p0 PARTITION OF bookmarks FOR VALUES WITH (MODULUS 8, REMAINDER 0);
CREATE TABLE bookmarks_p1 PARTITION OF bookmarks FOR VALUES WITH (MODULUS 8, REMAINDER 1);
-- ... etc
```

**Tables to partition** (high-row-count, user-scoped):
- `bookmarks` (core data)
- `bookmarkLinks`, `bookmarkTexts`, `bookmarkAssets` (1:1 with bookmarks)
- `tagsOnBookmarks` (junction, very high row count)
- `assets` (storage metadata, used for quota sums)
- `highlights`, `userReadingProgress`
- `importStagingBookmarks` (bulk operations)

**Tables to keep unpartitioned** (low cardinality or global):
- `user`, `account`, `session`, `verificationToken` (auth, queried by email/token)
- `config` (global key-value)
- `invites` (queried by token)
- `subscriptions` (low row count)

### Phase 3: Distributed Sharding (Multiple Databases)

When a single PostgreSQL instance is no longer sufficient:

#### Architecture

**Global Database** -- Stores data that must be queryable across all users:
- `user` (lookup by email, id)
- `account`, `session`, `verificationToken`, `passwordResetToken`
- `config`, `invites`, `subscriptions`
- **Shard map**: `userId → shardId` mapping

**User Shard Databases** (N shards) -- Each stores the full set of user-scoped tables for a subset of users:
- `bookmarks`, `bookmarkLinks`, `bookmarkTexts`, `bookmarkAssets`
- `bookmarkTags`, `tagsOnBookmarks`
- `bookmarkLists`, `bookmarksInLists`
- `assets`, `highlights`, `userReadingProgress`
- `rssFeeds`, `rssFeedImports`
- `customPrompts`, `ruleEngineRules`, `ruleEngineActions`
- `webhooks`, `apiKey`
- `importSessions`, `importSessionBookmarks`, `importStagingBookmarks`
- `backups`

#### Routing Layer

```typescript
// Pseudocode for shard-aware DB access
class ShardRouter {
  private shardMap: Map<string, number>; // userId → shardId
  private shards: Map<number, DrizzleDB>; // shardId → DB connection

  getDbForUser(userId: string): DrizzleDB {
    const shardId = this.shardMap.get(userId)
        ?? consistentHash(userId, this.shards.size);
    return this.shards.get(shardId)!;
  }

  getGlobalDb(): DrizzleDB {
    return this.globalDb;
  }
}
```

**Integration with existing code:** The current `AuthedContext` already carries `ctx.db` and `ctx.user.id`. Modify the context factory to resolve the shard:

```typescript
// Before (single DB)
const ctx = { db: globalDb, user };

// After (sharded)
const ctx = { db: shardRouter.getDbForUser(user.id), globalDb, user };
```

Most tRPC routers need **zero changes** since they already use `ctx.db` exclusively.

#### Handling Shared Lists (The Hard Part)

Shared lists (`listCollaborators`) are the **only cross-user data access pattern**. When User A shares a list with User B, User B needs to read bookmarks owned by User A.

**Option A: Cross-shard reads (recommended)**
- When User B accesses a shared list, the routing layer resolves User A's shard from the global DB
- Fetches the list data from User A's shard
- Simple, consistent, no data duplication
- Slightly higher latency for shared list access (extra DB round-trip)

```typescript
async getSharedList(listId: string, requestingUserId: string) {
  // 1. Look up list ownership in global DB
  const { ownerId } = await globalDb.query.listOwnership.findFirst({
    where: eq(listOwnership.listId, listId)
  });

  // 2. Route to owner's shard
  const ownerDb = shardRouter.getDbForUser(ownerId);

  // 3. Verify access & fetch
  const collab = await ownerDb.query.listCollaborators.findFirst({
    where: and(eq(listCollaborators.listId, listId),
               eq(listCollaborators.userId, requestingUserId))
  });
  if (!collab) throw new TRPCError({ code: "FORBIDDEN" });

  return ownerDb.query.bookmarkLists.findFirst({ ... });
}
```

**Option B: Materialized references**
- Store lightweight references to shared lists in the collaborator's shard
- Fetch full data from owner's shard on access
- Better for listing "my shared lists" without cross-shard scatter

**Option C: Denormalize shared list bookmarks**
- Copy bookmark data into collaborator's shard
- Requires eventual consistency and sync mechanisms
- Only consider if shared list read latency becomes critical

#### Handling Background Workers

Workers currently process jobs from queues and write results back. With sharding:

1. **Job payloads must include `userId`** (most already do via `bookmarkId` lookup)
2. Workers resolve the correct shard before writing:
   ```typescript
   const db = shardRouter.getDbForUser(job.userId);
   await db.update(bookmarkLinks).set({ crawlStatus: "success" }).where(...);
   ```
3. The job queue itself (Redis/BullMQ) remains unsharded -- it's just a dispatcher

#### Handling Search (Meilisearch)

Meilisearch is already a separate service. With sharding:
- Each shard's indexing worker writes to the same Meilisearch instance
- Search results return `bookmarkId` + `userId`, which routes to the correct shard for full data fetch
- Alternatively, run per-shard Meilisearch indices for isolation

## Migration Path Summary

| Phase | Effort | Benefit |
|-------|--------|---------|
| **1. SQLite → PostgreSQL** | Medium | Concurrent writes, connection pooling, read replicas |
| **2. Table partitioning** | Low | Validate shard key, improve query planning, easier maintenance |
| **3. Distributed shards** | High | Horizontal scaling, per-user data isolation, independent scaling |

## What NOT to Shard

- **Auth tables**: Keep in a single global DB. Auth is low-write, high-read, and must be globally consistent.
- **Config table**: Single global key-value store.
- **Meilisearch**: Already external. Can be scaled independently.
- **Asset storage**: Already uses object storage (filesystem/S3). Not a DB concern.

## Key Risks

1. **Cross-shard transactions**: Shared list operations (add collaborator, add bookmark to shared list) may need two-phase commit or eventual consistency. Recommendation: accept eventual consistency for shared list membership.

2. **Shard rebalancing**: Moving users between shards requires copying all their data atomically. Mitigate by over-provisioning shards upfront (e.g., 64 logical shards mapped to fewer physical DBs).

3. **Schema migrations**: Must be applied to all shards. Use a migration orchestrator that rolls out to one shard first, validates, then proceeds.

4. **Global aggregations**: Admin queries that span all users (e.g., total bookmark count) require scatter-gather across all shards. Keep admin-specific aggregations in the global DB via async rollup jobs.

## Alternative: Per-User SQLite (SQLite Sharding)

An unconventional but viable alternative given the current SQLite architecture:

- One SQLite file per user: `${DATA_DIR}/users/${userId}/db.db`
- Perfect isolation, no cross-user interference
- Backups are per-user (already a feature)
- Shared lists use cross-database reads via `ATTACH DATABASE`

**Pros**: Zero migration from SQLite, perfect isolation, simple backup/restore per user
**Cons**: Thousands of open file handles, no connection pooling, `ATTACH` has limits (max 10 DBs), harder to run admin queries

This approach works surprisingly well for deployments up to ~10K users but doesn't scale beyond that.

## Recommendation

For Karakeep's current architecture and scale:

1. **Short term**: Enable WAL mode, add read connection pooling, optimize heavy queries (quota checks, tag stats)
2. **Medium term**: Migrate to PostgreSQL (Phase 1), add table partitioning (Phase 2)
3. **Long term**: Distributed sharding (Phase 3) only when single-PostgreSQL vertical scaling is exhausted

The user-based shard key is already implicit in the schema. The main engineering work is the SQLite→PostgreSQL migration and the routing layer -- the business logic (tRPC routers) needs minimal changes.
