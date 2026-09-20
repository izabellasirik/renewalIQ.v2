import type { PrismaClient, Prisma } from "@prisma/client";
import { addDays, subDays } from "date-fns";
import { mkdir, writeFile } from "fs/promises";
import path from "path";
import { evaluateExtraction } from "../lib/documentAnalysis/reviewChecks";
import type { DocumentAnalysisCategory, ExtractedFields } from "../lib/documentAnalysis/types";

// Seeds a handful of clearly-labeled DEMO documents + Document Insights for
// one client, so the Documents tab's AI-analysis experiment is visible with
// zero configuration. Safe to call more than once: it's a no-op once that
// client already has any isDemo file. Shared by prisma/seed.ts (fresh
// installs) and prisma/seed-document-insights-demo.ts (backfilling an
// already-seeded database, local or production).

const UPLOAD_ROOT = path.join(process.cwd(), "public", "uploads");

async function placeholderFile(clientId: string, filename: string, contents: string): Promise<string> {
  const dir = path.join(UPLOAD_ROOT, clientId);
  await mkdir(dir, { recursive: true });
  await writeFile(path.join(dir, filename), contents, "utf8");
  return `/uploads/${clientId}/${filename}`;
}

interface DemoDoc {
  filename: string;
  category: DocumentAnalysisCategory;
  fields: ExtractedFields;
  placeholderText: string;
}

export async function seedDemoDocumentInsights(
  prisma: PrismaClient,
  clientId: string,
  knownVins: string[]
): Promise<{ created: number }> {
  const existing = await prisma.file.findFirst({ where: { clientId, isDemo: true } });
  if (existing) return { created: 0 };

  const today = new Date();
  const d = (n: number) => addDays(today, n);
  const ago = (n: number) => subDays(today, n);
  const iso = (date: Date) => date.toISOString().slice(0, 10);

  const docs: DemoDoc[] = [
    {
      filename: "John_Smith_MVR.pdf",
      category: "mvr",
      fields: { driverName: "John Smith", reportDate: iso(ago(120)), historyYears: 3, violationCount: 2 },
      placeholderText:
        "DEMO DOCUMENT — for demonstration purposes only, not an actual MVR.\n\nMotor Vehicle Record\nDriver: John Smith\nHistory: 3 years\nViolations: 2",
    },
    {
      filename: "John_Smith_License.pdf",
      category: "driver_license",
      fields: { driverName: "John Smith", state: "MN", licenseNumber: "S123-4567-8901", expirationDate: iso(d(400)) },
      placeholderText:
        "DEMO DOCUMENT — for demonstration purposes only, not an actual driver's license.\n\nDriver's License\nName: John Smith\nState: MN",
    },
    {
      filename: "Unit_102_Registration.pdf",
      category: "vehicle_registration",
      fields: { vin: "4V4NC9EH5MN654321", registeredOwner: "ABC Trucking LLC", unitLabel: "Unit 102", expirationDate: iso(d(180)) },
      placeholderText:
        "DEMO DOCUMENT — for demonstration purposes only, not an actual registration.\n\nVehicle Registration\nUnit 102\nVIN: 4V4NC9EH5MN654321\nRegistered Owner: ABC Trucking LLC",
    },
    {
      filename: "Current_Policy.pdf",
      category: "insurance_policy",
      fields: {
        carrierName: "Sentry Insurance",
        policyNumber: "SIC-4482910",
        effectiveDate: iso(ago(335)),
        expirationDate: iso(d(45)),
        premium: 48500,
      },
      placeholderText:
        "DEMO DOCUMENT — for demonstration purposes only, not an actual policy.\n\nCurrent Insurance Policy\nCarrier: Sentry Insurance\nPolicy: SIC-4482910",
    },
  ];

  let created = 0;
  for (const doc of docs) {
    const filePath = await placeholderFile(clientId, doc.filename, doc.placeholderText);
    const evaluated = evaluateExtraction(doc.category, doc.fields, { knownVins });

    const file = await prisma.file.create({
      data: {
        clientId,
        filename: doc.filename,
        path: filePath,
        provider: "local",
        purpose: "client_document",
        category: doc.category,
        analysisStatus: "Ready",
        isDemo: true,
      },
    });

    await prisma.documentInsight.create({
      data: {
        fileId: file.id,
        documentType: doc.category,
        extractedFields: doc.fields as Prisma.InputJsonValue,
        issues: evaluated.issues as unknown as Prisma.InputJsonValue,
        confidence: evaluated.confidence,
        needsReview: evaluated.needsReview,
        summary: evaluated.issues.length > 0 ? evaluated.issues.map((i) => i.message).join(" ") : "No issues identified.",
        source: "demo",
      },
    });
    created++;
  }

  return { created };
}
