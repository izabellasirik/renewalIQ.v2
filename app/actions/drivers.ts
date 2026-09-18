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

export async function addDriver(formData: FormData) {
  const clientId = str(formData, "clientId");
  const name = str(formData, "name");
  if (!clientId || !name) throw new Error("Missing required fields.");

  await prisma.driver.create({
    data: {
      clientId,
      name,
      licenseNumber: str(formData, "licenseNumber"),
      licenseState: str(formData, "licenseState"),
      licenseIssueDate: parseDateInput(str(formData, "licenseIssueDate")),
      licenseExpirationDate: parseDateInput(str(formData, "licenseExpirationDate")),
      requiredHistoryYears: num(formData, "requiredHistoryYears"),
    },
  });

  await logActivity(prisma, {
    clientId,
    type: "Driver Added",
    description: `Driver added — ${name}.`,
  });

  revalidateClient(clientId);
}

export async function updateDriver(formData: FormData) {
  const id = str(formData, "id");
  const clientId = str(formData, "clientId");
  const name = str(formData, "name");
  if (!id || !clientId || !name) throw new Error("Missing required fields.");

  await prisma.driver.update({
    where: { id },
    data: {
      name,
      licenseNumber: str(formData, "licenseNumber"),
      licenseState: str(formData, "licenseState"),
      licenseIssueDate: parseDateInput(str(formData, "licenseIssueDate")),
      licenseExpirationDate: parseDateInput(str(formData, "licenseExpirationDate")),
      requiredHistoryYears: num(formData, "requiredHistoryYears"),
      previousLicenseNeeded: formData.get("previousLicenseNeeded") === "on",
    },
  });

  revalidateClient(clientId);
}

export async function deleteDriver(formData: FormData) {
  const id = str(formData, "id");
  const clientId = str(formData, "clientId");
  if (!id || !clientId) throw new Error("Missing required fields.");

  await prisma.driver.delete({ where: { id } });
  revalidateClient(clientId);
}

export async function uploadDriverFile(formData: FormData) {
  const driverId = str(formData, "driverId");
  const clientId = str(formData, "clientId");
  const purpose = str(formData, "purpose") ?? "license";
  const file = formData.get("file");
  if (!driverId || !clientId) throw new Error("Missing required fields.");
  if (!(file instanceof File) || file.size === 0) throw new Error("No file selected.");

  const driver = await prisma.driver.findUnique({ where: { id: driverId } });
  if (!driver) throw new Error("Driver not found.");

  const stored = await saveUploadedFile(clientId, file);
  await prisma.file.create({
    data: {
      clientId,
      driverId,
      purpose,
      filename: stored.filename,
      path: stored.path,
      provider: stored.provider,
    },
  });

  if (purpose === "previousLicense") {
    await prisma.driver.update({ where: { id: driverId }, data: { previousLicenseNeeded: false } });
  }

  await logActivity(prisma, {
    clientId,
    type: "Driver License Uploaded",
    description:
      purpose === "previousLicense"
        ? `Previous license uploaded — ${driver.name}.`
        : `Driver's license uploaded — ${driver.name}.`,
  });

  revalidateClient(clientId);
}

export async function addMvr(formData: FormData) {
  const driverId = str(formData, "driverId");
  const clientId = str(formData, "clientId");
  const reportDate = parseDateInput(str(formData, "reportDate"));
  if (!driverId || !clientId || !reportDate) throw new Error("Missing required fields.");

  const driver = await prisma.driver.findUnique({ where: { id: driverId } });
  if (!driver) throw new Error("Driver not found.");

  const mvr = await prisma.mvr.create({
    data: {
      driverId,
      reportDate,
      historyYears: num(formData, "historyYears"),
      notes: str(formData, "notes"),
    },
  });

  const file = formData.get("file");
  if (file instanceof File && file.size > 0) {
    const stored = await saveUploadedFile(clientId, file);
    await prisma.file.create({
      data: {
        clientId,
        driverId,
        mvrId: mvr.id,
        purpose: "mvr",
        filename: stored.filename,
        path: stored.path,
        provider: stored.provider,
      },
    });
  }

  await logActivity(prisma, {
    clientId,
    type: "MVR Uploaded",
    description: `MVR uploaded — ${driver.name}.`,
  });

  revalidateClient(clientId);
}

export async function addViolation(formData: FormData) {
  const mvrId = str(formData, "mvrId");
  const clientId = str(formData, "clientId");
  const type = str(formData, "type");
  const severity = str(formData, "severity");
  if (!mvrId || !clientId || !type || !severity) throw new Error("Missing required fields.");

  await prisma.violation.create({
    data: {
      mvrId,
      type,
      severity,
      date: parseDateInput(str(formData, "date")),
      description: str(formData, "description"),
    },
  });

  await logActivity(prisma, {
    clientId,
    type: "Other",
    description: `Violation added — ${type} (${severity}).`,
  });

  revalidateClient(clientId);
}

export async function addMedicalCert(formData: FormData) {
  const driverId = str(formData, "driverId");
  const clientId = str(formData, "clientId");
  if (!driverId || !clientId) throw new Error("Missing required fields.");

  const driver = await prisma.driver.findUnique({ where: { id: driverId } });
  if (!driver) throw new Error("Driver not found.");

  const cert = await prisma.medicalCert.create({
    data: {
      driverId,
      issueDate: parseDateInput(str(formData, "issueDate")),
      expirationDate: parseDateInput(str(formData, "expirationDate")),
      notes: str(formData, "notes"),
    },
  });

  const file = formData.get("file");
  if (file instanceof File && file.size > 0) {
    const stored = await saveUploadedFile(clientId, file);
    await prisma.file.create({
      data: {
        clientId,
        driverId,
        medicalCertId: cert.id,
        purpose: "medical",
        filename: stored.filename,
        path: stored.path,
        provider: stored.provider,
      },
    });
  }

  await logActivity(prisma, {
    clientId,
    type: "Medical Cert Uploaded",
    description: `Medical certificate uploaded — ${driver.name}.`,
  });

  revalidateClient(clientId);
}
