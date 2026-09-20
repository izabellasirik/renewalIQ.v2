import { differenceInCalendarDays, startOfDay } from "date-fns";
import type { Confidence, DocumentAnalysisCategory, DocumentIssue, ExtractedFields } from "./types";

// Everything here is workflow / document-tracking status only — flags tell a
// broker what's worth a second look, never whether a risk is acceptable.
// Mirrors the spirit (not the code) of the review-flags approach used
// elsewhere in this app for drivers/vehicles (see lib/status.ts).

const MVR_STALE_AFTER_DAYS = 90;
const EXPIRING_SOON_DAYS = 30;

function daysFromToday(iso: string | null, now: Date): number | null {
  if (!iso) return null;
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return null;
  return differenceInCalendarDays(startOfDay(d), startOfDay(now));
}

function asNumber(v: string | number | null): number | null {
  if (typeof v === "number") return v;
  if (typeof v === "string" && v.trim() !== "" && !Number.isNaN(Number(v))) return Number(v);
  return null;
}

export interface ReviewContext {
  now?: Date;
  /** VINs already on file for this client (from the Vehicle model), for the registration VIN-match check. */
  knownVins?: string[];
}

export interface EvaluatedExtraction {
  issues: DocumentIssue[];
  confidence: Confidence;
  needsReview: boolean;
}

function missingCoreFieldIssue(fields: ExtractedFields, keys: string[], subject: string | undefined, label: string): DocumentIssue | null {
  const missing = keys.filter((k) => fields[k] === null || fields[k] === undefined || fields[k] === "");
  if (missing.length === 0) return null;
  return { category: "review", severity: "warning", message: `${label} not fully identified — please review the original document.`, subject };
}

export function evaluateExtraction(
  category: DocumentAnalysisCategory,
  fields: ExtractedFields,
  context: ReviewContext = {}
): EvaluatedExtraction {
  const now = context.now ?? new Date();
  const issues: DocumentIssue[] = [];

  if (category === "mvr") {
    const subject = (fields.driverName as string) ?? undefined;
    const violationCount = asNumber(fields.violationCount);
    const reportAge = daysFromToday(fields.reportDate as string | null, now);

    if (violationCount !== null && violationCount > 0) {
      issues.push({ category: "review", severity: "warning", message: `${violationCount} violation${violationCount === 1 ? "" : "s"} identified`, subject });
    }
    if (reportAge !== null && -reportAge > MVR_STALE_AFTER_DAYS) {
      issues.push({ category: "update", severity: "info", message: "MVR may need a more recent report", subject });
    }
    const missing = missingCoreFieldIssue(fields, ["driverName", "reportDate"], subject, "Driver name or report date");
    if (missing) issues.push(missing);
  }

  if (category === "driver_license") {
    const subject = (fields.driverName as string) ?? undefined;
    const expDays = daysFromToday(fields.expirationDate as string | null, now);

    if (expDays !== null && expDays < 0) {
      issues.push({ category: "review", severity: "warning", message: "Driver's license appears expired", subject });
    } else if (expDays !== null && expDays <= EXPIRING_SOON_DAYS) {
      issues.push({ category: "update", severity: "info", message: "Driver's license expiration approaching", subject });
    }
    const missing = missingCoreFieldIssue(fields, ["driverName", "state", "expirationDate"], subject, "License details");
    if (missing) issues.push(missing);
  }

  if (category === "vehicle_registration") {
    const subject = (fields.unitLabel as string) ?? (fields.vin as string) ?? undefined;
    const vin = (fields.vin as string) ?? null;
    const expDays = daysFromToday(fields.expirationDate as string | null, now);

    if (vin && context.knownVins && context.knownVins.length > 0) {
      const matches = context.knownVins.some((v) => v.trim().toUpperCase() === vin.trim().toUpperCase());
      if (!matches) {
        issues.push({ category: "mismatch", severity: "warning", message: "VIN does not match vehicle record", subject });
      }
    }
    if (expDays !== null && expDays < 0) {
      issues.push({ category: "review", severity: "warning", message: "Registration appears expired", subject });
    } else if (expDays !== null && expDays <= EXPIRING_SOON_DAYS) {
      issues.push({ category: "update", severity: "info", message: "Registration expiration approaching", subject });
    }
    const missing = missingCoreFieldIssue(fields, ["vin", "registeredOwner"], subject, "Registration details");
    if (missing) issues.push(missing);
  }

  if (category === "insurance_policy") {
    const subject = (fields.carrierName as string) ?? undefined;
    const expDays = daysFromToday(fields.expirationDate as string | null, now);

    if (expDays !== null && expDays < 0) {
      issues.push({ category: "review", severity: "warning", message: "Policy appears expired", subject });
    } else if (expDays !== null && expDays <= EXPIRING_SOON_DAYS) {
      issues.push({ category: "update", severity: "info", message: "Policy expiration approaching", subject });
    }
    const missing = missingCoreFieldIssue(fields, ["carrierName", "policyNumber", "expirationDate"], subject, "Policy details");
    if (missing) issues.push(missing);
  }

  const needsReview = issues.length > 0;
  const missingCount = Object.values(fields).filter((v) => v === null).length;
  const confidence: Confidence = missingCount > 1 ? "low" : missingCount === 1 ? "medium" : "high";

  return { issues, confidence, needsReview };
}

export function vinMatchLabel(vin: string | null, knownVins: string[]): string {
  if (!vin) return "Not identified";
  if (knownVins.length === 0) return "No vehicle on file to compare";
  const matches = knownVins.some((v) => v.trim().toUpperCase() === vin.trim().toUpperCase());
  return matches ? "Matches vehicle record" : "Does not match vehicle record on file";
}
