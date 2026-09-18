"use server";

import { prisma } from "@/lib/db";
import { revalidatePath } from "next/cache";

function str(formData: FormData, key: string): string | null {
  const v = formData.get(key);
  if (typeof v !== "string") return null;
  const trimmed = v.trim();
  return trimmed.length ? trimmed : null;
}

function revalidateClient(clientId: string) {
  revalidatePath(`/clients/${clientId}`);
}

export async function addNote(formData: FormData) {
  const clientId = str(formData, "clientId");
  const content = str(formData, "content");
  if (!clientId || !content) throw new Error("Missing required fields.");

  await prisma.note.create({ data: { clientId, content } });
  revalidateClient(clientId);
}

export async function updateNote(formData: FormData) {
  const id = str(formData, "id");
  const clientId = str(formData, "clientId");
  const content = str(formData, "content");
  if (!id || !clientId || !content) throw new Error("Missing required fields.");

  await prisma.note.update({ where: { id }, data: { content } });
  revalidateClient(clientId);
}

export async function deleteNote(formData: FormData) {
  const id = str(formData, "id");
  const clientId = str(formData, "clientId");
  if (!id || !clientId) throw new Error("Missing required fields.");

  await prisma.note.delete({ where: { id } });
  revalidateClient(clientId);
}
