// Provider-agnostic shape for the Documents-tab extraction experiment.
// Every result — real AI, or the "no key configured" fallback — comes back
// in this same shape so the UI never has to know which produced it.

export const DOCUMENT_ANALYSIS_CATEGORIES = [
  "mvr",
  "driver_license",
  "vehicle_registration",
  "insurance_policy",
  "other",
] as const;

export type DocumentAnalysisCategory = (typeof DOCUMENT_ANALYSIS_CATEGORIES)[number];

export const DOCUMENT_ANALYSIS_CATEGORY_LABELS: Record<DocumentAnalysisCategory, string> = {
  mvr: "MVR",
  driver_license: "Driver License",
  vehicle_registration: "Vehicle Registration",
  insurance_policy: "Insurance Policy",
  other: "Other",
};

/** Extracted field values. `null` means "looked for it, not identified" — never omit a field the UI expects, and never invent a value. */
export type ExtractedFields = Record<string, string | number | null>;

/** Neutral, workflow-only categories — never an eligibility or underwriting label. */
export type IssueCategory = "review" | "update" | "mismatch";
export type IssueSeverity = "info" | "warning";

export interface DocumentIssue {
  category: IssueCategory;
  severity: IssueSeverity;
  message: string;
  /** e.g. a driver's name or a vehicle label, for grouping in Needs Attention. */
  subject?: string;
}

export type Confidence = "high" | "medium" | "low";

/** Where a result came from — surfaced in the UI so demo/unavailable data is never mistaken for a real read. */
export type AnalysisSource = "ai" | "demo" | "unavailable";

export interface AnalysisResult {
  documentType: DocumentAnalysisCategory;
  extractedFields: ExtractedFields;
  issues: DocumentIssue[];
  confidence: Confidence;
  needsReview: boolean;
  summary: string;
  source: AnalysisSource;
}
