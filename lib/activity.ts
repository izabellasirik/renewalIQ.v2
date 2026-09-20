import type { Prisma, PrismaClient } from "@prisma/client";

export const ACTIVITY_TYPES = [
  "Email Sent",
  "Phone Call",
  "Client Contacted",
  "Document Requested",
  "Document Received",
  "Follow-Up",
  "Note",
  "Driver Added",
  "Driver License Uploaded",
  "MVR Uploaded",
  "Medical Cert Uploaded",
  "Vehicle Added",
  "Registration Uploaded",
  "Quote Added",
  "Quote Status Changed",
  "Quote Received",
  "Client Created",
  "Other",
] as const;

export type ActivityType = (typeof ACTIVITY_TYPES)[number];

type Db = PrismaClient | Prisma.TransactionClient;

export async function logActivity(
  db: Db,
  params: {
    clientId: string;
    type: ActivityType;
    description: string;
    note?: string | null;
    contactId?: string | null;
  }
) {
  return db.activity.create({
    data: {
      clientId: params.clientId,
      type: params.type,
      description: params.description,
      note: params.note ?? null,
      contactId: params.contactId ?? null,
    },
  });
}
