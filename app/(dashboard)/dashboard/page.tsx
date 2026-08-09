import type { Metadata } from "next";
import Link from "next/link";
import { requireUser } from "@/lib/dal/session";
import { getStats, STAT_RANGES, type StatRange } from "@/lib/dal/stats";
import { APPLICATION_STATUSES } from "@/lib/validation/application";
import { MonthlyChart } from "./monthly-chart";
import styles from "./dashboard.module.scss";

export const metadata: Metadata = { title: "Dashboard" };

const RANGE_LABELS: Record<StatRange, string> = {
  "30d": "30 days",
  "90d": "90 days",
  "1y": "1 year",
  all: "All time",
};

export default async function DashboardPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const user = await requireUser();
  const raw = (await searchParams).range;
  const range: StatRange = STAT_RANGES.includes(raw as StatRange)
    ? (raw as StatRange)
    : "90d";

  const stats = await getStats(range);
  const maxStatus = Math.max(1, ...Object.values(stats.byStatus));

  return (
    <div className={styles.page}>
      <div className={styles.header}>
        <h1>Hi {user.name.split(" ")[0]} — your pipeline</h1>
        <nav className={styles.ranges} aria-label="Date range">
          {STAT_RANGES.map((r) => (
            <Link
              key={r}
              href={`/dashboard?range=${r}`}
              data-active={r === range}
            >
              {RANGE_LABELS[r]}
            </Link>
          ))}
        </nav>
      </div>

      <div className={styles.tiles}>
        <div className={styles.tile}>
          <dt>Total applications</dt>
          <dd>{stats.total.toLocaleString()}</dd>
        </div>
        <div className={styles.tile}>
          <dt>Active pipeline</dt>
          <dd>
            {(stats.byStatus.applied + stats.byStatus.interviewing).toLocaleString()}
          </dd>
        </div>
        <div className={styles.tile}>
          <dt>Offers</dt>
          <dd>{stats.byStatus.offer.toLocaleString()}</dd>
        </div>
        <div className={styles.tile}>
          <dt>Response rate</dt>
          <dd>
            {stats.responseRate === null
              ? "—"
              : `${Math.round(stats.responseRate * 100)}%`}
          </dd>
        </div>
      </div>

      <section className={styles.card}>
        <h2>Applications per month</h2>
        {stats.monthly.length === 0 ? (
          <p className={styles.empty}>
            No applications in this range. <Link href="/applications/new">Add one</Link>.
          </p>
        ) : (
          <MonthlyChart data={stats.monthly} />
        )}
      </section>

      <section className={styles.card}>
        <h2>By status</h2>
        <ul className={styles.statusList}>
          {APPLICATION_STATUSES.map((status) => (
            <li key={status}>
              <span className={styles.statusLabel}>{status}</span>
              <span className={styles.statusTrack}>
                <span
                  className={styles.statusBar}
                  data-status={status}
                  style={{ width: `${(stats.byStatus[status] / maxStatus) * 100}%` }}
                />
              </span>
              <span className={styles.statusCount}>
                {stats.byStatus[status].toLocaleString()}
              </span>
            </li>
          ))}
        </ul>
      </section>
    </div>
  );
}
