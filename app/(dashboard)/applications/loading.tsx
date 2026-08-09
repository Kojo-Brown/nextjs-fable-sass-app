import styles from "./applications.module.scss";

// This file makes Next.js wrap the segment in a Suspense boundary: the shell
// streams immediately and this skeleton shows while the page's data loads.
export default function ApplicationsLoading() {
  return (
    <div>
      <div className={styles.header}>
        <h1>Applications</h1>
      </div>
      {Array.from({ length: 8 }, (_, i) => (
        <div key={i} className={styles.skeletonRow} />
      ))}
    </div>
  );
}
