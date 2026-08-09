import type { Metadata } from "next";
import { requireUser } from "@/lib/dal/session";

export const metadata: Metadata = { title: "Dashboard" };

export default async function DashboardPage() {
  const user = await requireUser();
  return (
    <div>
      <h1>Welcome back, {user.name}</h1>
      <p>Stats are coming in a later feature — check Applications for now.</p>
    </div>
  );
}
