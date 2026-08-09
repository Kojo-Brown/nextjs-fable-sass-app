"use client";

import { useActionState } from "react";
import type { Application } from "@/lib/db/schema";
import {
  APPLICATION_STATUSES,
  type ApplicationFormState,
} from "@/lib/validation/application";
import styles from "./application-form.module.scss";

type Props = {
  action: (
    prev: ApplicationFormState,
    formData: FormData,
  ) => Promise<ApplicationFormState>;
  initial?: Application;
  submitLabel: string;
};

export function ApplicationForm({ action, initial, submitLabel }: Props) {
  const [state, formAction, pending] = useActionState(action, null);

  const err = (field: string) => state?.fieldErrors?.[field]?.[0];

  return (
    <form action={formAction} className={styles.form}>
      {state?.error && <p className={styles.error}>{state.error}</p>}

      <div className={styles.row}>
        <div className={styles.field}>
          <label htmlFor="company">Company *</label>
          <input id="company" name="company" defaultValue={initial?.company} required />
          {err("company") && <p className={styles.error}>{err("company")}</p>}
        </div>
        <div className={styles.field}>
          <label htmlFor="position">Position *</label>
          <input id="position" name="position" defaultValue={initial?.position} required />
          {err("position") && <p className={styles.error}>{err("position")}</p>}
        </div>
      </div>

      <div className={styles.row}>
        <div className={styles.field}>
          <label htmlFor="status">Status</label>
          <select id="status" name="status" defaultValue={initial?.status ?? "saved"}>
            {APPLICATION_STATUSES.map((s) => (
              <option key={s} value={s}>
                {s}
              </option>
            ))}
          </select>
        </div>
        <div className={styles.field}>
          <label htmlFor="location">Location</label>
          <input id="location" name="location" defaultValue={initial?.location ?? ""} />
        </div>
      </div>

      <div className={styles.row}>
        <div className={styles.field}>
          <label htmlFor="salaryMin">Salary min</label>
          <input
            id="salaryMin"
            name="salaryMin"
            type="number"
            min={0}
            defaultValue={initial?.salaryMin ?? ""}
          />
          {err("salaryMin") && <p className={styles.error}>{err("salaryMin")}</p>}
        </div>
        <div className={styles.field}>
          <label htmlFor="salaryMax">Salary max</label>
          <input
            id="salaryMax"
            name="salaryMax"
            type="number"
            min={0}
            defaultValue={initial?.salaryMax ?? ""}
          />
        </div>
      </div>

      <div className={styles.field}>
        <label htmlFor="url">Job posting URL</label>
        <input id="url" name="url" type="url" defaultValue={initial?.url ?? ""} />
        {err("url") && <p className={styles.error}>{err("url")}</p>}
      </div>

      <div className={styles.field}>
        <label htmlFor="jobDescription">Job description (used for AI matching)</label>
        <textarea
          id="jobDescription"
          name="jobDescription"
          rows={8}
          defaultValue={initial?.jobDescription ?? ""}
        />
      </div>

      <div className={styles.field}>
        <label htmlFor="notes">Notes</label>
        <textarea id="notes" name="notes" rows={4} defaultValue={initial?.notes ?? ""} />
      </div>

      <button className={styles.submit} disabled={pending}>
        {pending ? "Saving…" : submitLabel}
      </button>
    </form>
  );
}
