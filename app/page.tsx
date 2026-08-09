import Link from "next/link";
import styles from "./page.module.scss";

export default function HomePage() {
  return (
    <main className={styles.hero}>
      <h1>JobTrack</h1>
      <p>
        Track every application, upload resumes, and let AI score how well your
        resume matches each job description.
      </p>
      <div className={styles.actions}>
        <Link className={styles.primary} href="/register">
          Get started
        </Link>
        <Link className={styles.secondary} href="/login">
          Sign in
        </Link>
      </div>
    </main>
  );
}
