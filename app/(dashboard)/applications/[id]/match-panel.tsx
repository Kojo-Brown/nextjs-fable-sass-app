"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState, useTransition } from "react";
import type { MatchWithResume } from "@/lib/dal/matches";
import { requestMatchAction } from "./match-actions";
import styles from "./match-panel.module.scss";

type ResumeOption = { id: string; filename: string; hasText: boolean };

export function MatchPanel({
  applicationId,
  resumes,
  results,
  pending,
}: {
  applicationId: string;
  resumes: ResumeOption[];
  results: MatchWithResume[];
  pending: boolean;
}) {
  const router = useRouter();
  const [resumeId, setResumeId] = useState(resumes.find((r) => r.hasText)?.id ?? "");
  const [error, setError] = useState<string | null>(null);
  const [submitting, startTransition] = useTransition();

  // While a match job is queued/running, poll the server for the result.
  useEffect(() => {
    if (!pending) return;
    const timer = setInterval(() => router.refresh(), 4000);
    return () => clearInterval(timer);
  }, [pending, router]);

  return (
    <section className={styles.panel}>
      <h2>AI resume match</h2>

      {resumes.length === 0 ? (
        <p className={styles.muted}>
          Upload a resume on the Resumes page to unlock matching.
        </p>
      ) : (
        <div className={styles.controls}>
          <select
            aria-label="Resume to match"
            value={resumeId}
            onChange={(e) => setResumeId(e.target.value)}
          >
            {resumes.map((r) => (
              <option key={r.id} value={r.id} disabled={!r.hasText}>
                {r.filename}
                {!r.hasText && " (no extracted text)"}
              </option>
            ))}
          </select>
          <button
            disabled={!resumeId || submitting || pending}
            onClick={() => {
              setError(null);
              startTransition(async () => {
                const result = await requestMatchAction(applicationId, resumeId);
                if (result.error) setError(result.error);
                else router.refresh();
              });
            }}
          >
            {pending ? "Matching…" : submitting ? "Queueing…" : "Run match"}
          </button>
        </div>
      )}

      {error && <p className={styles.error}>{error}</p>}
      {pending && (
        <p className={styles.muted}>
          Match queued — the AI call runs in a background job. This updates
          automatically.
        </p>
      )}

      {results.map((r) => (
        <article key={r.id} className={styles.result}>
          <header>
            <strong>{r.resumeFilename}</strong>
            {r.verdict ? (
              <span className={styles.score} data-band={band(r.verdict.score)}>
                {r.verdict.score}/100
              </span>
            ) : (
              <span className={styles.degraded}>unavailable</span>
            )}
          </header>
          {r.verdict ? (
            <>
              <p>{r.verdict.summary}</p>
              <div className={styles.columns}>
                <div>
                  <h3>Strengths</h3>
                  <ul>
                    {r.verdict.strengths.map((s, i) => (
                      <li key={i}>{s}</li>
                    ))}
                  </ul>
                </div>
                <div>
                  <h3>Gaps</h3>
                  <ul>
                    {r.verdict.gaps.map((g, i) => (
                      <li key={i}>{g}</li>
                    ))}
                  </ul>
                </div>
              </div>
              {r.model && <p className={styles.muted}>Scored by {r.model}</p>}
            </>
          ) : (
            <p className={styles.muted}>
              AI matching was unavailable for this run (missing API key, or the
              resume/job description had no usable text). The application data
              is unaffected.
            </p>
          )}
        </article>
      ))}
    </section>
  );
}

function band(score: number): string {
  if (score >= 75) return "high";
  if (score >= 50) return "mid";
  return "low";
}
