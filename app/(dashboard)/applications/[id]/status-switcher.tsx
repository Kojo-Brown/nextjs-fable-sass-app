"use client";

import { startTransition, useOptimistic } from "react";
import {
  APPLICATION_STATUSES,
  type ApplicationStatus,
} from "@/lib/validation/application";
import { updateStatusAction } from "../actions";
import styles from "./detail.module.scss";

/* useOptimistic shows the new status instantly; if the Server Action fails,
 * React reverts to the last server-confirmed value when the transition ends. */
export function StatusSwitcher({
  id,
  status,
}: {
  id: string;
  status: ApplicationStatus;
}) {
  const [optimisticStatus, setOptimisticStatus] = useOptimistic(status);

  function change(next: ApplicationStatus) {
    startTransition(async () => {
      setOptimisticStatus(next);
      await updateStatusAction(id, next);
    });
  }

  return (
    <div className={styles.statusRow} role="group" aria-label="Application status">
      {APPLICATION_STATUSES.map((s) => (
        <button
          key={s}
          onClick={() => change(s)}
          className={styles.statusButton}
          data-active={s === optimisticStatus}
          data-status={s}
        >
          {s}
        </button>
      ))}
    </div>
  );
}
