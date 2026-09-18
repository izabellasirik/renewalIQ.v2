import { mkdir, writeFile } from "fs/promises";
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
