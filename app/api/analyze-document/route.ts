import { NextRequest, NextResponse } from "next/server";
import { classifyByFilename, analyzeDocument } from "@/lib/documentAnalysis";

/**
 * The one piece of the local-storage prototype that has to stay server-side:
 * it's the only place ANTHROPIC_API_KEY is available. The uploaded file is
 * read into memory for exactly as long as this request takes and is never
 * written to disk, a database, or any storage — the response is the only
 * thing that survives the request. Callers persist that structured result
 * locally; they never see or keep the raw bytes.
 */
export async function POST(req: NextRequest) {
  const formData = await req.formData();
  const file = formData.get("file");
  if (!(file instanceof File) || file.size === 0) {
    return NextResponse.json({ ok: false, error: "No file provided." }, { status: 400 });
  }

  const category = classifyByFilename(file.name);

  try {
    const buffer = Buffer.from(await file.arrayBuffer());
    const result = await analyzeDocument({
      category,
      base64: buffer.toString("base64"),
      mimeType: file.type || "application/octet-stream",
      // No local Vehicle records exist in this prototype (no reachable CRUD
      // UI for them) - VIN-match context is simply unavailable here.
      reviewContext: { knownVins: [] },
    });
    return NextResponse.json({ ok: true, result });
  } catch (err) {
    console.error("[analyze-document] Failed to analyze uploaded file:", err);
    return NextResponse.json({ ok: false, error: "Document analysis failed. See server logs for details." }, { status: 500 });
  }
}
