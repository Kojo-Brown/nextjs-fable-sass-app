"use client";

import Link from "next/link";
import { useActionState } from "react";
import { login } from "../actions";
import styles from "../auth-form.module.scss";

export function LoginForm() {
  const [state, formAction, pending] = useActionState(login, null);

  return (
    <form action={formAction} className={styles.card}>
      <h1>Sign in</h1>
      {state?.error && <p className={styles.error}>{state.error}</p>}
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
          autoComplete="current-password"
          required
        />
        {state?.fieldErrors?.password && (
          <p className={styles.error}>{state.fieldErrors.password[0]}</p>
        )}
      </div>
      <button className={styles.submit} disabled={pending}>
        {pending ? "Signing in…" : "Sign in"}
      </button>
      <p className={styles.alt}>
        No account? <Link href="/register">Register</Link>
      </p>
    </form>
  );
}
