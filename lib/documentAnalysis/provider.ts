import type { DocumentAnalysisCategory, AnalysisResult, ExtractedFields } from "./types";
import { evaluateExtraction, type ReviewContext } from "./reviewChecks";

// Provider-agnostic AI document analysis. Today this calls Anthropic's
// Claude API directly (a vision-capable model reading the uploaded
// image/PDF) when ANTHROPIC_API_KEY is configured; if it isn't, callers get
// an honest "not analyzed" result back — never a fabricated one. Swapping in
// a different provider later means changing only `callVisionModel` below.

const FIELD_SPECS: Record<DocumentAnalysisCategory, { keys: string[]; instructions: string }> = {
  mvr: {
    keys: ["driverName", "reportDate", "historyYears", "violationCount"],
    instructions:
      'Return JSON: {"driverName": string|null, "reportDate": "YYYY-MM-DD"|null, "historyYears": number|null, "violationCount": number|null}. "historyYears" is the span of driving history the report covers. "violationCount" is the number of violations/incidents listed.',
  },
  driver_license: {
    keys: ["driverName", "state", "licenseNumber", "expirationDate"],
    instructions:
      'Return JSON: {"driverName": string|null, "state": string|null (2-letter code), "licenseNumber": string|null, "expirationDate": "YYYY-MM-DD"|null}.',
  },
  vehicle_registration: {
    keys: ["vin", "registeredOwner", "unitLabel", "expirationDate"],
    instructions:
      'Return JSON: {"vin": string|null, "registeredOwner": string|null, "unitLabel": string|null (e.g. a unit number if shown), "expirationDate": "YYYY-MM-DD"|null}.',
  },
  insurance_policy: {
    keys: ["carrierName", "policyNumber", "effectiveDate", "expirationDate", "premium"],
    instructions:
      'Return JSON: {"carrierName": string|null, "policyNumber": string|null, "effectiveDate": "YYYY-MM-DD"|null, "expirationDate": "YYYY-MM-DD"|null, "premium": number|null}.',
  },
  other: {
    keys: [],
    instructions: 'Return JSON: {}.',
  },
};

const ANTHROPIC_API_URL = "https://api.anthropic.com/v1/messages";
const DEFAULT_MODEL = "claude-sonnet-5";

function emptyFields(category: DocumentAnalysisCategory): ExtractedFields {
  const fields: ExtractedFields = {};
  for (const key of FIELD_SPECS[category].keys) fields[key] = null;
  return fields;
}

function unavailableResult(category: DocumentAnalysisCategory, reason: string): AnalysisResult {
  return {
    documentType: category,
    extractedFields: emptyFields(category),
    issues: [{ category: "review", severity: "warning", message: reason }],
    confidence: "low",
    needsReview: true,
    summary: reason,
    source: "unavailable",
  };
}

async function callVisionModel(
  category: DocumentAnalysisCategory,
  base64: string,
  mimeType: string,
  apiKey: string
): Promise<ExtractedFields> {
  const spec = FIELD_SPECS[category];
  const model = process.env.ANTHROPIC_VISION_MODEL || DEFAULT_MODEL;

  const isPdf = mimeType === "application/pdf";
  const contentBlock = isPdf
    ? { type: "document", source: { type: "base64", media_type: mimeType, data: base64 } }
    : { type: "image", source: { type: "base64", media_type: mimeType, data: base64 } };

  const res = await fetch(ANTHROPIC_API_URL, {
    method: "POST",
    headers: {
      "content-type": "application/json",
      "x-api-key": apiKey,
      "anthropic-version": "2023-06-01",
    },
    body: JSON.stringify({
      model,
      max_tokens: 1024,
      messages: [
        {
          role: "user",
          content: [
            contentBlock,
            {
              type: "text",
              text: `This is a ${category.replace("_", " ")} document. Extract only what is clearly legible. ${spec.instructions} Never guess or invent a value — use null for anything not clearly present. Respond with JSON only, no other text.`,
            },
          ],
        },
      ],
    }),
  });

  if (!res.ok) {
    throw new Error(`Anthropic API error: ${res.status}`);
  }

  const data = await res.json();
  const text = data?.content?.[0]?.text ?? "";
  const jsonMatch = text.match(/\{[\s\S]*\}/);
  if (!jsonMatch) throw new Error("Model did not return parseable JSON.");

  const parsed = JSON.parse(jsonMatch[0]);
  const fields = emptyFields(category);
  for (const key of spec.keys) {
    const value = parsed[key];
    fields[key] = value === undefined || value === "" ? null : value;
  }
  return fields;
}

export async function analyzeDocument(input: {
  category: DocumentAnalysisCategory;
  base64: string;
  mimeType: string;
  reviewContext?: ReviewContext;
}): Promise<AnalysisResult> {
  const apiKey = process.env.ANTHROPIC_API_KEY;

  if (!apiKey) {
    return unavailableResult(
      input.category,
      "Automatic analysis needs an API key — set ANTHROPIC_API_KEY to enable AI extraction, or review this document manually."
    );
  }

  if (input.category === "other") {
    return unavailableResult(input.category, "This file type isn't one of the supported document types yet — review it manually.");
  }

  const supportedMime = input.mimeType.startsWith("image/") || input.mimeType === "application/pdf";
  if (!supportedMime) {
    return unavailableResult(input.category, "Automatic analysis isn't available for this file format — review it manually.");
  }

  try {
    const fields = await callVisionModel(input.category, input.base64, input.mimeType, apiKey);
    const evaluated = evaluateExtraction(input.category, fields, input.reviewContext);
    return {
      documentType: input.category,
      extractedFields: fields,
      issues: evaluated.issues,
      confidence: evaluated.confidence,
      needsReview: evaluated.needsReview,
      summary: evaluated.issues.length > 0 ? evaluated.issues.map((i) => i.message).join(" ") : "No issues identified.",
      source: "ai",
    };
  } catch {
    // Real failure (network/API/parse) — this is the one case that should surface as "Failed", not "unavailable".
    throw new Error("Document analysis failed.");
  }
}
