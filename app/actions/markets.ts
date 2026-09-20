"use server";

import { prisma } from "@/lib/db";
import { logActivity } from "@/lib/activity";
import { saveUploadedFile } from "@/lib/storage";
import { parseDateInput } from "@/lib/format";
import { revalidatePath } from "next/cache";

function str(formData: FormData, key: string): string | null {
  const v = formData.get(key);
  if (typeof v !== "string") return null;
  const trimmed = v.trim();
  return trimmed.length ? trimmed : null;
}

function num(formData: FormData, key: string): number | null {
  const v = str(formData, key);
  if (v == null) return null;
  const n = Number(v);
  return Number.isFinite(n) ? n : null;
}

function revalidateClient(clientId: string) {
  revalidatePath(`/clients/${clientId}`);
  revalidatePath("/today");
}

function statusChangeActivity(carrierName: string, fromStatus: string, toStatus: string) {
  switch (toStatus) {
    case "Submitted":
      return { type: "Quote Status Changed" as const, description: `Submission sent to ${carrierName}.` };
    case "Quote Received":
      return { type: "Quote Received" as const, description: `Quote received from ${carrierName}.` };
    case "More Info Needed":
      return { type: "Quote Status Changed" as const, description: `${carrierName} requested more information.` };
    case "Declined":
      return { type: "Quote Status Changed" as const, description: `${carrierName} declined.` };
    case "Bound":
      return { type: "Quote Status Changed" as const, description: `${carrierName} marked Bound.` };
    default:
      return {
        type: "Quote Status Changed" as const,
        description: `${carrierName} status changed from ${fromStatus} to ${toStatus}.`,
      };
  }
}

export async function addMarket(formData: FormData) {
  const clientId = str(formData, "clientId");
  const carrierName = str(formData, "carrierName");
  if (!clientId || !carrierName) throw new Error("Missing required fields.");

  const status = str(formData, "status") ?? "Not Contacted";

  await prisma.marketSubmission.create({
    data: {
      clientId,
      carrierName,
      contactName: str(formData, "contactName"),
      contactEmail: str(formData, "contactEmail"),
      contactPhone: str(formData, "contactPhone"),
      submittedDate: parseDateInput(str(formData, "submittedDate")),
      status,
      notes: str(formData, "notes"),
    },
  });

  await logActivity(prisma, {
    clientId,
    type: "Quote Added",
    description: `${carrierName} added as quote.`,
  });

  revalidateClient(clientId);
}

export async function updateMarket(formData: FormData) {
  const id = str(formData, "id");
  const clientId = str(formData, "clientId");
  const carrierName = str(formData, "carrierName");
  if (!id || !clientId || !carrierName) throw new Error("Missing required fields.");

  const existing = await prisma.marketSubmission.findUnique({ where: { id } });
  if (!existing) throw new Error("Market not found.");

  const status = str(formData, "status") ?? existing.status;

  await prisma.marketSubmission.update({
    where: { id },
    data: {
      carrierName,
      contactName: str(formData, "contactName"),
      contactEmail: str(formData, "contactEmail"),
      contactPhone: str(formData, "contactPhone"),
      submittedDate: parseDateInput(str(formData, "submittedDate")),
      status,
      notes: str(formData, "notes"),
      requestedInfo: str(formData, "requestedInfo"),
      premium: num(formData, "premium"),
      effectiveDate: parseDateInput(str(formData, "effectiveDate")),
      expirationDate: parseDateInput(str(formData, "expirationDate")),
    },
  });

  if (status !== existing.status) {
    const { type, description } = statusChangeActivity(carrierName, existing.status, status);
    await logActivity(prisma, { clientId, type, description });
  }

  revalidateClient(clientId);
}

export async function deleteMarket(formData: FormData) {
  const id = str(formData, "id");
  const clientId = str(formData, "clientId");
  if (!id || !clientId) throw new Error("Missing required fields.");

  await prisma.marketSubmission.delete({ where: { id } });
  revalidateClient(clientId);
}

export async function uploadQuoteFile(formData: FormData) {
  const marketId = str(formData, "marketId");
  const clientId = str(formData, "clientId");
  const file = formData.get("file");
  if (!marketId || !clientId) throw new Error("Missing required fields.");
  if (!(file instanceof File) || file.size === 0) throw new Error("No file selected.");

  const market = await prisma.marketSubmission.findUnique({ where: { id: marketId } });
  if (!market) throw new Error("Market not found.");

  const stored = await saveUploadedFile(clientId, file);
  await prisma.file.create({
    data: {
      clientId,
      marketSubmissionId: marketId,
      purpose: "quote",
      filename: stored.filename,
      path: stored.path,
      provider: stored.provider,
    },
  });

  await logActivity(prisma, {
    clientId,
    type: "Other",
    description: `Quote document uploaded — ${market.carrierName}.`,
  });

  revalidateClient(clientId);
}
