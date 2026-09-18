"use server";

import { prisma } from "@/lib/db";
import { logActivity } from "@/lib/activity";
import { parseDateInput } from "@/lib/format";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

function str(formData: FormData, key: string): string | null {
  const v = formData.get(key);
  if (typeof v !== "string") return null;
  const trimmed = v.trim();
  return trimmed.length ? trimmed : null;
}

export async function createClient(formData: FormData) {
  const companyName = str(formData, "companyName");
  if (!companyName) throw new Error("Company name is required.");

  const client = await prisma.client.create({
    data: {
      companyName,
      primaryContactName: str(formData, "primaryContactName"),
      email: str(formData, "email"),
      phone: str(formData, "phone"),
      renewalDate: parseDateInput(str(formData, "renewalDate")),
      policyExpirationDate: parseDateInput(str(formData, "policyExpirationDate")),
      status: str(formData, "status") ?? "Active",
    },
  });

  const contactName = str(formData, "primaryContactName");
  if (contactName) {
    await prisma.contact.create({
      data: {
        clientId: client.id,
        name: contactName,
        role: "Primary Contact",
        email: str(formData, "email"),
        phone: str(formData, "phone"),
      },
    });
  }

  await logActivity(prisma, {
    clientId: client.id,
    type: "Client Created",
    description: "Client created.",
  });

  const notes = str(formData, "notes");
  if (notes) {
    await prisma.note.create({ data: { clientId: client.id, content: notes } });
  }

  revalidatePath("/clients");
  revalidatePath("/today");
  redirect(`/clients/${client.id}?tab=documents&new=1`);
}

export async function updateClientOverview(formData: FormData) {
  const id = str(formData, "id");
  if (!id) throw new Error("Missing client id.");

  await prisma.client.update({
    where: { id },
    data: {
      companyName: str(formData, "companyName") ?? undefined,
      primaryContactName: str(formData, "primaryContactName"),
      email: str(formData, "email"),
      phone: str(formData, "phone"),
      renewalDate: parseDateInput(str(formData, "renewalDate")),
      policyExpirationDate: parseDateInput(str(formData, "policyExpirationDate")),
      status: str(formData, "status") ?? undefined,
    },
  });

  revalidatePath(`/clients/${id}`);
  revalidatePath("/clients");
  revalidatePath("/today");
}
