import "server-only";
import { and, eq } from "drizzle-orm";
import { z } from "zod";
import { matchResumeToJob } from "@/lib/ai/match";
import { db } from "@/lib/db";
import { applications, matchResults, resumes } from "@/lib/db/schema";

const payloadSchema = z.object({
  applicationId: z.string().uuid(),
  resumeId: z.string().uuid(),
  userId: z.string().uuid(),
});

export async function runResumeMatch(
  rawPayload: Record<string, unknown>,
): Promise<void> {
  const { applicationId, resumeId, userId } = payloadSchema.parse(rawPayload);

  // Re-verify ownership at execution time — the job may run long after the
  // enqueue-time check, and rows may have changed hands or been deleted.
  const [application, resume] = await Promise.all([
    db.query.applications.findFirst({
      where: and(eq(applications.id, applicationId), eq(applications.userId, userId)),
    }),
    db.query.resumes.findFirst({
      where: and(eq(resumes.id, resumeId), eq(resumes.userId, userId)),
    }),
  ]);

  if (!application?.jobDescription || !resume?.extractedText) {
    // Nothing to match against; record a degraded result instead of retrying.
    await upsertResult(applicationId, resumeId, null, null, true);
    return;
  }

  const outcome = await matchResumeToJob(
    resume.extractedText,
    application.jobDescription,
  );

  if (outcome.ok) {
    await upsertResult(applicationId, resumeId, outcome.verdict, outcome.model, false);
  } else if (outcome.reason === "no_api_key" || outcome.reason === "refused") {
    await upsertResult(applicationId, resumeId, null, null, true);
  } else {
    // invalid_output — worth a retry; throwing lets the queue back off.
    throw new Error("AI returned unparseable output");
  }
}

async function upsertResult(
  applicationId: string,
  resumeId: string,
  verdict: { score: number; summary: string; strengths: string[]; gaps: string[] } | null,
  model: string | null,
  degraded: boolean,
): Promise<void> {
  await db
    .insert(matchResults)
    .values({ applicationId, resumeId, verdict, model, degraded })
    .onConflictDoUpdate({
      target: [matchResults.applicationId, matchResults.resumeId],
      set: { verdict, model, degraded, createdAt: new Date() },
    });
}
