import type { DocumentAnalysisCategory } from "./types";

/**
 * Filename-based best guess at document type — used to pick which extraction
 * prompt/shape to apply. This is a convenience heuristic, not a claim about
 * the file's actual contents; a wrong guess just means the wrong field set
 * gets attempted, not a wrong "decision" about anything.
 */
export function classifyByFilename(filename: string): DocumentAnalysisCategory {
  const name = filename.toLowerCase();

  if (/\bmvr\b|motor.?vehicle.?record|driving.?record/.test(name)) return "mvr";
  if (/licen[sc]e|\bdl\b/.test(name)) return "driver_license";
  if (/regist(ration)?|\breg\b/.test(name)) return "vehicle_registration";
  if (/polic(y|ies)|declaration|dec.?page|insurance.?id|coi\b/.test(name)) return "insurance_policy";

  return "other";
}
