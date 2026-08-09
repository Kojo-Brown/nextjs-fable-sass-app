# Architecture

Decisions and their reasons, in the order you'd hit them reading the code.

## Rendering model

Pages are Server Components by default; the client boundary is pushed to the
leaves (`"use client"` marks entry points: forms, the status switcher, filters,
the chart). Everything data-touching renders on the server, so no query code or
DB credentials ever reach the bundle — `server-only` imports enforce this at
build time.

`loading.tsx` files wrap their segment in a Suspense boundary: the shell
streams immediately, the skeleton shows while the page's data resolves.

## Data Access Layer — the security boundary

Every function in `lib/dal/` derives the current user from the session cookie
itself (`verifySession`, memoized per-request with React's `cache()`) and
scopes queries to that user. Callers never pass a `userId` in — that is how
IDOR happens.

Why not middleware? Next.js has shipped middleware/proxy authorization-bypass
CVEs (CVE-2025-29927 being the best known). `proxy.ts` therefore only does
optimistic cookie-presence redirects for UX; the check that matters runs next
to the data, on every access. The layout's `requireUser()` is defense-in-depth,
not the defense.

Sessions store a SHA-256 hash of the cookie token, never the token, so a DB
dump cannot be replayed as a session. Cookies are httpOnly, SameSite=Lax,
Secure in production.

## Mutations

Server Actions handle all user mutations. Because actions are public HTTP
endpoints, each one:

1. rate-limits where abuse is cheap (auth, AI),
2. validates input with Zod at the boundary,
3. authorizes via the DAL (never trusting client-supplied IDs beyond shape),
4. calls `revalidatePath` so cached RSC payloads refresh.

Route Handlers are used only where actions are the wrong tool: streaming a
file download (GET semantics, binary body) and the machine-authenticated job
runner (bearer secret, timing-safe compare).

Forms use `useActionState` for pending/error state and stay functional
without JavaScript; `useOptimistic` powers instant status changes and list
removals, reverting automatically if the action fails.

## Job queue

AI calls are slow and flaky, so they never run inside a user request. The
queue is a Postgres table:

- **Claiming** — `FOR UPDATE SKIP LOCKED` in a single UPDATE…RETURNING, so
  any number of runners can drain concurrently without double-claiming.
- **Idempotency** — a unique key per logical work item makes re-enqueueing a
  no-op (keys include an hour bucket so users can deliberately re-run later).
- **Retries** — 3 attempts with exponential backoff (30s/2m/8m); a 60s
  timeout per job; jobs stuck in `running` >5min are reset (dead runner).
- **Draining** — `after()` in the enqueue action gives a fast path in the
  same process; a cron hitting `POST /api/jobs/run` is the reliable path.

Postgres-as-broker is a deliberate trade-off: one less piece of
infrastructure, transactional with app data, fine at this scale. Swap for a
real broker when job volume or fan-out demands it — the worker interface
doesn't change.

## AI matching

`lib/ai/match.ts` calls Claude (`claude-opus-5`) through the official SDK with
a JSON-schema constrained output, so the verdict parses or fails loudly —
then it's still Zod-validated as a second gate. Failure design:

- no API key → degraded result recorded, feature visibly "unavailable"
- safety refusal → server-side fallback re-runs on Anthropic's recommended
  model inside the same call; a full-chain refusal degrades gracefully
- unparseable output → thrown, so the queue's retry/backoff applies
- cost control → inputs truncated to 20k chars each, `max_tokens: 2048`,
  20 requests/IP/hour rate limit

The worker re-verifies row ownership at execution time, not just enqueue
time — jobs can run long after the request that queued them.

## Database

Drizzle over Postgres with migrations generated from the schema
(`drizzle-kit generate`) and applied explicitly (`db:migrate`) — never pushed
implicitly. Indexes follow the query shapes: every dashboard query is scoped
by user, filtered by status or ordered by recency, hence composite
`(user_id, status)` and `(user_id, created_at desc)` indexes. The stats
aggregations group on `date_trunc('month', …)` over the same index.

The seed writes 10k rows so slow-query work is observable (`EXPLAIN ANALYZE`
has something to chew on).

## Caching

Data reads happen in dynamic RSCs (every page calls `cookies()` via the DAL,
opting into dynamic rendering — correct for per-user data). Mutations call
`revalidatePath` on the routes they affect. Request memoization via
`cache(verifySession)` collapses the layout's and page's session lookups into
one query per request.

## Files

Uploads go through a storage adapter (`lib/storage.ts`) with a path-traversal
guard; the interface (save/remove/stream by relative path) is what a presigned
object-storage swap would keep. Downloads stream through an authenticated
Route Handler so ownership is checked per request — files are never publicly
addressable.

## Deployment

`output: "standalone"` + multi-stage Dockerfile (non-root user, uploads
volume) + docker-compose with Postgres and a cron sidecar. On Vercel the same
app works with Vercel Cron pointed at `/api/jobs/run` — but note the
in-memory rate limiter and local uploads dir assume a single long-lived
process; serverless deploys should swap in Redis and object storage at those
two seams (both are isolated behind one file each).
