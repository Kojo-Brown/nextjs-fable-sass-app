import "server-only";
import { and, count, eq, gte, sql, type SQL } from "drizzle-orm";
import { db } from "@/lib/db";
import { applications } from "@/lib/db/schema";
import type { ApplicationStatus } from "@/lib/validation/application";
import { requireUser } from "./session";

export const STAT_RANGES = ["30d", "90d", "1y", "all"] as const;
export type StatRange = (typeof STAT_RANGES)[number];

const RANGE_MS: Record<Exclude<StatRange, "all">, number> = {
  "30d": 30 * 86_400_000,
  "90d": 90 * 86_400_000,
  "1y": 365 * 86_400_000,
};

export type Stats = {
  total: number;
  byStatus: Record<ApplicationStatus, number>;
  responseRate: number | null;
  monthly: { month: string; count: number }[];
};

export async function getStats(range: StatRange): Promise<Stats> {
  const user = await requireUser();

  const conditions: SQL[] = [eq(applications.userId, user.id)];
  if (range !== "all") {
    conditions.push(
      gte(applications.createdAt, new Date(Date.now() - RANGE_MS[range])),
    );
  }
  const where = and(...conditions);

  // Two aggregate queries, both resolved by the (user_id, status) and
  // (user_id, created_at) composite indexes.
  const [statusRows, monthlyRows] = await Promise.all([
    db
      .select({ status: applications.status, count: count() })
      .from(applications)
      .where(where)
      .groupBy(applications.status),
    db
      .select({
        month: sql<string>`to_char(date_trunc('month', ${applications.createdAt}), 'YYYY-MM')`,
        count: count(),
      })
      .from(applications)
      .where(where)
      .groupBy(sql`date_trunc('month', ${applications.createdAt})`)
      .orderBy(sql`date_trunc('month', ${applications.createdAt})`),
  ]);

  const byStatus: Record<ApplicationStatus, number> = {
    saved: 0,
    applied: 0,
    interviewing: 0,
    offer: 0,
    rejected: 0,
  };
  for (const row of statusRows) byStatus[row.status] = row.count;

  const total = Object.values(byStatus).reduce((a, b) => a + b, 0);
  const submitted = total - byStatus.saved;
  const heard = byStatus.interviewing + byStatus.offer + byStatus.rejected;

  return {
    total,
    byStatus,
    responseRate: submitted > 0 ? heard / submitted : null,
    monthly: monthlyRows,
  };
}
