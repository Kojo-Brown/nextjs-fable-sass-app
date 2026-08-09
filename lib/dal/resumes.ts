import "server-only";
import { and, desc, eq } from "drizzle-orm";
import { db } from "@/lib/db";
import { resumes, type Resume } from "@/lib/db/schema";
import { removeFile } from "@/lib/storage";
import { requireUser } from "./session";

export async function listResumes(): Promise<Resume[]> {
  const user = await requireUser();
  return db.query.resumes.findMany({
    where: eq(resumes.userId, user.id),
    orderBy: desc(resumes.createdAt),
  });
}

export async function getResume(id: string): Promise<Resume | null> {
  const user = await requireUser();
  const row = await db.query.resumes.findFirst({
    where: and(eq(resumes.id, id), eq(resumes.userId, user.id)),
  });
  return row ?? null;
}

export async function createResume(input: {
  filename: string;
  storagePath: string;
  mimeType: string;
  sizeBytes: number;
  extractedText: string | null;
}): Promise<Resume> {
  const user = await requireUser();
  const [row] = await db
    .insert(resumes)
    .values({ ...input, userId: user.id })
    .returning();
  return row;
}

export async function deleteResume(id: string): Promise<boolean> {
  const user = await requireUser();
  const [row] = await db
    .delete(resumes)
    .where(and(eq(resumes.id, id), eq(resumes.userId, user.id)))
    .returning({ storagePath: resumes.storagePath });
  if (!row) return false;
  await removeFile(row.storagePath).catch(() => {
    // DB row is gone; a stray file on disk is not worth failing the request.
  });
  return true;
}
