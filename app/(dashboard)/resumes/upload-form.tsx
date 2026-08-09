"use client";

import { useActionState, useRef } from "react";
import { uploadResumeAction } from "./actions";
import styles from "./resumes.module.scss";

export function UploadForm() {
  const formRef = useRef<HTMLFormElement>(null);
  const [state, formAction, pending] = useActionState(
    async (prev: Awaited<ReturnType<typeof uploadResumeAction>>, formData: FormData) => {
      const result = await uploadResumeAction(prev, formData);
      if (result?.ok) formRef.current?.reset();
      return result;
    },
    null,
  );

  return (
    <form ref={formRef} action={formAction} className={styles.upload}>
      <input
        type="file"
        name="file"
        accept=".pdf,.txt,.md,application/pdf,text/plain,text/markdown"
        aria-label="Resume file"
        required
      />
      <button disabled={pending}>{pending ? "Uploading…" : "Upload"}</button>
      {state?.error && <p className={styles.error}>{state.error}</p>}
      {state?.ok && <p className={styles.success}>Uploaded.</p>}
    </form>
  );
}
