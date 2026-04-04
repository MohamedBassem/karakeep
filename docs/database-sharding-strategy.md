# Karakeep Pod Decomposition & Sharding Strategy

## Current Architecture

Karakeep runs as a **monolith** -- a single all-in-one container (via s6-overlay) that bundles:
- Next.js web server (SSR + API routes + tRPC + Hono REST)
- 11 background worker types (crawler, inference, search indexer, etc.)
- SQLite database (single file)
- Plus external services: Meilisearch, headless Chrome, optional Redis

The Docker build already produces separate `web` and `workers` images, but they share the same SQLite file via a volume mount, and workers are toggled by env vars rather than deployed independently.

---

## Target Architecture: Service Pods

```
                         ┌─────────────┐
                         │   Ingress   │
                         │  (nginx/    │
                         │  traefik)   │
                         └──────┬──────┘
                                │
                 ┌──────────────┼──────────────┐
                 ▼              ▼               ▼
          ┌────────────┐ ┌───────────┐  ┌────────────┐
          │  API Pod   │ │  Web Pod  │  │  Public    │
          │  (Hono +   │ │  (Next.js │  │  Asset CDN │
          │   tRPC)    │ │   SSR)    │  │            │
          └─────┬──────┘ └─────┬─────┘  └────────────┘
                │              │
                ▼              ▼
          ┌──────────────────────┐      ┌──────────────┐
          │     Message Queue    │      │   Auth Pod   │
          │  (Redis / Restate)   │      │  (NextAuth)  │
          └──────────┬───────────┘      └──────────────┘
       ┌─────────┬───┴────┬──────────┐
       ▼         ▼        ▼          ▼
  ┌─────────┐ ┌──────┐ ┌──────┐ ┌────────┐
  │Crawler  │ │Infer-│ │Search│ │General │
  │Pod(s)   │ │ence  │ │Index │ │Workers │
  │         │ │Pod   │ │Pod   │ │Pod     │
  └─────────┘ └──────┘ └──────┘ └────────┘
       │                   │
       ▼                   ▼
  ┌─────────┐        ┌──────────┐
  │ Chrome  │        │Meilisearch│
  │ Pod(s)  │        │ Pod       │
  └─────────┘        └──────────┘

       All pods ──▶ PostgreSQL (sharded)
       All pods ──▶ S3 / Asset Storage
       All pods ──▶ Redis (cache + rate limiting)
```

---

## Pod Breakdown

### Pod 1: API Pod (stateless, horizontally scalable)

**What it runs:** Hono REST API + tRPC procedures -- the business logic layer, extracted from Next.js.

**Current code:** `packages/api/` + `packages/trpc/`

**Why separate it:**
- The API is the bottleneck for mobile, CLI, browser extension, and third-party SDK consumers
- Decoupling from Next.js SSR lets you scale API independently of page rendering
- Enables running API closer to users (edge deployment) while keeping SSR centralized

**What changes:**
- Extract the Hono app from `apps/web/app/api/[[...route]]/route.ts` into a standalone Hono server (`apps/api/`)
- Move auth middleware to use JWT validation only (no NextAuth session lookup on every request)
- The API pod connects to PostgreSQL and Redis directly, enqueues jobs to the message queue

**Scaling:** 2-10 replicas behind a load balancer. Stateless -- any replica handles any request.

---

### Pod 2: Web Pod (stateless, horizontally scalable)

**What it runs:** Next.js app for SSR pages and the web UI.

**Current code:** `apps/web/`

**Why separate it:**
- SSR is CPU-bound and memory-hungry (React rendering)
- Separating it lets you scale page rendering independently
- Can be replaced/supplemented with a static export + client-side fetching later

**What changes:**
- Web pod calls the API pod via HTTP (internal service URL) instead of importing tRPC directly
- Or: keep tRPC direct calls for SSR (faster) and use API pod for client-side calls
- Remove worker code entirely -- web pod only serves pages

**Scaling:** 2-5 replicas. Stateless.

---

### Pod 3: Crawler Pod (stateful, resource-intensive)

**What it runs:** `LinkCrawlerQueue` + `LowPriorityCrawlerQueue` workers

**Current code:** `apps/workers/` (crawler + lowPriorityCrawler workers)

