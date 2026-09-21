import { putRecord } from "./db";
import { generateId } from "./ids";
import type {
  LocalStoreState,
  LocalClient,
  LocalContact,
  LocalDocumentRequirement,
  LocalFile,
  LocalDocumentInsight,
  LocalActivity,
  LocalFollowUp,
  LocalMarketSubmission,
} from "./types";

// One-time demo account (ABC Trucking LLC — this app's long-running
// flagship example) so a fresh browser profile isn't a totally blank
// screen. Deliberately smaller than the old Postgres seed's full 10-client
// dataset — that's a scope decision to keep this focused, not an oversight;
// see the task's final report. Every document here is isDemo — fictional,
// no real file bytes ever existed for them even before this change.

const day = (offset: number) => {
  const d = new Date();
  d.setDate(d.getDate() + offset);
  d.setHours(12, 0, 0, 0);
  return d;
};

export async function seedIfEmpty(state: LocalStoreState): Promise<LocalStoreState> {
  if (state.clients.length > 0) return state;

  const now = new Date();
  const clientId = generateId("client");

  const client: LocalClient = {
    id: clientId,
    companyName: "ABC Trucking LLC",
    primaryContactName: "John Smith",
    email: "john.smith@abctruckingllc.example.com",
    phone: "(612) 555-0148",
    renewalDate: day(27),
    policyExpirationDate: day(30),
    status: "Waiting on Client",
    documentsComplete: false,
    createdAt: day(-23),
    updatedAt: now,
  };

  const contact: LocalContact = {
    id: generateId("contact"),
    clientId,
    name: "John Smith",
    role: "Owner",
    email: client.email,
    phone: client.phone,
    createdAt: day(-23),
  };

  const docRequirements: LocalDocumentRequirement[] = [
    {
      id: generateId("docreq"),
      clientId,
      name: "Loss Runs",
      status: "Requested",
      receivedAt: null,
      note: null,
      createdAt: day(-10),
      updatedAt: day(-10),
    },
    {
      id: generateId("docreq"),
      clientId,
      name: "Signed Application",
      status: "Missing",
      receivedAt: null,
      note: null,
      createdAt: day(-10),
      updatedAt: day(-10),
    },
  ];

  const demoDocs: { filename: string; category: string; documentType: string; fields: Record<string, unknown>; summary: string }[] = [
    {
      filename: "John_Smith_MVR.pdf",
      category: "mvr",
      documentType: "mvr",
      fields: { driverName: "John Smith", reportDate: day(-120).toISOString().slice(0, 10), historyYears: 3, violationCount: 2 },
      summary: "2 violations identified. MVR may need a more recent report.",
    },
    {
      filename: "John_Smith_License.pdf",
      category: "driver_license",
      documentType: "driver_license",
      fields: { driverName: "John Smith", state: "MN", licenseNumber: "S123-4567-8901", expirationDate: day(400).toISOString().slice(0, 10) },
      summary: "No issues identified.",
    },
    {
      filename: "Unit_102_Registration.pdf",
      category: "vehicle_registration",
      documentType: "vehicle_registration",
      fields: { vin: "4V4NC9EH5MN654321", registeredOwner: "ABC Trucking LLC", unitLabel: "Unit 102", expirationDate: day(180).toISOString().slice(0, 10) },
      summary: "VIN does not match vehicle record.",
    },
    {
      filename: "Current_Policy.pdf",
      category: "insurance_policy",
      documentType: "insurance_policy",
      fields: {
        carrierName: "Sentry Insurance",
        policyNumber: "SIC-4482910",
        effectiveDate: day(-335).toISOString().slice(0, 10),
        expirationDate: day(45).toISOString().slice(0, 10),
        premium: 48500,
      },
      summary: "No issues identified.",
    },
  ];

  const files: LocalFile[] = [];
  const insights: LocalDocumentInsight[] = [];
  for (const doc of demoDocs) {
    const fileId = generateId("file");
    files.push({
      id: fileId,
      clientId,
      documentRequirementId: null,
      marketSubmissionId: null,
      purpose: "client_document",
      filename: doc.filename,
      sizeBytes: 0,
      category: doc.category,
      analysisStatus: "Ready",
      isDemo: true,
      uploadedAt: day(-1),
    });
    insights.push({
      id: generateId("insight"),
      fileId,
      documentType: doc.documentType,
      extractedFields: doc.fields,
      issues: [],
      confidence: "high",
      needsReview: doc.summary !== "No issues identified.",
      summary: doc.summary,
      source: "demo",
      createdAt: day(-1),
    });
  }

  const followUp: LocalFollowUp = {
    id: generateId("followup"),
    clientId,
    documentRequirementId: docRequirements[0].id,
    contactId: contact.id,
    marketSubmissionId: null,
    forLabel: "Loss Runs",
    action: "Follow up with client regarding loss runs.",
    dueDate: day(2),
    note: null,
    completed: false,
    completedAt: null,
    createdAt: day(-6),
  };

  const markets: LocalMarketSubmission[] = [
    {
      id: generateId("market"),
      clientId,
      carrierName: "Progressive",
      contactName: "Sarah Miller",
      contactEmail: "sarah.miller@progressive.example.com",
      contactPhone: "(800) 555-0142",
      submittedDate: day(-3),
      status: "Waiting",
      notes: "Waiting for updated MVR before underwriting can continue.",
      requestedInfo: null,
      premium: null,
      effectiveDate: null,
      expirationDate: null,
      createdAt: day(-6),
      updatedAt: day(-3),
    },
    {
      id: generateId("market"),
      clientId,
      carrierName: "Travelers",
      contactName: "Mark Ito",
      contactEmail: "mark.ito@travelers.example.com",
      contactPhone: null,
      submittedDate: day(-5),
      status: "More Info Needed",
      notes: null,
      requestedInfo: "Updated MVR for driver\nCurrent registration for Unit 102",
      premium: null,
      effectiveDate: null,
      expirationDate: null,
      createdAt: day(-8),
      updatedAt: day(-5),
    },
  ];

  const activities: LocalActivity[] = [
    { id: generateId("activity"), clientId, contactId: null, type: "Client Created", description: "Client created.", note: null, occurredAt: day(-23) },
    { id: generateId("activity"), clientId, contactId: null, type: "Document Requested", description: "Loss Runs requested from client.", note: null, occurredAt: day(-10) },
    { id: generateId("activity"), clientId, contactId: null, type: "Quote Added", description: "Progressive added as quote.", note: null, occurredAt: day(-6) },
    { id: generateId("activity"), clientId, contactId: null, type: "Quote Added", description: "Travelers added as quote.", note: null, occurredAt: day(-8) },
    { id: generateId("activity"), clientId, contactId: null, type: "Quote Status Changed", description: "Travelers requested more information.", note: null, occurredAt: day(-5) },
    { id: generateId("activity"), clientId, contactId: null, type: "Follow-Up", description: "Follow-up scheduled — Loss Runs — " + day(2).toDateString(), note: null, occurredAt: day(-6) },
  ];

  const newState: LocalStoreState = {
    clients: [client],
    contacts: [contact],
    documentRequirements: docRequirements,
    files,
    documentInsights: insights,
    activities,
    notes: [],
    followUps: [followUp],
    marketSubmissions: markets,
  };

  await Promise.all([
    putRecord("clients", client),
    putRecord("contacts", contact),
    ...docRequirements.map((d) => putRecord("documentRequirements", d)),
    ...files.map((f) => putRecord("files", f)),
    ...insights.map((i) => putRecord("documentInsights", i)),
    ...activities.map((a) => putRecord("activities", a)),
    putRecord("followUps", followUp),
    ...markets.map((m) => putRecord("marketSubmissions", m)),
  ]);

  return newState;
}
