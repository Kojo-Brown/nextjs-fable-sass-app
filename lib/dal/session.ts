import "server-only";
import { cache } from "react";
import { and, eq, gt } from "drizzle-orm";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { hashToken, SESSION_COOKIE } from "@/lib/auth/session";
import { db } from "@/lib/db";
import { sessions, users, type User } from "@/lib/db/schema";

/* Authorization lives HERE, next to the data — not in middleware. Next.js has
 * shipped middleware bypass CVEs (e.g. CVE-2025-29927); middleware is a UX
 * optimization, this file is the security boundary. Every DAL function and
 * Server Action calls requireUser()/requireAdmin() before touching rows. */

// react cache() memoizes per request: layout, page, and any nested component
// can all call verifySession() and only one query runs.
export const verifySession = cache(async (): Promise<User | null> => {
  const cookieStore = await cookies();
  const token = cookieStore.get(SESSION_COOKIE)?.value;
  if (!token) return null;

  const rows = await db
    .select({ user: users })
    .from(sessions)
    .innerJoin(users, eq(sessions.userId, users.id))
    .where(
      and(
        eq(sessions.tokenHash, hashToken(token)),
        gt(sessions.expiresAt, new Date()),
      ),
    )
    .limit(1);

  return rows[0]?.user ?? null;
});

export async function requireUser(): Promise<User> {
  const user = await verifySession();
  if (!user) redirect("/login");
  return user;
}

export async function requireAdmin(): Promise<User> {
  const user = await requireUser();
  if (user.role !== "admin") redirect("/dashboard");
  return user;
}
