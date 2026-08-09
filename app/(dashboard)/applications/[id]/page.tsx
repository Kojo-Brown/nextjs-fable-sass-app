import Link from "next/link";
import { notFound } from "next/navigation";
import { getApplication } from "@/lib/dal/applications";
import { getMatchState } from "@/lib/dal/matches";
import { listResumes } from "@/lib/dal/resumes";
import { DeleteButton } from "./delete-button";
import { MatchPanel } from "./match-panel";
import { StatusSwitcher } from "./status-switcher";
import styles from "./detail.module.scss";

const dateFmt = new Intl.DateTimeFormat("en-US", { dateStyle: "medium" });
const money = new Intl.NumberFormat("en-US", {
  style: "currency",
  currency: "USD",
  maximumFractionDigits: 0,
});

export default async function ApplicationDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  // getApplication scopes by the session user — someone else's UUID 404s.
  const app = await getApplication(id);
  if (!app) notFound();

  const [matchState, resumes] = await Promise.all([
    getMatchState(app.id),
    listResumes(),
  ]);

  return (
    <div className={styles.detail}>
      <div className={styles.header}>
        <div>
          <h1>
            {app.position} · {app.company}
          </h1>
          <p className={styles.meta}>
            {app.location ?? "No location"} · added {dateFmt.format(app.createdAt)}
            {app.appliedAt && <> · applied {dateFmt.format(app.appliedAt)}</>}
          </p>
        </div>
        <div className={styles.actions}>
          <Link className={styles.edit} href={`/applications/${app.id}/edit`}>
            Edit
          </Link>
          <DeleteButton id={app.id} />
        </div>
      </div>

      <StatusSwitcher id={app.id} status={app.status} />

      <dl className={styles.grid}>
        <div>
          <dt>Salary range</dt>
          <dd>
            {app.salaryMin || app.salaryMax
              ? `${app.salaryMin ? money.format(app.salaryMin) : "?"} – ${
                  app.salaryMax ? money.format(app.salaryMax) : "?"
                }`
              : "—"}
          </dd>
        </div>
        <div>
          <dt>Posting</dt>
          <dd>
            {app.url ? (
              <a href={app.url} target="_blank" rel="noreferrer">
                {new URL(app.url).hostname}
              </a>
            ) : (
              "—"
            )}
          </dd>
        </div>
      </dl>

      {app.jobDescription && (
        <section>
          <h2>Job description</h2>
          <p className={styles.longText}>{app.jobDescription}</p>
        </section>
      )}

      {app.notes && (
        <section>
          <h2>Notes</h2>
          <p className={styles.longText}>{app.notes}</p>
        </section>
      )}

      <MatchPanel
        applicationId={app.id}
        resumes={resumes.map((r) => ({
          id: r.id,
          filename: r.filename,
          hasText: r.extractedText !== null,
        }))}
        results={matchState.results}
        pending={matchState.pending}
      />
    </div>
  );
}
