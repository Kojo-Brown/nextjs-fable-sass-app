"use server";

import { eq } from "drizzle-orm";
import { redirect } from "next/navigation";
import { hashPassword, verifyPassword } from "@/lib/auth/password";
import { createSession, destroySession } from "@/lib/auth/session";
import { db } from "@/lib/db";
import { users } from "@/lib/db/schema";
import { rateLimit } from "@/lib/rate-limit";
import {
  loginSchema,
  registerSchema,
  type AuthFormState,
} from "@/lib/validation/auth";

export async function register(
  _prev: AuthFormState,
  formData: FormData,
): Promise<AuthFormState> {
  const rl = await rateLimit("register", 5, 15 * 60_000);
  if (!rl.ok) {
    return { error: `Too many attempts — try again in ${rl.retryAfterSeconds}s.` };
  }

  const parsed = registerSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) {
    return { fieldErrors: parsed.error.flatten().fieldErrors };
  }
  const { name, email, password } = parsed.data;

  const existing = await db.query.users.findFirst({
    where: eq(users.email, email),
    columns: { id: true },
  });
  if (existing) {
    return { error: "An account with that email already exists." };
  }

  const [user] = await db
    .insert(users)
    .values({ name, email, hashedPassword: await hashPassword(password) })
    .returning({ id: users.id });

  await createSession(user.id);
  redirect("/dashboard");
}

export async function login(
  _prev: AuthFormState,
  formData: FormData,
): Promise<AuthFormState> {
  const rl = await rateLimit("login", 10, 15 * 60_000);
  if (!rl.ok) {
    return { error: `Too many attempts — try again in ${rl.retryAfterSeconds}s.` };
  }

  const parsed = loginSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) {
    return { fieldErrors: parsed.error.flatten().fieldErrors };
  }
  const { email, password } = parsed.data;

  const user = await db.query.users.findFirst({
    where: eq(users.email, email),
  });
  // Same generic error for unknown email and wrong password — don't leak
  // which emails have accounts.
  if (!user || !(await verifyPassword(password, user.hashedPassword))) {
    return { error: "Invalid email or password." };
  }

  await createSession(user.id);
  redirect("/dashboard");
}

export async function logout(): Promise<void> {
  await destroySession();
  redirect("/login");
}
