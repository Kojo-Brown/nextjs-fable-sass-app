# JobTrack

A job application tracker with AI resume matching, built with Next.js 16
(App Router), React 19, TypeScript, PostgreSQL + Drizzle, and Sass.

**Features**

- Session auth with roles (user/admin), bcrypt hashing, hashed session tokens
- Applications CRUD with search, status filters, pagination, and optimistic UI
- Resume uploads (PDF/TXT/MD) with text extraction and authenticated downloads
- AI resume-to-job matching (Claude) running on a Postgres-backed job queue
- Stats dashboard with date-range filtering
- IP rate limiting on auth and AI endpoints

## Getting started

Requirements: Node 20+, PostgreSQL 15+.

```bash
npm install
cp .env.example .env          # fill in DATABASE_URL, JOBS_RUNNER_SECRET
createdb fable_jobs
npm run db:migrate            # apply Drizzle migrations
npm run db:seed               # demo@example.com / admin@example.com, pw: password123, +10k rows
npm run dev
```

`ANTHROPIC_API_KEY` is optional — without it, match requests record a
"degraded" result instead of failing.

### Background jobs

AI calls run out-of-band on a DB-backed queue. In dev, a Server Action drains
the queue after responding (`after()`); in production, hit the runner on a
schedule:

```bash
curl -X POST -H "Authorization: Bearer $JOBS_RUNNER_SECRET" https://your-app/api/jobs/run
```

(Vercel Cron, systemd timer, or the `jobs-cron` service in docker-compose.)

### Docker

```bash
JOBS_RUNNER_SECRET=$(openssl rand -hex 32) docker compose up --build
```

Brings up Postgres 16, the standalone Next.js server, and a cron sidecar that
drains the job queue every minute. Run migrations once with
`docker compose exec web sh -c "cd /app && node_modules/.bin/drizzle-kit migrate"`
or from the host with `DATABASE_URL` pointed at the container.

## Scripts

| Script | What it does |
|---|---|
| `npm run dev` | Dev server (Turbopack) |
| `npm run build` / `start` | Production build / serve |
| `npm test` | Vitest unit + component tests |
| `npm run db:generate` | Generate a migration from `lib/db/schema.ts` |
| `npm run db:migrate` | Apply migrations |
| `npm run db:seed` | Seed demo users + 10k applications |

## Architecture

See [ARCHITECTURE.md](ARCHITECTURE.md) for the full write-up. The short
version:

```
app/
  (auth)/            login, register — Server Actions + useActionState
  (dashboard)/       shell layout, dashboard, applications, resumes, admin
  api/jobs/run       machine-auth Route Handler that drains the job queue
  api/resumes/.../download   authenticated file streaming
lib/
  dal/               THE security boundary — every function re-checks the session
  db/                Drizzle schema, client, seed
  auth/              password hashing, session cookies (hashed tokens)
  jobs/              queue (SKIP LOCKED, retries, idempotency) + workers
  ai/                Claude structured-output matcher
  validation/        Zod schemas shared by actions and forms
proxy.ts             optimistic redirects ONLY — never authorization
```

**The one rule that matters:** authorization lives in the Data Access Layer
(`lib/dal/`), next to the data. `proxy.ts` (Next 16's middleware) only does
cookie-presence redirects — middleware bypass CVEs (e.g. CVE-2025-29927) make
it unsuitable as a security boundary.
