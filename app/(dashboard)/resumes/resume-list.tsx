"use client";

import { useOptimistic, startTransition } from "react";
import type { Resume } from "@/lib/db/schema";
import { deleteResumeAction } from "./actions";
import styles from "./resumes.module.scss";

const dateFmt = new Intl.DateTimeFormat("en-US", { dateStyle: "medium" });

function formatSize(bytes: number): string {
  if (bytes >= 1024 * 1024) return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  return `${Math.round(bytes / 1024)} KB`;
}

export function ResumeList({ resumes }: { resumes: Resume[] }) {
  // Optimistically drop the row on delete; server revalidation reconciles.
  const [rows, removeRow] = useOptimistic(resumes, (curr, id: string) =>
    curr.filter((r) => r.id !== id),
  );

  return (
    <ul className={styles.list}>
      {rows.map((r) => (
        <li key={r.id} className={styles.item}>
          <div>
            <a href={`/api/resumes/${r.id}/download`}>{r.filename}</a>
            <p className={styles.meta}>
              {formatSize(r.sizeBytes)} · {dateFmt.format(r.createdAt)}
              {r.extractedText === null && " · text not extracted (AI matching unavailable)"}
            </p>
          </div>
          <button
            className={styles.delete}
            onClick={() => {
              if (!confirm(`Delete ${r.filename}?`)) return;
              startTransition(async () => {
                removeRow(r.id);
                await deleteResumeAction(r.id);
              });
            }}
          >
            Delete
          </button>
        </li>
      ))}
    </ul>
  );
}
