"use client";

// Local (browser-only) implementation of the same operations that used to
// live in app/actions/*.ts against Postgres. Function names/signatures
// mirror those files closely on purpose, so calling components change
// mainly their import path — the Postgres versions are untouched and still
// work if a component is pointed back at them (see legacy-postgres/ and
// app/actions/*.ts, both left exactly as they were).
//
// Every mutation here does two things: persist the changed record(s) to
// IndexedDB, then call applyLocalUpdate so subscribed components re-render —
// the local stand-in for revalidatePath. Nothing in this file talks to a
// server except uploadClientDocuments, which calls /api/analyze-document
// purely to run AI extraction on bytes that are never persisted anywhere —
// see that route's own comment.

import { putRecord, deleteRecord } from "./db";
import { generateId } from "./ids";
import { applyLocalUpdate, getCurrentState } from "./store";
import { parseDateInput, formatShortDate } from "../format";
import type { LocalStoreState, LocalFile, LocalDocumentInsight } from "./types";
import type { ActivityType } from "../activity";
import type { AnalysisResult } from "../documentAnalysis/types";

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

async function logActivity(params: {
  clientId: string;
  type: ActivityType | string;
  description: string;
  note?: string | null;
  contactId?: string | null;
}): Promise<void> {
  const activity = {
    id: generateId("activity"),
    clientId: params.clientId,
    contactId: params.contactId ?? null,
    type: params.type,
    description: params.description,
    note: params.note ?? null,
    occurredAt: new Date(),
  };
  await putRecord("activities", activity);
  applyLocalUpdate((s) => ({ ...s, activities: [...s.activities, activity] }));
}

// ---------------------------------------------------------------------------
// Clients (mirrors app/actions/clients.ts)
// ---------------------------------------------------------------------------

/** Returns the new client's id — callers navigate themselves (redirect() is server-only and doesn't exist client-side). */
export async function createClient(formData: FormData): Promise<{ id: string }> {
  const companyName = str(formData, "companyName");
  if (!companyName) throw new Error("Company name is required.");

  const now = new Date();
  const clientId = generateId("client");
  const client = {
    id: clientId,
    companyName,
    primaryContactName: str(formData, "primaryContactName"),
    email: str(formData, "email"),
    phone: str(formData, "phone"),
    renewalDate: parseDateInput(str(formData, "renewalDate")),
    policyExpirationDate: parseDateInput(str(formData, "policyExpirationDate")),
    status: str(formData, "status") ?? "On Track",
    documentsComplete: false,
    createdAt: now,
    updatedAt: now,
  };
  await putRecord("clients", client);
  applyLocalUpdate((s) => ({ ...s, clients: [...s.clients, client] }));

  const contactName = str(formData, "primaryContactName");
  if (contactName) {
    const contact = {
      id: generateId("contact"),
      clientId,
      name: contactName,
      role: "Primary Contact",
      email: str(formData, "email"),
      phone: str(formData, "phone"),
      createdAt: now,
    };
    await putRecord("contacts", contact);
    applyLocalUpdate((s) => ({ ...s, contacts: [...s.contacts, contact] }));
  }

  await logActivity({ clientId, type: "Client Created", description: "Client created." });

  const notes = str(formData, "notes");
  if (notes) {
    const note = { id: generateId("note"), clientId, content: notes, createdAt: now, updatedAt: now };
    await putRecord("notes", note);
    applyLocalUpdate((s) => ({ ...s, notes: [...s.notes, note] }));
  }

  return { id: clientId };
}

export async function updateClientOverview(formData: FormData): Promise<void> {
  const id = str(formData, "id");
  if (!id) throw new Error("Missing client id.");

  const existing = getCurrentState().clients.find((c) => c.id === id);
  if (!existing) return;

  const updated = {
    ...existing,
    companyName: str(formData, "companyName") ?? existing.companyName,
    primaryContactName: str(formData, "primaryContactName"),
    email: str(formData, "email"),
    phone: str(formData, "phone"),
    renewalDate: parseDateInput(str(formData, "renewalDate")),
    policyExpirationDate: parseDateInput(str(formData, "policyExpirationDate")),
    status: str(formData, "status") ?? existing.status,
    updatedAt: new Date(),
  };
  await putRecord("clients", updated);
  applyLocalUpdate((s) => ({ ...s, clients: s.clients.map((c) => (c.id === id ? updated : c)) }));
}

// ---------------------------------------------------------------------------
// Document checklist (mirrors app/actions/documents.ts)
// ---------------------------------------------------------------------------

