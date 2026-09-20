import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { readStoredFile } from "@/lib/storage";

/**
 * ⚠️ SECURITY STATUS — READ BEFORE USING WITH REAL DOCUMENTS ⚠️
 *
 * This route is the ONLY way a stored document is ever served — it keeps the
 * private Blob store's own URL/token off the client entirely, and Blob
 * objects are unreachable by anyone who doesn't go through it. That is real
 * protection against a leaked/guessed URL.
 *
 * It is NOT a substitute for authentication. This app has no login system:
 * anyone who can reach this deployment can hit any /api/files/{id} for any
 * client. Do not upload real client documents until user auth + per-client
 * authorization is added in front of this route. Use fictional/demo
 * documents only until then.
 */

// Only these render inline in the browser tab (matches today's UX for
// PDFs/images). Everything else is forced to download rather than rendered
// same-origin — an uploaded .html/.svg file must never execute as a page here.
const INLINE_TYPES = /^application\/pdf$|^image\//;

function contentDisposition(disposition: "inline" | "attachment", filename: string): string {
  const asciiFallback = filename.replace(/[^\x20-\x7e]/g, "_").replace(/"/g, "'");
  return `${disposition}; filename="${asciiFallback}"; filename*=UTF-8''${encodeURIComponent(filename)}`;
}

function inferContentType(filename: string): string {
  const ext = filename.split(".").pop()?.toLowerCase() ?? "";
  const map: Record<string, string> = {
    pdf: "application/pdf",
    jpg: "image/jpeg",
    jpeg: "image/jpeg",
    png: "image/png",
    gif: "image/gif",
    webp: "image/webp",
    heic: "image/heic",
    txt: "text/plain",
    csv: "text/csv",
    doc: "application/msword",
    docx: "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
    xls: "application/vnd.ms-excel",
    xlsx: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  };
  return map[ext] ?? "application/octet-stream";
}

export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;

  const file = await prisma.file.findUnique({ where: { id } });
  if (!file) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const result = await readStoredFile(file.path, file.provider);
  if (!result) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const contentType = result.contentType ?? inferContentType(file.filename);
  const disposition = INLINE_TYPES.test(contentType) ? "inline" : "attachment";

  return new NextResponse(result.stream, {
    headers: {
      "Content-Type": contentType,
      "Content-Disposition": contentDisposition(disposition, file.filename),
      "Cache-Control": "private, no-store",
      "X-Content-Type-Options": "nosniff",
      ...(result.size ? { "Content-Length": String(result.size) } : {}),
    },
  });
}
