"use server";

import { randomUUID } from "node:crypto";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { requireUser } from "@/lib/dal/session";
import { createResume, deleteResume } from "@/lib/dal/resumes";
import { saveFile } from "@/lib/storage";

const MAX_SIZE = 5 * 1024 * 1024; // 5 MB

const ALLOWED = new Map<string, string>([
  ["application/pdf", "pdf"],
  ["text/plain", "txt"],
  ["text/markdown", "md"],
]);

export type UploadState = { error?: string; ok?: boolean } | null;

async function extractText(file: File): Promise<string | null> {
  try {
    if (file.type === "application/pdf") {
      const { PDFParse } = await import("pdf-parse");
      const parser = new PDFParse({
        data: new Uint8Array(await file.arrayBuffer()),
      });
      try {
        const result = await parser.getText();
        const text = result.text.trim();
        return text.length > 0 ? text.slice(0, 50_000) : null;
      } finally {
        await parser.destroy();
      }
    }
    const text = (await file.text()).trim();
    return text.length > 0 ? text.slice(0, 50_000) : null;
  } catch {
    // Extraction is best-effort; matching degrades gracefully without it.
    return null;
  }
}

export async function uploadResumeAction(
  _prev: UploadState,
  formData: FormData,
): Promise<UploadState> {
  const user = await requireUser();

  const file = formData.get("file");
  if (!(file instanceof File) || file.size === 0) {
    return { error: "Choose a file to upload." };
  }
  if (file.size > MAX_SIZE) {
    return { error: "File is too large (max 5 MB)." };
  }
  const ext = ALLOWED.get(file.type);
  if (!ext) {
    return { error: "Only PDF, plain-text, or Markdown resumes are accepted." };
  }
  const filename = z
    .string()
    .trim()
    .min(1)
    .max(200)
    .catch("resume")
    .parse(file.name);

  const storagePath = `${user.id}/${randomUUID()}.${ext}`;
  await saveFile(storagePath, await file.arrayBuffer());

  await createResume({
    filename,
    storagePath,
    mimeType: file.type,
    sizeBytes: file.size,
    extractedText: await extractText(file),
  });

  revalidatePath("/resumes");
  return { ok: true };
}

export async function deleteResumeAction(id: string): Promise<void> {
  const parsed = z.string().uuid().safeParse(id);
  if (!parsed.success) return;
  await deleteResume(parsed.data);
  revalidatePath("/resumes");
}
