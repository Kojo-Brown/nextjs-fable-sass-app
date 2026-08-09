import "server-only";
import { and, count, desc, eq, ilike, or, sql, type SQL } from "drizzle-orm";
import { db } from "@/lib/db";
import { applications, type Application } from "@/lib/db/schema";
import type {
  ApplicationInput,
  ApplicationStatus,
} from "@/lib/validation/application";
import { requireUser } from "./session";

/* Every function here re-derives the current user from the session and scopes
 * queries to it. Callers never pass a userId in — that's how IDOR happens. */

export const PAGE_SIZE = 25;

export type ApplicationFilters = {
  q?: string;
  status?: ApplicationStatus;
  page: number;
};

export async function listApplications(filters: ApplicationFilters): Promise<{
  rows: Application[];
  total: number;
  pageCount: number;
}> {
  const user = await requireUser();

  const conditions: SQL[] = [eq(applications.userId, user.id)];
  if (filters.status) conditions.push(eq(applications.status, filters.status));
  if (filters.q) {
    const escaped = filters.q.replace(/[%_\\]/g, "\\$&");
    const needle = `%${escaped}%`;
    conditions.push(
      or(
        ilike(applications.company, needle),
        ilike(applications.position, needle),
      )!,
    );
  }
  const where = and(...conditions);

  const [rows, [{ total }]] = await Promise.all([
    db
      .select()
      .from(applications)
      .where(where)
      .orderBy(desc(applications.createdAt))
      .limit(PAGE_SIZE)
      .offset((filters.page - 1) * PAGE_SIZE),
    db.select({ total: count() }).from(applications).where(where),
  ]);

  return { rows, total, pageCount: Math.max(1, Math.ceil(total / PAGE_SIZE)) };
}

export async function getApplication(id: string): Promise<Application | null> {
  const user = await requireUser();
  const row = await db.query.applications.findFirst({
    where: and(eq(applications.id, id), eq(applications.userId, user.id)),
  });
  return row ?? null;
}

export async function createApplication(
  input: ApplicationInput,
): Promise<Application> {
  const user = await requireUser();
  const [row] = await db
    .insert(applications)
    .values({
      ...input,
      userId: user.id,
      appliedAt: input.status === "saved" ? null : new Date(),
    })
    .returning();
  return row;
}

export async function updateApplication(
  id: string,
  input: ApplicationInput,
): Promise<Application | null> {
  const user = await requireUser();
  const [row] = await db
    .update(applications)
    .set({ ...input, updatedAt: new Date() })
    .where(and(eq(applications.id, id), eq(applications.userId, user.id)))
    .returning();
  return row ?? null;
}

export async function updateApplicationStatus(
  id: string,
  status: ApplicationStatus,
): Promise<Application | null> {
  const user = await requireUser();
  const [row] = await db
    .update(applications)
    .set({
      status,
      updatedAt: new Date(),
      // First transition out of "saved" stamps appliedAt.
      appliedAt: sql`case when ${applications.appliedAt} is null and ${status} != 'saved' then now() else ${applications.appliedAt} end`,
    })
    .where(and(eq(applications.id, id), eq(applications.userId, user.id)))
    .returning();
  return row ?? null;
}

export async function deleteApplication(id: string): Promise<boolean> {
  const user = await requireUser();
  const rows = await db
    .delete(applications)
    .where(and(eq(applications.id, id), eq(applications.userId, user.id)))
    .returning({ id: applications.id });
  return rows.length > 0;
}
