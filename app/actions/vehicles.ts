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

export async function addVehicle(formData: FormData) {
  const clientId = str(formData, "clientId");
  if (!clientId) throw new Error("Missing required fields.");

  const vehicle = await prisma.vehicle.create({
    data: {
      clientId,
      year: num(formData, "year"),
      make: str(formData, "make"),
      model: str(formData, "model"),
      vin: str(formData, "vin"),
      value: num(formData, "value"),
      valueNote: str(formData, "valueNote"),
      valueRecordedAt: num(formData, "value") != null ? new Date() : null,
      registrationOwner: str(formData, "registrationOwner"),
      registrationVin: str(formData, "registrationVin"),
      registrationAddress: str(formData, "registrationAddress"),
      registrationExpiration: parseDateInput(str(formData, "registrationExpiration")),
      registrationReceived: formData.get("registrationReceived") === "on",
    },
  });

  const label = [vehicle.year, vehicle.make, vehicle.model].filter(Boolean).join(" ") || "Vehicle";
  await logActivity(prisma, {
    clientId,
    type: "Vehicle Added",
    description: `Vehicle added — ${label}.`,
  });

  revalidateClient(clientId);
}

export async function updateVehicle(formData: FormData) {
  const id = str(formData, "id");
  const clientId = str(formData, "clientId");
  if (!id || !clientId) throw new Error("Missing required fields.");

  const value = num(formData, "value");
  const existing = await prisma.vehicle.findUnique({ where: { id } });

  await prisma.vehicle.update({
    where: { id },
    data: {
      year: num(formData, "year"),
      make: str(formData, "make"),
      model: str(formData, "model"),
      vin: str(formData, "vin"),
      value,
      valueNote: str(formData, "valueNote"),
      valueRecordedAt: value != null && existing?.value !== value ? new Date() : existing?.valueRecordedAt,
      registrationOwner: str(formData, "registrationOwner"),
      registrationVin: str(formData, "registrationVin"),
      registrationAddress: str(formData, "registrationAddress"),
      registrationExpiration: parseDateInput(str(formData, "registrationExpiration")),
      registrationReceived: formData.get("registrationReceived") === "on",
    },
  });

  revalidateClient(clientId);
}

export async function deleteVehicle(formData: FormData) {
  const id = str(formData, "id");
  const clientId = str(formData, "clientId");
  if (!id || !clientId) throw new Error("Missing required fields.");

  await prisma.vehicle.delete({ where: { id } });
  revalidateClient(clientId);
}

export async function uploadVehicleFile(formData: FormData) {
  const vehicleId = str(formData, "vehicleId");
  const clientId = str(formData, "clientId");
  const purpose = str(formData, "purpose") ?? "registration";
  const file = formData.get("file");
  if (!vehicleId || !clientId) throw new Error("Missing required fields.");
  if (!(file instanceof File) || file.size === 0) throw new Error("No file selected.");

  const vehicle = await prisma.vehicle.findUnique({ where: { id: vehicleId } });
  if (!vehicle) throw new Error("Vehicle not found.");

  const stored = await saveUploadedFile(clientId, file);
  await prisma.file.create({
    data: {
      clientId,
      vehicleId,
      purpose,
      filename: stored.filename,
      path: stored.path,
      provider: stored.provider,
    },
  });

  if (purpose === "registration") {
    await prisma.vehicle.update({ where: { id: vehicleId }, data: { registrationReceived: true } });
  }

  const label = [vehicle.year, vehicle.make, vehicle.model].filter(Boolean).join(" ") || "Vehicle";
  await logActivity(prisma, {
    clientId,
    type: purpose === "registration" ? "Registration Uploaded" : "Other",
    description:
      purpose === "registration"
        ? `Registration uploaded — ${label}.`
        : `File uploaded — ${label}.`,
  });

  revalidateClient(clientId);
}
