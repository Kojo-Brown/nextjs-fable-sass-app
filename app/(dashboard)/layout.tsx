import Link from "next/link";
import { requireUser } from "@/lib/dal/session";
import { logout } from "@/app/(auth)/actions";
import styles from "./layout.module.scss";

// requireUser() here is defense-in-depth for UX; every DAL call below this
// layout re-checks authorization itself. Layouts are not a security boundary —
// they don't re-run on every soft navigation.
export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const user = await requireUser();

  return (
    <div className={styles.shell}>
      <aside className={styles.sidebar}>
        <div className={styles.brand}>JobTrack</div>
        <nav className={styles.nav}>
          <Link href="/dashboard">Dashboard</Link>
          <Link href="/applications">Applications</Link>
          <Link href="/resumes">Resumes</Link>
          {user.role === "admin" && <Link href="/admin">Admin</Link>}
        </nav>
        <div className={styles.footer}>
          <span className={styles.user}>{user.name}</span>
          <form action={logout}>
            <button className={styles.logout}>Sign out</button>
          </form>
        </div>
      </aside>
      <main className={styles.main}>{children}</main>
    </div>
  );
}
