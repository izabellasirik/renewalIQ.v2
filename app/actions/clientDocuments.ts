"use server";

import type { Prisma } from "@prisma/client";
import { prisma } from "@/lib/db";
import { logActivity } from "@/lib/activity";
import { saveUploadedFile, deleteStoredFile } from "@/lib/storage";
import { classifyByFilename, analyzeDocument } from "@/lib/documentAnalysis";
import { revalidatePath } from "next/cache";

// Server actions for the Documents tab's general upload area — kept separate
// from app/actions/documents.ts, which manages the unrelated Document
// Checklist (DocumentRequirement) shown on the Overview tab. These create
// plain File rows (purpose: "client_document", no DocumentRequirement link)
// and, when possible, an attached DocumentInsight.

function str(formData: FormData, key: string): string | null {
  const v = formData.get(key);
  if (typeof v !== "string") return null;
  const trimmed = v.trim();
  return trimmed.length ? trimmed : null;
}

function revalidateClient(clientId: string) {
  revalidatePath(`/clients/${clientId}`);
}

type UploadResult = { ok: true } | { ok: false; error: string };

// Server Actions redact thrown Error messages in production (Next.js replaces
// them with a generic message + digest, to avoid leaking server internals) —
// so an expected, safe-to-show failure must come back as a normal return
// value instead of a thrown exception, or the client never sees it.
export async function uploadClientDocuments(formData: FormData): Promise<UploadResult> {
  const clientId = str(formData, "clientId");
  if (!clientId) return { ok: false, error: "Missing client." };

  const files = formData.getAll("files").filter((f): f is File => f instanceof File && f.size > 0);
  if (files.length === 0) return { ok: false, error: "No files selected." };

  const vehicles = await prisma.vehicle.findMany({ where: { clientId }, select: { vin: true } });
  const knownVins = vehicles.map((v) => v.vin).filter((v): v is string => !!v);

  for (const file of files) {
    let stored;
    try {
      stored = await saveUploadedFile(clientId, file);
    } catch (err) {
      console.error(`[uploadClientDocuments] Failed to store "${file.name}" for client ${clientId}:`, err);
      return { ok: false, error: `Couldn't save "${file.name}" — file storage isn't available in this environment yet. See server logs for details.` };
    }
    const category = classifyByFilename(file.name);

    const created = await prisma.file.create({
      data: {
        clientId,
        filename: stored.filename,
        path: stored.path,
        provider: stored.provider,
        purpose: "client_document",
        category,
        analysisStatus: "Ready",
      },
    });

    try {
      const buffer = Buffer.from(await file.arrayBuffer());
      const result = await analyzeDocument({
        category,
        base64: buffer.toString("base64"),
        mimeType: file.type || "application/octet-stream",
        reviewContext: { knownVins },
      });

      await prisma.documentInsight.create({
        data: {
          fileId: created.id,
          documentType: result.documentType,
          extractedFields: result.extractedFields as Prisma.InputJsonValue,
          issues: result.issues as unknown as Prisma.InputJsonValue,
          confidence: result.confidence,
          needsReview: result.needsReview,
          summary: result.summary,
          source: result.source,
        },
      });
    } catch {
      await prisma.file.update({ where: { id: created.id }, data: { analysisStatus: "Failed" } });
    }
  }

  await logActivity(prisma, {
    clientId,
    type: "Document Uploaded",
    description: `${files.length} document${files.length === 1 ? "" : "s"} uploaded.`,
  });

  revalidateClient(clientId);
  return { ok: true };
}

export async function deleteClientDocument(formData: FormData) {
  const id = str(formData, "id");
  const clientId = str(formData, "clientId");
  if (!id || !clientId) throw new Error("Missing required fields.");

  const file = await prisma.file.findUnique({ where: { id } });
  if (!file || file.clientId !== clientId) throw new Error("Document not found.");

  await prisma.file.delete({ where: { id } });
  await deleteStoredFile(file.path);

  revalidateClient(clientId);
}
