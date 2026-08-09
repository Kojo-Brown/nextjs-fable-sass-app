import "server-only";
import { and, eq, lte, sql } from "drizzle-orm";
import { db } from "@/lib/db";
import { jobs, type Job } from "@/lib/db/schema";
import { runResumeMatch } from "./workers/resume-match";

const JOB_TIMEOUT_MS = 60_000;

const workers: Record<
  string,
  (payload: Record<string, unknown>) => Promise<void>
> = {
  "resume-match": runResumeMatch,
};

/* DB-backed queue. Postgres is the broker: enqueue inserts a row, workers
 * claim with FOR UPDATE SKIP LOCKED so concurrent runners never double-claim.
 * Idempotency keys make re-enqueueing the same logical work a no-op. */

export async function enqueue(
  type: string,
  payload: Record<string, unknown>,
  idempotencyKey: string,
): Promise<{ enqueued: boolean }> {
  const rows = await db
    .insert(jobs)
    .values({ type, payload, idempotencyKey })
    .onConflictDoNothing({ target: jobs.idempotencyKey })
    .returning({ id: jobs.id });
  return { enqueued: rows.length > 0 };
}

async function claimNext(): Promise<Job | null> {
  // Atomically claim one due job; SKIP LOCKED lets parallel runners coexist.
  const rows = await db.execute<Job>(sql`
    update jobs set status = 'running', updated_at = now()
    where id = (
      select id from jobs
      where status = 'pending' and run_after <= now()
      order by created_at
      for update skip locked
      limit 1
    )
    returning id, type, payload, status, idempotency_key as "idempotencyKey",
      attempts, max_attempts as "maxAttempts", run_after as "runAfter",
      last_error as "lastError", created_at as "createdAt", updated_at as "updatedAt"
  `);
  return rows[0] ?? null;
}

function withTimeout(promise: Promise<void>, ms: number): Promise<void> {
  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => reject(new Error(`Job timed out after ${ms}ms`)), ms);
    promise.then(
      () => { clearTimeout(timer); resolve(); },
      (err) => { clearTimeout(timer); reject(err); },
    );
  });
}

export async function processPendingJobs(maxJobs = 5): Promise<{
  processed: number;
  failed: number;
}> {
  let processed = 0;
  let failed = 0;

  for (let i = 0; i < maxJobs; i++) {
    const job = await claimNext();
    if (!job) break;

    const worker = workers[job.type];
    try {
      if (!worker) throw new Error(`Unknown job type: ${job.type}`);
      await withTimeout(worker(job.payload), JOB_TIMEOUT_MS);
      await db
        .update(jobs)
        .set({ status: "done", updatedAt: new Date() })
        .where(eq(jobs.id, job.id));
      processed++;
    } catch (err) {
      const attempts = job.attempts + 1;
      const exhausted = attempts >= job.maxAttempts;
      await db
        .update(jobs)
        .set({
          status: exhausted ? "failed" : "pending",
          attempts,
          lastError: err instanceof Error ? err.message : String(err),
          // Exponential backoff: 30s, 2m, 8m
          runAfter: new Date(Date.now() + 30_000 * 4 ** (attempts - 1)),
          updatedAt: new Date(),
        })
        .where(eq(jobs.id, job.id));
      failed++;
    }
  }

  // Recover jobs stuck in 'running' (e.g. process died mid-job).
  await db
    .update(jobs)
    .set({ status: "pending", updatedAt: new Date() })
    .where(
      and(
        eq(jobs.status, "running"),
        lte(jobs.updatedAt, new Date(Date.now() - 5 * 60_000)),
      ),
    );

  return { processed, failed };
}
