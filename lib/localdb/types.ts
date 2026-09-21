// Local (browser-only) mirror of the Prisma models used by the Account
// Workspace UI. Field shapes intentionally match prisma/schema.prisma so
// existing components/formatters (formatShortDate, StatusBadge, etc.) work
// unchanged. Driver/Vehicle/Mvr/Violation/MedicalCert are NOT included here:
// this app currently has no reachable UI for them (their nav tab was removed
// earlier), so there's nothing to migrate — see prisma/schema.prisma for
// their still-intact Postgres definitions.

export interface LocalClient {
  id: string;
  companyName: string;
  primaryContactName: string | null;
  email: string | null;
  phone: string | null;
  renewalDate: Date | null;
  policyExpirationDate: Date | null;
  status: string;
  documentsComplete: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export interface LocalContact {
  id: string;
  clientId: string;
  name: string;
  role: string | null;
  email: string | null;
  phone: string | null;
  createdAt: Date;
}

export interface LocalDocumentRequirement {
  id: string;
  clientId: string;
  name: string;
  status: string;
  receivedAt: Date | null;
  note: string | null;
  createdAt: Date;
  updatedAt: Date;
}

/**
 * Metadata only — never the uploaded bytes. `path`/`provider` (a real
 * storage reference) don't exist here on purpose: raw documents are never
 * persisted anywhere in this prototype, in memory only for the duration of
 * the upload request that classifies/analyzes them.
 */
export interface LocalFile {
  id: string;
  clientId: string;
  documentRequirementId: string | null;
  marketSubmissionId: string | null;
  purpose: string | null;
  filename: string;
  sizeBytes: number;
  category: string | null;
  analysisStatus: string;
  isDemo: boolean;
  uploadedAt: Date;
}

export interface LocalDocumentInsight {
  id: string;
  fileId: string;
  documentType: string;
  extractedFields: Record<string, unknown>;
  issues: unknown[];
  confidence: string;
  needsReview: boolean;
  summary: string;
  source: string;
  createdAt: Date;
}

export interface LocalActivity {
  id: string;
  clientId: string;
  contactId: string | null;
  type: string;
  description: string;
  note: string | null;
  occurredAt: Date;
}

export interface LocalNote {
  id: string;
  clientId: string;
  content: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface LocalFollowUp {
  id: string;
  clientId: string;
  documentRequirementId: string | null;
  contactId: string | null;
  marketSubmissionId: string | null;
  forLabel: string;
  action: string;
  dueDate: Date;
  note: string | null;
  completed: boolean;
  completedAt: Date | null;
  createdAt: Date;
}

export interface LocalMarketSubmission {
  id: string;
  clientId: string;
  carrierName: string;
  contactName: string | null;
  contactEmail: string | null;
  contactPhone: string | null;
  submittedDate: Date | null;
  status: string;
  notes: string | null;
  requestedInfo: string | null;
  premium: number | null;
  effectiveDate: Date | null;
  expirationDate: Date | null;
  createdAt: Date;
  updatedAt: Date;
}

export interface LocalStoreState {
  clients: LocalClient[];
  contacts: LocalContact[];
  documentRequirements: LocalDocumentRequirement[];
  files: LocalFile[];
  documentInsights: LocalDocumentInsight[];
  activities: LocalActivity[];
  notes: LocalNote[];
  followUps: LocalFollowUp[];
  marketSubmissions: LocalMarketSubmission[];
}

export const EMPTY_STATE: LocalStoreState = {
  clients: [],
  contacts: [],
  documentRequirements: [],
  files: [],
  documentInsights: [],
  activities: [],
  notes: [],
  followUps: [],
  marketSubmissions: [],
};

export type StoreName = keyof LocalStoreState;

export const STORE_NAMES: StoreName[] = [
  "clients",
  "contacts",
  "documentRequirements",
  "files",
  "documentInsights",
  "activities",
  "notes",
  "followUps",
  "marketSubmissions",
];