export async function setDocumentsComplete(formData: FormData): Promise<void> {
  const clientId = str(formData, "clientId");
  const complete = str(formData, "complete") === "true";
  if (!clientId) throw new Error("Missing client.");

  const existing = getCurrentState().clients.find((c) => c.id === clientId);
  if (!existing) return;
  const updated = { ...existing, documentsComplete: complete, updatedAt: new Date() };
  await putRecord("clients", updated);
  applyLocalUpdate((s) => ({ ...s, clients: s.clients.map((c) => (c.id === clientId ? updated : c)) }));
}

export async function addDocumentRequirement(formData: FormData): Promise<void> {
  const clientId = str(formData, "clientId");
  const name = str(formData, "name");
  if (!clientId || !name) throw new Error("Missing required fields.");

  const now = new Date();
  const doc = { id: generateId("docreq"), clientId, name, status: "Missing", receivedAt: null, note: null, createdAt: now, updatedAt: now };
  await putRecord("documentRequirements", doc);
  applyLocalUpdate((s) => ({ ...s, documentRequirements: [...s.documentRequirements, doc] }));
}

export async function updateDocumentStatus(formData: FormData): Promise<void> {
  const id = str(formData, "id");
  const clientId = str(formData, "clientId");
  const status = str(formData, "status");
  if (!id || !clientId || !status) throw new Error("Missing required fields.");

  const existing = getCurrentState().documentRequirements.find((d) => d.id === id);
  if (!existing) return;
  const updated = { ...existing, status, receivedAt: status === "Received" ? new Date() : null, updatedAt: new Date() };
  await putRecord("documentRequirements", updated);
  applyLocalUpdate((s) => ({ ...s, documentRequirements: s.documentRequirements.map((d) => (d.id === id ? updated : d)) }));

  if (status === "Received") {
    await logActivity({ clientId, type: "Document Received", description: `${updated.name} marked as received.` });
  } else if (status === "Requested") {
    await logActivity({ clientId, type: "Document Requested", description: `${updated.name} requested from client.` });
  }
}

export async function updateDocumentRequirement(formData: FormData): Promise<void> {
  const id = str(formData, "id");
  const name = str(formData, "name");
  if (!id || !name) throw new Error("Missing required fields.");

  const existing = getCurrentState().documentRequirements.find((d) => d.id === id);
  if (!existing) return;
  const updated = { ...existing, name, note: str(formData, "note"), updatedAt: new Date() };
  await putRecord("documentRequirements", updated);
  applyLocalUpdate((s) => ({ ...s, documentRequirements: s.documentRequirements.map((d) => (d.id === id ? updated : d)) }));
}

export async function deleteDocumentRequirement(formData: FormData): Promise<void> {
  const id = str(formData, "id");
  if (!id) throw new Error("Missing required fields.");

  await deleteRecord("documentRequirements", id);
  applyLocalUpdate((s) => ({ ...s, documentRequirements: s.documentRequirements.filter((d) => d.id !== id) }));
}

/** Checklist attachments never analyzed a document even in the Postgres version — only filename/size are recorded here, and (per this prototype's rule) the bytes are never stored anywhere at all. */
export async function uploadDocumentFile(formData: FormData): Promise<void> {
  const id = str(formData, "id");
  const clientId = str(formData, "clientId");
  const file = formData.get("file");
  if (!id || !clientId) throw new Error("Missing required fields.");
  if (!(file instanceof File) || file.size === 0) throw new Error("No file selected.");

  const existing = getCurrentState().documentRequirements.find((d) => d.id === id);
  if (!existing) return;
  const updated = { ...existing, status: "Received", receivedAt: new Date(), updatedAt: new Date() };
  await putRecord("documentRequirements", updated);

  const fileRecord: LocalFile = {
    id: generateId("file"),
    clientId,
    documentRequirementId: id,
    marketSubmissionId: null,
    purpose: "document",
    filename: file.name,
    sizeBytes: file.size,
    category: null,
    analysisStatus: "Ready",
    isDemo: false,
    uploadedAt: new Date(),
  };
  await putRecord("files", fileRecord);

  applyLocalUpdate((s) => ({
    ...s,
    documentRequirements: s.documentRequirements.map((d) => (d.id === id ? updated : d)),
    files: [...s.files, fileRecord],
  }));

  await logActivity({ clientId, type: "Document Received", description: `${updated.name} uploaded.` });
}

