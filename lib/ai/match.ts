import "server-only";
import Anthropic from "@anthropic-ai/sdk";
import { z } from "zod";
import type { MatchVerdict } from "@/lib/db/schema";

const MODEL = "claude-opus-5";

const verdictSchema = z.object({
  score: z.number().min(0).max(100),
  summary: z.string(),
  strengths: z.array(z.string()).max(6),
  gaps: z.array(z.string()).max(6),
});

const verdictJsonSchema = {
  type: "object",
  properties: {
    score: {
      type: "integer",
      description: "Overall fit from 0 (no match) to 100 (perfect match)",
    },
    summary: {
      type: "string",
      description: "Two or three sentences summarizing the fit",
    },
    strengths: {
      type: "array",
      items: { type: "string" },
      description: "Resume points that match the job's requirements",
    },
    gaps: {
      type: "array",
      items: { type: "string" },
      description: "Requirements the resume does not demonstrate",
    },
  },
  required: ["score", "summary", "strengths", "gaps"],
  additionalProperties: false,
} as const;

export type MatchOutcome =
  | { ok: true; verdict: MatchVerdict; model: string }
  | { ok: false; reason: "no_api_key" | "refused" | "invalid_output" };

/* Cost control: inputs are truncated to bounded sizes and max_tokens is small.
 * Degradation: a missing key, a refusal, or unparseable output all return a
 * structured failure — the job worker records it instead of crashing. */
export async function matchResumeToJob(
  resumeText: string,
  jobDescription: string,
): Promise<MatchOutcome> {
  if (!process.env.ANTHROPIC_API_KEY) {
    return { ok: false, reason: "no_api_key" };
  }

  const client = new Anthropic();

  const response = await client.beta.messages.create({
    model: MODEL,
    max_tokens: 2048,
    // Server-side fallback: if safety classifiers decline, the request is
    // re-run on Anthropic's recommended fallback model in the same call.
    betas: ["server-side-fallback-2026-07-01"],
    fallbacks: "default",
    output_config: {
      format: {
        type: "json_schema",
        schema: verdictJsonSchema as unknown as Record<string, unknown>,
      },
    },
    system:
      "You are a precise resume-to-job matcher. Score how well the resume fits the job description. Be specific: cite concrete skills and requirements, not generalities.",
    messages: [
      {
        role: "user",
        content: `<job_description>\n${jobDescription.slice(0, 20_000)}\n</job_description>\n\n<resume>\n${resumeText.slice(0, 20_000)}\n</resume>\n\nScore this resume against this job description.`,
      },
    ],
  });

  // Check stop_reason before touching content — a refusal returns HTTP 200
  // with empty or partial content.
  if (response.stop_reason === "refusal") {
    return { ok: false, reason: "refused" };
  }

  const text = response.content.find((b) => b.type === "text")?.text;
  if (!text) return { ok: false, reason: "invalid_output" };

  try {
    const parsed = verdictSchema.safeParse(JSON.parse(text));
    if (!parsed.success) return { ok: false, reason: "invalid_output" };
    return { ok: true, verdict: parsed.data, model: response.model };
  } catch {
    return { ok: false, reason: "invalid_output" };
  }
}
