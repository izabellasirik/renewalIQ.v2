"use server";

import { prisma } from "@/lib/db";
import { revalidatePath } from "next/cache";
import type { ActivityType } from "@/lib/activity";

function str(formData: FormData, key: string): string | null {
  const v = formData.get(key);
  if (typeof v !== "string") return null;
  const trimmed = v.trim();
  return trimmed.length ? trimmed : null;
}

export async function addActivity(formData: FormData) {
  const clientId = str(formData, "clientId");
  const type = str(formData, "type") as ActivityType | null;
  const description = str(formData, "description");
  if (!clientId || !type || !description) throw new Error("Missing required fields.");

  await prisma.activity.create({
    data: {
      clientId,
      type,
      description,
      note: str(formData, "note"),
      contactId: str(formData, "contactId"),
    },
  });

  revalidatePath(`/clients/${clientId}`);
}
