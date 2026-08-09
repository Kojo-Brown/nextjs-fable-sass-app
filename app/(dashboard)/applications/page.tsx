import type { Metadata } from "next";
import Link from "next/link";
import { listApplications } from "@/lib/dal/applications";
import { listFiltersSchema } from "@/lib/validation/application";
import { Filters } from "./filters";
import styles from "./applications.module.scss";

export const metadata: Metadata = { title: "Applications" };

const dateFmt = new Intl.DateTimeFormat("en-US", { dateStyle: "medium" });

export default async function ApplicationsPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const raw = await searchParams;
  const parsed = listFiltersSchema.safeParse({
    q: typeof raw.q === "string" ? raw.q : undefined,
    status: typeof raw.status === "string" ? raw.status : undefined,
    page: raw.page,
  });
  const filters = parsed.success ? parsed.data : { page: 1 as const };

  const { rows, total, pageCount } = await listApplications(filters);

  const pageLink = (page: number) => {
    const params = new URLSearchParams();
    if (filters.q) params.set("q", filters.q);
    if (filters.status) params.set("status", filters.status);
    params.set("page", String(page));
    return `/applications?${params.toString()}`;
  };

  return (
    <div>
      <div className={styles.header}>
        <h1>Applications</h1>
        <Link className={styles.newButton} href="/applications/new">
          New application
        </Link>
      </div>

      <Filters />

      {rows.length === 0 ? (
        <div className={styles.empty}>
          {total === 0 && !filters.q && !filters.status ? (
            <>
              <p>No applications yet.</p>
              <Link href="/applications/new">Track your first one</Link>
            </>
          ) : (
            <p>Nothing matches those filters.</p>
          )}
        </div>
      ) : (
        <div className={styles.tableWrap}>
          <table className={styles.table}>
            <thead>
              <tr>
                <th>Company</th>
                <th>Position</th>
                <th>Status</th>
                <th>Location</th>
                <th>Added</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((a) => (
                <tr key={a.id}>
                  <td>
                    <Link href={`/applications/${a.id}`}>{a.company}</Link>
                  </td>
                  <td>{a.position}</td>
                  <td>
                    <span className={styles.pill} data-status={a.status}>
                      {a.status}
                    </span>
                  </td>
                  <td>{a.location ?? "—"}</td>
                  <td>{dateFmt.format(a.createdAt)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {pageCount > 1 && (
        <div className={styles.pagination}>
          {filters.page > 1 && <Link href={pageLink(filters.page - 1)}>← Prev</Link>}
          <span>
            Page {filters.page} of {pageCount} · {total.toLocaleString()} total
          </span>
          {filters.page < pageCount && (
            <Link href={pageLink(filters.page + 1)}>Next →</Link>
          )}
        </div>
      )}
    </div>
  );
}
