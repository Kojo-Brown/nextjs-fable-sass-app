/* Seed script — run with `npm run db:seed`.
 * Creates a demo user (demo@example.com / password123), an admin
 * (admin@example.com / password123), and ~10k applications so slow-query
 * work in EXPLAIN ANALYZE has something real to chew on. */
import bcrypt from "bcryptjs";
import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import { applications, users } from "./schema";

const COMPANIES = [
  "Acme", "Globex", "Initech", "Umbrella", "Stark Industries", "Wayne Corp",
  "Hooli", "Pied Piper", "Vandelay", "Wonka", "Cyberdyne", "Tyrell",
  "Massive Dynamic", "Aperture", "Black Mesa", "Soylent", "Oscorp", "Dunder Mifflin",
];
const POSITIONS = [
  "Frontend Engineer", "Backend Engineer", "Full-Stack Developer",
  "Platform Engineer", "Site Reliability Engineer", "Staff Engineer",
  "Engineering Manager", "DevOps Engineer", "Data Engineer",
];
const LOCATIONS = ["Remote", "New York, NY", "Accra", "London", "Berlin", "Toronto"];
const STATUSES = ["saved", "applied", "interviewing", "offer", "rejected"] as const;

function pick<T>(arr: readonly T[]): T {
  return arr[Math.floor(Math.random() * arr.length)];
}

async function main() {
  const url = process.env.DATABASE_URL ?? "postgres://localhost:5432/fable_jobs";
  const client = postgres(url, { max: 1 });
  const db = drizzle(client);

  const hashed = await bcrypt.hash("password123", 10);
  const [demo] = await db
    .insert(users)
    .values([
      { email: "demo@example.com", name: "Demo User", hashedPassword: hashed },
      { email: "admin@example.com", name: "Admin", hashedPassword: hashed, role: "admin" },
    ])
    .onConflictDoNothing()
    .returning();

  if (!demo) {
    console.log("Users already seeded; skipping.");
    await client.end();
    return;
  }

  const now = Date.now();
  const rows = Array.from({ length: 10_000 }, (_, i) => {
    const createdAt = new Date(now - Math.floor(Math.random() * 365) * 86_400_000);
    const status = pick(STATUSES);
    return {
      userId: demo.id,
      company: `${pick(COMPANIES)}${i % 50 === 0 ? " Labs" : ""}`,
      position: pick(POSITIONS),
      status,
      location: pick(LOCATIONS),
      salaryMin: 70_000 + Math.floor(Math.random() * 60_000),
      salaryMax: 140_000 + Math.floor(Math.random() * 80_000),
      appliedAt: status === "saved" ? null : createdAt,
      createdAt,
      updatedAt: createdAt,
    };
  });

  for (let i = 0; i < rows.length; i += 1_000) {
    await db.insert(applications).values(rows.slice(i, i + 1_000));
  }

  console.log(`Seeded 2 users and ${rows.length} applications.`);
  await client.end();
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
