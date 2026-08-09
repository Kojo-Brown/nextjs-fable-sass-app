import type { Metadata } from "next";
import { count, eq } from "drizzle-orm";
import { requireAdmin } from "@/lib/dal/session";
import { db } from "@/lib/db";
import { applications, users } from "@/lib/db/schema";

export const metadata: Metadata = { title: "Admin" };

export default async function AdminPage() {
  await requireAdmin();

  const rows = await db
    .select({
      id: users.id,
      name: users.name,
      email: users.email,
      role: users.role,
      applicationCount: count(applications.id),
    })
    .from(users)
    .leftJoin(applications, eq(applications.userId, users.id))
    .groupBy(users.id)
    .orderBy(users.createdAt);

  return (
    <div>
      <h1>Users</h1>
      <table>
        <thead>
          <tr>
            <th style={{ textAlign: "left", paddingRight: "1rem" }}>Name</th>
            <th style={{ textAlign: "left", paddingRight: "1rem" }}>Email</th>
            <th style={{ textAlign: "left", paddingRight: "1rem" }}>Role</th>
            <th style={{ textAlign: "left" }}>Applications</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((u) => (
            <tr key={u.id}>
              <td style={{ paddingRight: "1rem" }}>{u.name}</td>
              <td style={{ paddingRight: "1rem" }}>{u.email}</td>
              <td style={{ paddingRight: "1rem" }}>{u.role}</td>
              <td>{u.applicationCount}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