// ---------------------------------------------------------------------------
// Documents tab uploads + AI analysis (mirrors app/actions/clientDocuments.ts)
// ---------------------------------------------------------------------------

type UploadResult = { ok: true } | { ok: false; error: string };

export async function uploadClientDocuments(formData: FormData): Promise<UploadResult> {
  const clientId = str(formData, "clientId");
  if (!clientId) return { ok: false, error: "Missing client." };

  const files = formData.getAll("files").filter((f): f is File => f instanceof File && f.size > 0);
  if (files.length === 0) return { ok: false, error: "No files selected." };

  for (const file of files) {
    const fileRecord: LocalFile = {
      id: generateId("file"),
      clientId,
      documentRequirementId: null,
      marketSubmissionId: null,
      purpose: "client_document",
      filename: file.name,
      sizeBytes: file.size,
      category: null,
      analysisStatus: "Ready",
      isDemo: false,
      uploadedAt: new Date(),
    };

    try {
      const analyzeForm = new FormData();
      analyzeForm.set("file", file);
      const res = await fetch("/api/analyze-document", { method: "POST", body: analyzeForm });
      const body = (await res.json()) as { ok: true; result: AnalysisResult } | { ok: false; error: string };

      if (!body.ok) {
        console.error(`[uploadClientDocuments] Analysis failed for "${file.name}": ${body.error}`);
        fileRecord.analysisStatus = "Failed";
        await putRecord("files", fileRecord);
        applyLocalUpdate((s) => ({ ...s, files: [...s.files, fileRecord] }));
        continue;
      }

      fileRecord.category = body.result.documentType;
      await putRecord("files", fileRecord);

      const insight: LocalDocumentInsight = {
        id: generateId("insight"),
        fileId: fileRecord.id,
        documentType: body.result.documentType,
        extractedFields: body.result.extractedFields,
        issues: body.result.issues,
        confidence: body.result.confidence,
        needsReview: body.result.needsReview,
        summary: body.result.summary,
        source: body.result.source,
        createdAt: new Date(),
      };
      await putRecord("documentInsights", insight);

      applyLocalUpdate((s) => ({ ...s, files: [...s.files, fileRecord], documentInsights: [...s.documentInsights, insight] }));
    } catch (err) {
      console.error(`[uploadClientDocuments] Failed to process "${file.name}":`, err);
      fileRecord.analysisStatus = "Failed";
      await putRecord("files", fileRecord);
      applyLocalUpdate((s) => ({ ...s, files: [...s.files, fileRecord] }));
    }
  }

  await logActivity({ clientId, type: "Document Uploaded", description: `${files.length} document${files.length === 1 ? "" : "s"} uploaded.` });

  return { ok: true };
}

export async function deleteClientDocument(formData: FormData): Promise<void> {
  const id = str(formData, "id");
  if (!id) throw new Error("Missing required fields.");

  const insight = getCurrentState().documentInsights.find((i) => i.fileId === id);
  await deleteRecord("files", id);
  if (insight) await deleteRecord("documentInsights", insight.id);

  applyLocalUpdate((s) => ({
    ...s,
    files: s.files.filter((f) => f.id !== id),
    documentInsights: s.documentInsights.filter((i) => i.fileId !== id),
  }));
}

// ---------------------------------------------------------------------------
// Follow-ups (mirrors app/actions/followups.ts)
// ---------------------------------------------------------------------------

export async function scheduleFollowUp(formData: FormData): Promise<void> {
  const clientId = str(formData, "clientId");
  const forLabel = str(formData, "forLabel");
  const action = str(formData, "action");
  const dueDate = parseDateInput(str(formData, "dueDate"));
  if (!clientId || !forLabel || !action || !dueDate) throw new Error("Missing required fields.");

  const documentRequirementId = str(formData, "documentRequirementId");
  const contactId = str(formData, "contactId");
  const marketSubmissionId = str(formData, "marketSubmissionId");
  const note = str(formData, "note");

  const followUp = {
    id: generateId("followup"),
    clientId,
    forLabel,
    action,
    dueDate,
    note,
    documentRequirementId,
    contactId,
    marketSubmissionId,
    completed: false,
    completedAt: null,
    createdAt: new Date(),
  };
  await putRecord("followUps", followUp);
  applyLocalUpdate((s) => ({ ...s, followUps: [...s.followUps, followUp] }));

  if (documentRequirementId) {
    const doc = getCurrentState().documentRequirements.find((d) => d.id === documentRequirementId);
    if (doc && doc.status === "Missing") {
      const updated = { ...doc, status: "Requested", updatedAt: new Date() };
      await putRecord("documentRequirements", updated);
      applyLocalUpdate((s) => ({ ...s, documentRequirements: s.documentRequirements.map((d) => (d.id === documentRequirementId ? updated : d)) }));
      await logActivity({ clientId, type: "Document Requested", description: `${doc.name} requested from client.` });
    }
  }

  let description = `Follow-up scheduled — ${forLabel} — ${formatShortDate(dueDate)}`;
  if (marketSubmissionId) {
    const market = getCurrentState().marketSubmissions.find((m) => m.id === marketSubmissionId);
    if (market) description = `Follow-up scheduled with ${market.carrierName} for ${formatShortDate(dueDate)}.`;
  }

  await logActivity({ clientId, contactId, type: "Follow-Up", description, note });
}

