import "server-only";
import { and, desc, eq, inArray, like } from "drizzle-orm";
import { db } from "@/lib/db";
import {
  applications,
  jobs,
  matchResults,
  resumes,
  type MatchResult,
} from "@/lib/db/schema";
import { enqueue } from "@/lib/jobs/queue";
import { requireUser } from "./session";

export type MatchWithResume = MatchResult & { resumeFilename: string };

export async function getMatchState(applicationId: string): Promise<{
  results: MatchWithResume[];
  pending: boolean;
}> {
  const user = await requireUser();

  // Ownership: only surface matches for the caller's own application.
  const app = await db.query.applications.findFirst({
    where: and(eq(applications.id, applicationId), eq(applications.userId, user.id)),
    columns: { id: true },
  });
  if (!app) return { results: [], pending: false };

  const [rows, pendingJobs] = await Promise.all([
    db
      .select({
        id: matchResults.id,
        applicationId: matchResults.applicationId,
        resumeId: matchResults.resumeId,
        verdict: matchResults.verdict,
        model: matchResults.model,
        degraded: matchResults.degraded,
        createdAt: matchResults.createdAt,
        resumeFilename: resumes.filename,
      })
      .from(matchResults)
      .innerJoin(resumes, eq(matchResults.resumeId, resumes.id))
      .where(eq(matchResults.applicationId, applicationId))
      .orderBy(desc(matchResults.createdAt)),
    db
      .select({ id: jobs.id })
      .from(jobs)
      .where(
        and(
          inArray(jobs.status, ["pending", "running"]),
          like(jobs.idempotencyKey, `match:${applicationId}:%`),
        ),
      ),
  ]);

  return { results: rows, pending: pendingJobs.length > 0 };
}

export async function requestMatch(
  applicationId: string,
  resumeId: string,
): Promise<{ error?: string }> {
  const user = await requireUser();

  const [app, resume] = await Promise.all([
    db.query.applications.findFirst({
      where: and(eq(applications.id, applicationId), eq(applications.userId, user.id)),
      columns: { id: true, jobDescription: true },
    }),
    db.query.resumes.findFirst({
      where: and(eq(resumes.id, resumeId), eq(resumes.userId, user.id)),
      columns: { id: true, extractedText: true },
    }),
  ]);

  if (!app) return { error: "Application not found." };
  if (!resume) return { error: "Resume not found." };
  if (!app.jobDescription) {
    return { error: "Add a job description to this application first." };
  }
  if (!resume.extractedText) {
    return { error: "That resume has no extracted text — upload a text-based file." };
  }

  // Key includes a coarse time bucket so users can re-run a match later
  // without duplicating work queued in the same hour.
  const bucket = Math.floor(Date.now() / 3_600_000);
  await enqueue(
    "resume-match",
    { applicationId, resumeId, userId: user.id },
    `match:${applicationId}:${resumeId}:${bucket}`,
  );

  return {};
}
