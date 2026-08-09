import "server-only";
import { createReadStream } from "node:fs";
import { mkdir, rm, writeFile } from "node:fs/promises";
import path from "node:path";
import { Readable } from "node:stream";

/* Local-disk storage adapter. In production you'd swap this for object
 * storage with presigned upload URLs so files never transit the Next server;
 * the interface (save/remove/stream by relative path) is what stays stable. */

const ROOT = path.resolve(process.env.UPLOADS_DIR ?? "./uploads");

function resolveSafe(relPath: string): string {
  const abs = path.resolve(ROOT, relPath);
  // Path traversal guard: the resolved path must stay inside ROOT.
  if (!abs.startsWith(ROOT + path.sep)) {
    throw new Error("Invalid storage path");
  }
  return abs;
}

export async function saveFile(
  relPath: string,
  data: ArrayBuffer,
): Promise<void> {
  const abs = resolveSafe(relPath);
  await mkdir(path.dirname(abs), { recursive: true });
  await writeFile(abs, Buffer.from(data));
}

export async function removeFile(relPath: string): Promise<void> {
  await rm(resolveSafe(relPath), { force: true });
}

export function streamFile(relPath: string): ReadableStream {
  return Readable.toWeb(
    createReadStream(resolveSafe(relPath)),
  ) as ReadableStream;
}
