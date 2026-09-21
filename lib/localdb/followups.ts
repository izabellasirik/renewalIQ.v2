import type { LocalFollowUp, LocalDocumentRequirement, LocalMarketSubmission } from "./types";

// Local equivalent of lib/followups.ts's FollowUpWithContext — driver/vehicle
// context is omitted since this prototype has no reachable Driver/Vehicle UI
// (see lib/localdb/types.ts's own note on scope).
export type LocalFollowUpWithContext = LocalFollowUp & {
  documentRequirement?: LocalDocumentRequirement | null;
  marketSubmission?: LocalMarketSubmission | null;
};

export function followUpContextLabel(fu: LocalFollowUpWithContext): string | null {
  if (fu.documentRequirement && fu.documentRequirement.status !== "Received") {
    return `Missing: ${fu.documentRequirement.name}`;
  }
  if (fu.marketSubmission) return `Quote: ${fu.marketSubmission.carrierName}`;
  return null;
}
