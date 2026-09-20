"use client";

import { useState } from "react";
import type { File as PrismaFile, DocumentInsight } from "@prisma/client";
import { formatShortDate, formatCurrency } from "@/lib/format";
import { DOCUMENT_ANALYSIS_CATEGORY_LABELS, vinMatchLabel, type DocumentAnalysisCategory, type ExtractedFields } from "@/lib/documentAnalysis";

type Row = { file: PrismaFile; insight: DocumentInsight };

function displayValue(key: string, value: unknown): string {
  if (value === null || value === undefined || value === "") return "Not identified";
  if (key.toLowerCase().endsWith("date") && typeof value === "string") return formatShortDate(value);
  if (key === "premium" && typeof value === "number") return formatCurrency(value);
  return String(value);
}

function titleCase(key: string): string {
  return key.replace(/([A-Z])/g, " $1").replace(/^./, (c) => c.toUpperCase());
}

function CardField({ label, value }: { label: string; value: string }) {
  return (
    <div className="min-w-0">
      <p className="field-label">{label}</p>
      <p className={`mt-0.5 break-words text-sm ${value === "Not identified" ? "italic text-muted" : "text-foreground"}`}>{value}</p>
    </div>
  );
}

export function DocumentInsightCard({ file, insight, knownVins }: Row & { knownVins: string[] }) {
  const [expanded, setExpanded] = useState(false);
  const fields = insight.extractedFields as ExtractedFields;
  const category = insight.documentType as DocumentAnalysisCategory;
  const subject = (fields.driverName as string) || (fields.unitLabel as string) || (fields.carrierName as string) || null;

  return (
    <div className="surface-card p-4">
      <div className="mb-3 flex items-start justify-between gap-3">
        <div>
          <p className="text-sm font-semibold text-foreground">
            {subject ? `${subject} — ${DOCUMENT_ANALYSIS_CATEGORY_LABELS[category]}` : DOCUMENT_ANALYSIS_CATEGORY_LABELS[category]}
          </p>
          <p className="text-xs text-muted">{file.filename}</p>
        </div>
        {file.isDemo && <span className="badge badge-neutral shrink-0">Demo</span>}
      </div>

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        {category === "mvr" && (
          <>
            <CardField label="Report Date" value={displayValue("reportDate", fields.reportDate)} />
            <CardField label="History" value={fields.historyYears != null ? `${fields.historyYears} years` : "Not identified"} />
            <CardField
              label="Violations"
              value={fields.violationCount != null ? `${fields.violationCount} identified` : "Not identified"}
            />
          </>
        )}
        {category === "driver_license" && (
          <>
            <CardField label="State" value={displayValue("state", fields.state)} />
            <CardField label="Expiration" value={displayValue("expirationDate", fields.expirationDate)} />
          </>
        )}
        {category === "vehicle_registration" && (
          <>
            <CardField label="VIN" value={displayValue("vin", fields.vin)} />
            <CardField label="Registered Owner" value={displayValue("registeredOwner", fields.registeredOwner)} />
            <CardField label="Expiration" value={displayValue("expirationDate", fields.expirationDate)} />
            <CardField label="VIN Match" value={vinMatchLabel((fields.vin as string) ?? null, knownVins)} />
          </>
        )}
        {category === "insurance_policy" && (
          <>
            <CardField label="Carrier" value={displayValue("carrierName", fields.carrierName)} />
            <CardField label="Policy Number" value={displayValue("policyNumber", fields.policyNumber)} />
            <CardField label="Effective Date" value={displayValue("effectiveDate", fields.effectiveDate)} />
            <CardField label="Expiration" value={displayValue("expirationDate", fields.expirationDate)} />
            {fields.premium != null && <CardField label="Premium" value={displayValue("premium", fields.premium)} />}
          </>
        )}
      </div>

      <button type="button" className="mt-3 text-xs font-medium text-accent hover:underline" onClick={() => setExpanded((e) => !e)}>
        {expanded ? "Hide Details" : "View Details"}
      </button>

      {expanded && (
        <div className="mt-3 space-y-2 border-t border-border pt-3 text-sm">
          <p className="text-muted">{insight.summary}</p>
          <dl className="grid grid-cols-2 gap-2 sm:grid-cols-3">
            {Object.entries(fields).map(([key, value]) => (
              <div key={key} className="min-w-0">
                <dt className="field-label">{titleCase(key)}</dt>
                <dd className="break-words text-foreground">{displayValue(key, value)}</dd>
              </div>
            ))}
          </dl>
        </div>
      )}
    </div>
  );
}