export async function completeFollowUp(formData: FormData): Promise<void> {
  const id = str(formData, "id");
  const clientId = str(formData, "clientId");
  const completionNote = str(formData, "completionNote");
  if (!id || !clientId) throw new Error("Missing required fields.");

  const existing = getCurrentState().followUps.find((f) => f.id === id);
  if (!existing) return;
  const updated = { ...existing, completed: true, completedAt: new Date() };
  await putRecord("followUps", updated);
  applyLocalUpdate((s) => ({ ...s, followUps: s.followUps.map((f) => (f.id === id ? updated : f)) }));

  await logActivity({
    clientId,
    contactId: existing.contactId,
    type: "Follow-Up",
    description: "Follow-up completed",
    note: completionNote ?? existing.action,
  });
}

export async function editFollowUp(formData: FormData): Promise<void> {
  const id = str(formData, "id");
  const forLabel = str(formData, "forLabel");
  const action = str(formData, "action");
  const dueDate = parseDateInput(str(formData, "dueDate"));
  if (!id || !forLabel || !action || !dueDate) throw new Error("Missing required fields.");

  const existing = getCurrentState().followUps.find((f) => f.id === id);
  if (!existing) return;
  const updated = { ...existing, forLabel, action, dueDate, note: str(formData, "note") };
  await putRecord("followUps", updated);
  applyLocalUpdate((s) => ({ ...s, followUps: s.followUps.map((f) => (f.id === id ? updated : f)) }));
}

// ---------------------------------------------------------------------------
// Quotes / Markets (mirrors app/actions/markets.ts)
// ---------------------------------------------------------------------------

function statusChangeActivity(carrierName: string, fromStatus: string, toStatus: string): { type: ActivityType; description: string } {
  switch (toStatus) {
    case "Submitted":
      return { type: "Quote Status Changed", description: `Submission sent to ${carrierName}.` };
    case "Quote Received":
      return { type: "Quote Received", description: `Quote received from ${carrierName}.` };
    case "More Info Needed":
      return { type: "Quote Status Changed", description: `${carrierName} requested more information.` };
    case "Declined":
      return { type: "Quote Status Changed", description: `${carrierName} declined.` };
    case "Bound":
      return { type: "Quote Status Changed", description: `${carrierName} marked Bound.` };
    default:
      return { type: "Quote Status Changed", description: `${carrierName} status changed from ${fromStatus} to ${toStatus}.` };
  }
}

export async function addMarket(formData: FormData): Promise<void> {
  const clientId = str(formData, "clientId");
  const carrierName = str(formData, "carrierName");
  if (!clientId || !carrierName) throw new Error("Missing required fields.");

  const now = new Date();
  const market = {
    id: generateId("market"),
    clientId,
    carrierName,
    contactName: str(formData, "contactName"),
    contactEmail: str(formData, "contactEmail"),
    contactPhone: str(formData, "contactPhone"),
    submittedDate: parseDateInput(str(formData, "submittedDate")),
    status: str(formData, "status") ?? "Not Contacted",
    notes: str(formData, "notes"),
    requestedInfo: null,
    premium: null,
    effectiveDate: null,
    expirationDate: null,
    createdAt: now,
    updatedAt: now,
  };
  await putRecord("marketSubmissions", market);
  applyLocalUpdate((s) => ({ ...s, marketSubmissions: [...s.marketSubmissions, market] }));

  await logActivity({ clientId, type: "Quote Added", description: `${carrierName} added as quote.` });
}

