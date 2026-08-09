import styles from "./dashboard.module.scss";

export default function DashboardLoading() {
  return (
    <div className={styles.page}>
      <h1>Dashboard</h1>
      <div className={styles.tiles}>
        {Array.from({ length: 4 }, (_, i) => (
          <div key={i} className={styles.tile} aria-hidden>
            <dt>&nbsp;</dt>
            <dd>…</dd>
          </div>
        ))}
      </div>
    </div>
  );
}
