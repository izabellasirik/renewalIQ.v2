import { mkdir, writeFile, unlink } from "fs/promises";
import path from "path";
import { randomUUID } from "crypto";

/**
 * Storage is abstracted behind this single function so a future provider
 * (Dropbox, S3, ...) can be swapped in by changing this file only — callers
 * just get back { provider, path, filename } and store it on a File row.
 */
export type StoredFile = {
  provider: string;
  path: string;
  filename: string;
};

const UPLOAD_ROOT = path.join(process.cwd(), "public", "uploads");

function sanitizeFilename(name: string): string {
  return name.replace(/[^a-zA-Z0-9._-]/g, "_").slice(-120);
}

export async function saveUploadedFile(
  clientId: string,
  file: File
): Promise<StoredFile> {
  const dir = path.join(UPLOAD_ROOT, clientId);
  await mkdir(dir, { recursive: true });

  const safeName = sanitizeFilename(file.name || "file");
  const storedName = `${randomUUID()}-${safeName}`;
  const buffer = Buffer.from(await file.arrayBuffer());
  await writeFile(path.join(dir, storedName), buffer);

  return {
    provider: "local",
    path: `/uploads/${clientId}/${storedName}`,
    filename: file.name || safeName,
  };
}

/** Mirror of saveUploadedFile — removes a file previously stored at `storedPath` (the `path` on a File row). Best-effort: a missing file is not an error, since the DB row is the source of truth. */
export async function deleteStoredFile(storedPath: string): Promise<void> {
  if (!storedPath.startsWith("/uploads/")) return;
  const absolute = path.join(process.cwd(), "public", storedPath);
  try {
    await unlink(absolute);
  } catch {
    // Already gone — nothing to do.
  }
}
