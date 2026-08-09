"use client";

import Link from "next/link";
import { useActionState } from "react";
import { register } from "../actions";
import styles from "../auth-form.module.scss";

export function RegisterForm() {
  const [state, formAction, pending] = useActionState(register, null);

  return (
    <form action={formAction} className={styles.card}>
      <h1>Create account</h1>
      {state?.error && <p className={styles.error}>{state.error}</p>}
      <div className={styles.field}>
        <label htmlFor="name">Name</label>
        <input id="name" name="name" autoComplete="name" required />
        {state?.fieldErrors?.name && (
          <p className={styles.error}>{state.fieldErrors.name[0]}</p>
        )}
      </div>
      <div className={styles.field}>
        <label htmlFor="email">Email</label>
        <input id="email" name="email" type="email" autoComplete="email" required />
        {state?.fieldErrors?.email && (
          <p className={styles.error}>{state.fieldErrors.email[0]}</p>
        )}
      </div>
      <div className={styles.field}>
        <label htmlFor="password">Password</label>
        <input
          id="password"
          name="password"
          type="password"
          autoComplete="new-password"
          minLength={8}
          required
        />
        {state?.fieldErrors?.password && (
          <p className={styles.error}>{state.fieldErrors.password[0]}</p>
        )}
      </div>
      <button className={styles.submit} disabled={pending}>
        {pending ? "Creating…" : "Create account"}
      </button>
      <p className={styles.alt}>
        Already registered? <Link href="/login">Sign in</Link>
      </p>
    </form>
  );
}
