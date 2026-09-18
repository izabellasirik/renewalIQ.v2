"use server";

import { prisma } from "@/lib/db";
import { logActivity } from "@/lib/activity";
import { formatShortDate, parseDateInput } from "@/lib/format";
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

export async function scheduleFollowUp(formData: FormData) {
  const clientId = str(formData, "clientId");
  const forLabel = str(formData, "forLabel");
  const action = str(formData, "action");
  const dueDate = parseDateInput(str(formData, "dueDate"));
  if (!clientId || !forLabel || !action || !dueDate) {
    throw new Error("Missing required fields.");
  }

  const documentRequirementId = str(formData, "documentRequirementId");
  const contactId = str(formData, "contactId");
  const driverId = str(formData, "driverId");
  const vehicleId = str(formData, "vehicleId");
  const marketSubmissionId = str(formData, "marketSubmissionId");
  const note = str(formData, "note");

  await prisma.followUp.create({
    data: {
      clientId,
      forLabel,
      action,
      dueDate,
      note,
      documentRequirementId,
      contactId,
      driverId,
      vehicleId,
      marketSubmissionId,
    },
  });

  if (documentRequirementId) {
    const doc = await prisma.documentRequirement.findUnique({ where: { id: documentRequirementId } });
    if (doc && doc.status === "Missing") {
      await prisma.documentRequirement.update({
        where: { id: documentRequirementId },
        data: { status: "Requested" },
      });
      await logActivity(prisma, {
        clientId,
        type: "Document Requested",
        description: `${doc.name} requested from client.`,
      });
    }
  }

  let description = `Follow-up scheduled — ${forLabel} — ${formatShortDate(dueDate)}`;
  if (marketSubmissionId) {
    const market = await prisma.marketSubmission.findUnique({ where: { id: marketSubmissionId } });
    if (market) {
      description = `Follow-up scheduled with ${market.carrierName} for ${formatShortDate(dueDate)}.`;
    }
  }

  await logActivity(prisma, {
    clientId,
    contactId,
    type: "Follow-Up",
    description,
    note,
  });

  revalidateClient(clientId);
}

export async function completeFollowUp(formData: FormData) {
  const id = str(formData, "id");
  const clientId = str(formData, "clientId");
  const completionNote = str(formData, "completionNote");
  if (!id || !clientId) throw new Error("Missing required fields.");

  const followUp = await prisma.followUp.update({
    where: { id },
    data: { completed: true, completedAt: new Date() },
  });

  await logActivity(prisma, {
    clientId,
    contactId: followUp.contactId,
    type: "Follow-Up",
    description: "Follow-up completed",
    note: completionNote ?? `${followUp.action}`,
  });

  revalidateClient(clientId);
}

export async function editFollowUp(formData: FormData) {
  const id = str(formData, "id");
  const clientId = str(formData, "clientId");
  const forLabel = str(formData, "forLabel");
  const action = str(formData, "action");
  const dueDate = parseDateInput(str(formData, "dueDate"));
  if (!id || !clientId || !forLabel || !action || !dueDate) {
    throw new Error("Missing required fields.");
  }

  await prisma.followUp.update({
    where: { id },
    data: { forLabel, action, dueDate, note: str(formData, "note") },
  });

  revalidateClient(clientId);
}
