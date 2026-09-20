"use server";

import { prisma } from "@/lib/db";
import { logActivity } from "@/lib/activity";
import { saveUploadedFile } from "@/lib/storage";
import { revalidatePath } from "next/cache";

function str(formData: FormData, key: string): string | null {
  const v = formData.get(key);
  if (typeof v !== "string") return null;
  const trimmed = v.trim();
  return trimmed.length ? trimmed : null;
}

function revalidateClient(clientId: string) {
  revalidatePath(`/clients/${clientId}`);
  revalidatePath("/clients");
  revalidatePath("/today");
}

// Broker-controlled, never inferred from checklist counts — see Client.documentsComplete.
export async function setDocumentsComplete(formData: FormData) {
  const clientId = str(formData, "clientId");
  const complete = str(formData, "complete") === "true";
  if (!clientId) throw new Error("Missing client.");

  await prisma.client.update({ where: { id: clientId }, data: { documentsComplete: complete } });
  revalidateClient(clientId);
}

export async function addDocumentRequirement(formData: FormData) {
  const clientId = str(formData, "clientId");
  const name = str(formData, "name");
  if (!clientId || !name) throw new Error("Missing required fields.");

  await prisma.documentRequirement.create({
    data: { clientId, name, status: "Missing" },
  });

  revalidateClient(clientId);
}

export async function updateDocumentStatus(formData: FormData) {
  const id = str(formData, "id");
  const clientId = str(formData, "clientId");
  const status = str(formData, "status");
  if (!id || !clientId || !status) throw new Error("Missing required fields.");

  const doc = await prisma.documentRequirement.update({
    where: { id },
    data: {
      status,
      receivedAt: status === "Received" ? new Date() : null,
    },
  });

  if (status === "Received") {
    await logActivity(prisma, {
      clientId,
      type: "Document Received",
      description: `${doc.name} marked as received.`,
    });
  } else if (status === "Requested") {
    await logActivity(prisma, {
      clientId,
      type: "Document Requested",
      description: `${doc.name} requested from client.`,
    });
  }

  revalidateClient(clientId);
}

export async function updateDocumentRequirement(formData: FormData) {
  const id = str(formData, "id");
  const clientId = str(formData, "clientId");
  const name = str(formData, "name");
  if (!id || !clientId || !name) throw new Error("Missing required fields.");

  await prisma.documentRequirement.update({
    where: { id },
    data: { name, note: str(formData, "note") },
  });

  revalidateClient(clientId);
}

export async function deleteDocumentRequirement(formData: FormData) {
  const id = str(formData, "id");
  const clientId = str(formData, "clientId");
  if (!id || !clientId) throw new Error("Missing required fields.");

  await prisma.documentRequirement.delete({ where: { id } });
  revalidateClient(clientId);
}

export async function uploadDocumentFile(formData: FormData) {
  const id = str(formData, "id");
  const clientId = str(formData, "clientId");
  const file = formData.get("file");
  if (!id || !clientId) throw new Error("Missing required fields.");
  if (!(file instanceof File) || file.size === 0) throw new Error("No file selected.");

  const stored = await saveUploadedFile(clientId, file);
  const doc = await prisma.documentRequirement.update({
    where: { id },
    data: {
      status: "Received",
      receivedAt: new Date(),
      files: {
        create: {
          clientId,
          filename: stored.filename,
          path: stored.path,
          provider: stored.provider,
          purpose: "document",
        },
      },
    },
  });

  await logActivity(prisma, {
    clientId,
    type: "Document Received",
    description: `${doc.name} uploaded.`,
  });

  revalidateClient(clientId);
}
