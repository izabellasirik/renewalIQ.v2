import { mkdir, writeFile, unlink, stat } from "fs/promises";
import { createReadStream } from "fs";
import { Readable } from "stream";
import path from "path";
import { randomUUID } from "crypto";
import { put, get, del } from "@vercel/blob";

/**
 * Storage is abstracted behind this file so a future provider can be swapped
 * in without touching callers — they just get back { provider, path, filename }
 * and store it on a File row. `path` is always an internal storage reference
 * (a local relative path, or a private Blob pathname) — never a value meant
 * to be rendered directly as a link. Every read goes through
 * app/api/files/[id]/route.ts instead.
 *
 * Provider is chosen at runtime: if a Blob store is connected to this
 * environment (BLOB_STORE_ID or BLOB_READ_WRITE_TOKEN present), uploads go to
 * a PRIVATE Vercel Blob store. Otherwise (local dev with no store connected)
 * files stay on local disk exactly as before. Auth against Blob itself is
 * handled entirely by the @vercel/blob SDK — it prefers the project's OIDC
 * token (VERCEL_OIDC_TOKEN + BLOB_STORE_ID) when available and only falls
 * back to a long-lived BLOB_READ_WRITE_TOKEN otherwise. We never branch on
 * that ourselves; passing no explicit token lets the SDK pick.
 */
export type StoredFile = {
  provider: "local" | "vercel-blob";
  path: string;
  filename: string;
};

const UPLOAD_ROOT = path.join(process.cwd(), "public", "uploads");

function blobConfigured(): boolean {
  return Boolean(process.env.BLOB_STORE_ID || process.env.BLOB_READ_WRITE_TOKEN);
}

function sanitizeFilename(name: string): string {
  return name.replace(/[^a-zA-Z0-9._-]/g, "_").slice(-120);
}

export async function saveUploadedFile(clientId: string, file: File): Promise<StoredFile> {
  const safeName = sanitizeFilename(file.name || "file");
  const buffer = Buffer.from(await file.arrayBuffer());

  if (blobConfigured()) {
    const blob = await put(`clients/${clientId}/${randomUUID()}-${safeName}`, buffer, {
      access: "private",
      addRandomSuffix: false,
      contentType: file.type || undefined,
    });
    return { provider: "vercel-blob", path: blob.pathname, filename: file.name || safeName };
  }

  const dir = path.join(UPLOAD_ROOT, clientId);
  await mkdir(dir, { recursive: true });
  const storedName = `${randomUUID()}-${safeName}`;
  await writeFile(path.join(dir, storedName), buffer);

  return {
    provider: "local",
    path: `/uploads/${clientId}/${storedName}`,
    filename: file.name || safeName,
  };
}

/** Mirror of saveUploadedFile — removes a file previously stored at `storedPath` for the given provider. Best-effort: a missing file is not an error, since the DB row is the source of truth. */
export async function deleteStoredFile(storedPath: string, provider: string): Promise<void> {
  if (provider === "vercel-blob") {
    try {
      await del(storedPath);
    } catch {
      // Already gone — nothing to do.
    }
    return;
  }

  if (!storedPath.startsWith("/uploads/")) return;
  const absolute = path.join(process.cwd(), "public", storedPath);
  try {
    await unlink(absolute);
  } catch {
    // Already gone — nothing to do.
  }
}

export type ReadStoredFileResult = {
  stream: ReadableStream<Uint8Array>;
  contentType: string | null;
  size: number | null;
};

/** Used only by app/api/files/[id]/route.ts — never expose storedPath/provider to the client directly. Returns null if the file can't be found. */
export async function readStoredFile(storedPath: string, provider: string): Promise<ReadStoredFileResult | null> {
  if (provider === "vercel-blob") {
    const result = await get(storedPath, { access: "private" });
    if (!result || !result.stream) return null;
    return { stream: result.stream, contentType: result.blob.contentType, size: result.blob.size };
  }

  if (!storedPath.startsWith("/uploads/")) return null;
  const absolute = path.join(process.cwd(), "public", storedPath);
  try {
    const info = await stat(absolute);
    const nodeStream = createReadStream(absolute);
    return { stream: Readable.toWeb(nodeStream) as ReadableStream<Uint8Array>, contentType: null, size: info.size };
  } catch {
    return null;
  }
}