**Why separate it:**
- Crawling is the most resource-intensive operation (Playwright, memory, CPU)
- Requires a headless Chrome connection -- tight coupling with Chrome pod
- Import crawling (low-priority) should never starve interactive crawling

**What changes:**
- Deploy as its own service consuming from `link_crawler_queue` and `low_priority_crawler_queue`
- Each pod instance connects to a Chrome pod (or sidecar) via `BROWSER_WEB_URL`
- Writes results to PostgreSQL + S3 for assets

**Scaling:** 1-N replicas. Each consumes jobs independently. Scale based on queue depth.

**Split option:** Run high-priority and low-priority crawlers as separate deployments with different resource limits and replica counts.

---

### Pod 4: Inference Pod (optional, expensive)

**What it runs:** `OpenAIQueue` worker -- AI tagging and summarization

**Current code:** `apps/workers/` (inference worker)

**Why separate it:**
- AI inference has very different cost/latency characteristics
- External API calls (OpenAI) are I/O-bound, not CPU-bound
- Can be scaled to zero when AI features are disabled
- Ollama sidecar deployment needs GPU resources

**What changes:**
- Consumes from `openai_queue`
- Connects to OpenAI API or local Ollama instance
- Writes tags/summaries back to PostgreSQL

**Scaling:** 0-N replicas. Scale based on queue depth. Can be completely disabled.

---

### Pod 5: Search Indexing Pod

**What it runs:** `SearchIndexingQueue` worker

**Current code:** `apps/workers/` (search worker)

**Why separate it:**
- Meilisearch indexing is bursty (bulk imports generate thousands of index jobs)
- Isolating it prevents search lag from affecting other workers
- Can be tuned independently (batch size, concurrency)

**What changes:**
- Consumes from `searching_indexing` queue
- Reads bookmark data from PostgreSQL, writes to Meilisearch

**Scaling:** 1-3 replicas. Meilisearch itself handles concurrent writes.

---

### Pod 6: General Workers Pod

**What it runs:** All remaining workers:
- `webhook` -- delivers webhook events
- `feed` -- refreshes RSS feeds
- `backup` -- creates user backups
- `video` -- downloads videos (yt-dlp)
- `assetPreprocessing` -- image/PDF processing
- `adminMaintenance` -- cleanup tasks
- `ruleEngine` -- automation rules
- `import` -- import session polling

**Why group them:**
- These are lower-volume, less resource-intensive workers
- Splitting each into its own pod would be over-engineering
- Can be split later if any becomes a bottleneck

**What changes:**
- Single deployment consuming from all remaining queues
- Configure via `WORKERS_ENABLED_WORKERS` env var

**Scaling:** 1-3 replicas. Split into separate pods if a specific worker becomes a bottleneck.

---

### Infrastructure Pods (already external)

| Pod | Current | Change |
|-----|---------|--------|
| **Chrome** | Separate container, port 9222 | No change. Scale if crawler pods increase. |
| **Meilisearch** | Separate container, port 7700 | No change. Add replicas for read scaling. |
| **Redis** | Optional (rate limiting) | **Required** -- becomes the shared cache, rate limiter, and optionally the queue backend. |
| **PostgreSQL** | N/A (currently SQLite) | **New** -- replaces SQLite. See database section below. |
| **S3 / Object Storage** | Optional (filesystem default) | **Required** -- shared asset storage across all pods (no more local PVC). |

---

## Queue Architecture

The current queue system uses **Liteque** (SQLite-based, embedded). This won't work across pods.

### Migration: Liteque → Redis-backed queue (or Restate)

The codebase already has a plugin system for queues (`packages/shared/queueing.ts`) with a Restate plugin (`packages/plugins/queue-restate/`). Options:

**Option A: BullMQ (Redis)** -- recommended
- Mature, battle-tested, great observability (Bull Board)
- Write a `queue-bullmq` plugin implementing the existing `QueueProvider` interface
- Redis is already needed for rate limiting, so no new infrastructure

**Option B: Restate** -- already partially implemented
- Built-in durable execution, retries, workflow orchestration
- Heavier infrastructure, more complex operations
- Better for complex multi-step workflows (crawl → infer → index)

**Option C: PostgreSQL-backed queue (pgBoss/Graphile Worker)**
- No new infrastructure beyond PostgreSQL
- Lower throughput than Redis but simpler
- Good fit if queue volume is modest

