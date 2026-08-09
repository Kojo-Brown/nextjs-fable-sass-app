"use server";

import { revalidatePath } from "next/cache";
import { after } from "next/server";
import { z } from "zod";
import { requestMatch } from "@/lib/dal/matches";
import { processPendingJobs } from "@/lib/jobs/queue";

export async function requestMatchAction(
  applicationId: string,
  resumeId: string,
): Promise<{ error?: string }> {
  const parsed = z
    .object({ applicationId: z.string().uuid(), resumeId: z.string().uuid() })
    .safeParse({ applicationId, resumeId });
  if (!parsed.success) return { error: "Invalid request." };

  const result = await requestMatch(parsed.data.applicationId, parsed.data.resumeId);
  if (result.error) return result;

  // Kick the queue after the response is sent — the user gets an instant
  // "queued" state and the slow AI call runs out-of-band. In production a
  // cron hitting /api/jobs/run provides the reliable drain; this is a fast path.
  after(async () => {
    try {
      await processPendingJobs(3);
    } catch (err) {
      console.error("job runner tick failed", err);
    }
  });

  revalidatePath(`/applications/${applicationId}`);
  return {};
}
