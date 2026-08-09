"use client";

import { useTransition } from "react";
import { deleteApplicationAction } from "../actions";
import styles from "./detail.module.scss";

export function DeleteButton({ id }: { id: string }) {
  const [pending, startTransition] = useTransition();

  return (
    <button
      className={styles.delete}
      disabled={pending}
      onClick={() => {
        if (!confirm("Delete this application? This cannot be undone.")) return;
        startTransition(() => deleteApplicationAction(id));
      }}
    >
      {pending ? "Deleting…" : "Delete"}
    </button>
  );
}