### Queue topology

```
Queues (in Redis/Restate):
├── link_crawler_queue        → Crawler Pod
├── low_priority_crawler_queue → Crawler Pod (or separate)
├── openai_queue              → Inference Pod
├── searching_indexing        → Search Indexing Pod
├── webhook_queue             → General Workers Pod
├── feed_queue                → General Workers Pod
├── backup_queue              → General Workers Pod
├── video_queue               → General Workers Pod
├── asset_preprocessing_queue → General Workers Pod
├── admin_maintenance_queue   → General Workers Pod
└── rule_engine_queue         → General Workers Pod
```

---

## Database Strategy

### Phase 1: SQLite → PostgreSQL

**Prerequisite for pod decomposition.** SQLite can't be shared across pods (file locking, single-writer).

**Steps:**
1. Add `pgTable` schema variants in `packages/db/` (Drizzle supports both dialects)
2. Replace SQLite-specific features:
   - Generated columns → PostgreSQL `GENERATED ALWAYS AS`
   - `integer` timestamps → `timestamp`
   - JSON text columns → `jsonb`
3. Update `drizzle.ts` to use `postgres-js` driver with connection pooling
4. Write a data migration script (SQLite → PostgreSQL bulk insert)
5. Add PgBouncer for connection pooling across pods

### Phase 2: Table Partitioning (single PostgreSQL)

Use declarative partitioning by `userId` hash on high-volume tables:
- `bookmarks`, `bookmarkLinks`, `bookmarkTexts`, `bookmarkAssets`
- `tagsOnBookmarks`, `assets`, `highlights`

This validates the shard key and improves query planning without application changes.

### Phase 3: Distributed Database Sharding

When single-PostgreSQL vertical scaling is exhausted:

**Global DB** (1 instance):
- `user`, `account`, `session`, `verificationToken`, `passwordResetToken`
- `config`, `invites`, `subscriptions`
- Shard map: `userId → shardId`

**User Shard DBs** (N instances):
- All user-scoped tables (bookmarks, tags, lists, assets, etc.)
- Each shard holds a subset of users

**Routing layer:**
```typescript
// Inject into tRPC context
const ctx = {
  db: shardRouter.getDbForUser(user.id),  // user's shard
  globalDb: shardRouter.getGlobalDb(),     // auth/config
  user,
};
```

**Shared lists (cross-shard):** When User B accesses User A's shared list, resolve User A's shard from the global DB and read from it. Accept slightly higher latency for this uncommon path.

---

## Implementation Phases

### Phase 1: Extract Queue Backend (effort: low)

**Goal:** Replace Liteque with a distributed queue so workers can run in separate processes.

1. Implement `queue-bullmq` plugin (or adopt the existing Restate plugin)
2. Deploy Redis
3. Validate: run web and workers as separate processes pointing at the same Redis

**This alone enables the current `web` + `workers` Docker split to work properly in Kubernetes.**

### Phase 2: SQLite → PostgreSQL (effort: medium)

**Goal:** Enable multiple pods to share a database.

1. Dual-dialect Drizzle schema
2. Migration script
3. Deploy PostgreSQL + PgBouncer
4. Switch `DATABASE_URL` and validate

### Phase 3: Split Workers by Function (effort: low)

**Goal:** Independent scaling of resource-intensive workers.

1. Deploy crawler workers as a separate pod with `WORKERS_ENABLED_WORKERS=crawler,lowPriorityCrawler`
2. Deploy inference workers with `WORKERS_ENABLED_WORKERS=inference`
3. Deploy remaining workers as general-purpose pod
4. Each pod type gets its own resource limits and replica count

**The env var mechanism already exists** -- this is purely a deployment/Kubernetes change.

### Phase 4: Extract API from Next.js (effort: medium)

**Goal:** Independent scaling of API vs SSR.

1. Create `apps/api/` as a standalone Hono server
2. Move tRPC adapter from Next.js API route to standalone server
3. Web pod calls API pod for client-side requests
4. API pod handles mobile/CLI/extension/SDK traffic directly

### Phase 5: Asset Storage Migration (effort: low)

**Goal:** Shared asset access across pods.

