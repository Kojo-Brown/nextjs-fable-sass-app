import { timingSafeEqual } from "node:crypto";
import { processPendingJobs } from "@/lib/jobs/queue";

/* Worker tick endpoint — hit it from cron (Vercel Cron, systemd timer, etc.)
 * to drain the queue. Guarded by a bearer secret, not a user session, because
 * the caller is a machine. */
export async function POST(request: Request) {
  const secret = process.env.JOBS_RUNNER_SECRET;
  if (!secret) {
    return Response.json({ error: "JOBS_RUNNER_SECRET not configured" }, { status: 503 });
  }

  const auth = request.headers.get("authorization") ?? "";
  const expected = `Bearer ${secret}`;
  const authBuf = Buffer.from(auth);
  const expectedBuf = Buffer.from(expected);
  const ok =
    authBuf.length === expectedBuf.length && timingSafeEqual(authBuf, expectedBuf);
  if (!ok) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  const result = await processPendingJobs(10);
  return Response.json(result);
}