export async function updateMarket(formData: FormData): Promise<void> {
  const id = str(formData, "id");
  const clientId = str(formData, "clientId");
  const carrierName = str(formData, "carrierName");
  if (!id || !clientId || !carrierName) throw new Error("Missing required fields.");

  const existing = getCurrentState().marketSubmissions.find((m) => m.id === id);
  if (!existing) throw new Error("Market not found.");

  const status = str(formData, "status") ?? existing.status;
  const updated = {
    ...existing,
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
    updatedAt: new Date(),
  };
  await putRecord("marketSubmissions", updated);
  applyLocalUpdate((s) => ({ ...s, marketSubmissions: s.marketSubmissions.map((m) => (m.id === id ? updated : m)) }));

  if (status !== existing.status) {
    const { type, description } = statusChangeActivity(carrierName, existing.status, status);
    await logActivity({ clientId, type, description });
  }
}

export async function deleteMarket(formData: FormData): Promise<void> {
  const id = str(formData, "id");
  if (!id) throw new Error("Missing required fields.");

  await deleteRecord("marketSubmissions", id);
  applyLocalUpdate((s) => ({ ...s, marketSubmissions: s.marketSubmissions.filter((m) => m.id !== id) }));
}

/** Quote attachments, like checklist attachments, are metadata-only — no bytes persisted. */
export async function uploadQuoteFile(formData: FormData): Promise<void> {
  const marketId = str(formData, "marketId");
  const clientId = str(formData, "clientId");
  const file = formData.get("file");
  if (!marketId || !clientId) throw new Error("Missing required fields.");
  if (!(file instanceof File) || file.size === 0) throw new Error("No file selected.");

  const market = getCurrentState().marketSubmissions.find((m) => m.id === marketId);
  if (!market) throw new Error("Market not found.");

  const fileRecord: LocalFile = {
    id: generateId("file"),
    clientId,
    documentRequirementId: null,
    marketSubmissionId: marketId,
    purpose: "quote",
    filename: file.name,
    sizeBytes: file.size,
    category: null,
    analysisStatus: "Ready",
    isDemo: false,
    uploadedAt: new Date(),
  };
  await putRecord("files", fileRecord);
  applyLocalUpdate((s) => ({ ...s, files: [...s.files, fileRecord] }));

  await logActivity({ clientId, type: "Other", description: `Quote document uploaded — ${market.carrierName}.` });
}

// ---------------------------------------------------------------------------
// Activity (mirrors app/actions/activities.ts)
// ---------------------------------------------------------------------------

export async function addActivity(formData: FormData): Promise<void> {
  const clientId = str(formData, "clientId");
  const type = str(formData, "type") as ActivityType | null;
  const description = str(formData, "description");
  if (!clientId || !type || !description) throw new Error("Missing required fields.");

  await logActivity({ clientId, type, description, note: str(formData, "note"), contactId: str(formData, "contactId") });
}

// ---------------------------------------------------------------------------
// Notes (mirrors app/actions/notes.ts)
// ---------------------------------------------------------------------------

export async function addNote(formData: FormData): Promise<void> {
  const clientId = str(formData, "clientId");
  const content = str(formData, "content");
  if (!clientId || !content) throw new Error("Missing required fields.");

  const now = new Date();
  const note = { id: generateId("note"), clientId, content, createdAt: now, updatedAt: now };
  await putRecord("notes", note);
  applyLocalUpdate((s) => ({ ...s, notes: [...s.notes, note] }));
}

export async function updateNote(formData: FormData): Promise<void> {
  const id = str(formData, "id");
  const content = str(formData, "content");
  if (!id || !content) throw new Error("Missing required fields.");

  const existing = getCurrentState().notes.find((n) => n.id === id);
  if (!existing) return;
  const updated = { ...existing, content, updatedAt: new Date() };
  await putRecord("notes", updated);
  applyLocalUpdate((s) => ({ ...s, notes: s.notes.map((n) => (n.id === id ? updated : n)) }));
}

export async function deleteNote(formData: FormData): Promise<void> {
  const id = str(formData, "id");
  if (!id) throw new Error("Missing required fields.");

  await deleteRecord("notes", id);
  applyLocalUpdate((s) => ({ ...s, notes: s.notes.filter((n) => n.id !== id) }));
}

// ---------------------------------------------------------------------------
// Test-data reset
// ---------------------------------------------------------------------------

export async function clearAllLocalData(): Promise<void> {
  const { clearAllStores } = await import("./db");
  const { resetLocalState } = await import("./store");
  await clearAllStores();
  resetLocalState();
}

export type { LocalStoreState };