1. Switch from filesystem to S3-compatible storage (MinIO for self-hosted)
2. Already supported via `ASSET_STORE_S3_*` env vars
3. Remove PVC dependency from web/worker pods

### Phase 6: Database Sharding (effort: high)

**Goal:** Horizontal database scaling.

Only pursue this after exhausting vertical PostgreSQL scaling (which handles millions of users with proper indexing).

---

## Kubernetes Manifests (Sketch)

```yaml
# API Pod
apiVersion: apps/v1
kind: Deployment
metadata:
  name: karakeep-api
spec:
  replicas: 3
  template:
    spec:
      containers:
      - name: api
        image: karakeep/api:latest
        resources:
          requests: { cpu: 250m, memory: 512Mi }
          limits:   { cpu: 1000m, memory: 1Gi }
        env:
        - name: DATABASE_URL
          valueFrom: { secretKeyRef: { name: db-secret, key: url } }
        - name: REDIS_URL
          value: redis://redis:6379

---
# Crawler Pod
apiVersion: apps/v1
kind: Deployment
metadata:
  name: karakeep-crawler
spec:
  replicas: 2
  template:
    spec:
      containers:
      - name: crawler
        image: karakeep/workers:latest
        resources:
          requests: { cpu: 500m, memory: 1Gi }
          limits:   { cpu: 2000m, memory: 4Gi }
        env:
        - name: WORKERS_ENABLED_WORKERS
          value: "crawler,lowPriorityCrawler"
        - name: BROWSER_WEB_URL
          value: "ws://chrome:9222"

---
# Inference Pod (scale to zero when unused)
apiVersion: apps/v1
kind: Deployment
metadata:
  name: karakeep-inference
spec:
  replicas: 1
  template:
    spec:
      containers:
      - name: inference
        image: karakeep/workers:latest
        resources:
          requests: { cpu: 100m, memory: 256Mi }
        env:
        - name: WORKERS_ENABLED_WORKERS
          value: "inference"

---
# General Workers Pod
apiVersion: apps/v1
kind: Deployment
metadata:
  name: karakeep-workers
spec:
  replicas: 1
  template:
    spec:
      containers:
      - name: workers
        image: karakeep/workers:latest
        env:
        - name: WORKERS_ENABLED_WORKERS
          value: "search,feed,webhook,backup,video,assetPreprocessing,adminMaintenance,ruleEngine"
```

---

## What You Get at Each Phase

| Phase | Pods | Key Unlock |
|-------|------|-----------|
| **1. Distributed queue** | web + workers (2 pods) | Workers can crash/restart independently |
| **2. PostgreSQL** | web + workers + postgres (3 pods) | Multiple readers/writers, connection pooling |
| **3. Split workers** | api + web + crawler + inference + search + workers (6 pods) | Independent scaling per workload type |
| **4. Extract API** | +1 pod | API scales separately from SSR |
| **5. S3 assets** | Same pods, no PVC | Pods are truly stateless |
| **6. DB sharding** | Same pods + multiple DB instances | Horizontal database scaling |

---

## Key Risks & Mitigations

| Risk | Mitigation |
|------|-----------|
| **Increased operational complexity** | Start with Phase 1-3 only. Phases 4-6 are optional and only needed at scale. |
| **Network latency between pods** | Keep pods in the same cluster/region. Use gRPC for internal calls if HTTP becomes a bottleneck. |
| **Queue reliability** | Redis with AOF persistence + Sentinel/Cluster for HA. Or use Restate for durable execution. |
| **Database migration downtime** | Use pgLoader for zero-downtime SQLite→PostgreSQL migration. Run both in parallel during cutover. |
| **Shared list cross-shard reads** | Only relevant in Phase 6. Accept higher latency for this uncommon operation. |
| **Schema migrations across shards** | Phase 6 only. Use a migration orchestrator with canary rollout. |

## Recommendation

**Do Phases 1-3 first.** They give you 90% of the scaling benefit with modest effort:
- Phase 1 (distributed queue) is almost free -- the plugin interface exists
- Phase 2 (PostgreSQL) is the biggest single investment but unlocks everything else
- Phase 3 (split workers) is purely a deployment change -- zero code changes

Phases 4-6 are only worth pursuing when you hit concrete scaling limits, not preemptively.
