import type { Driver, DocumentRequirement, FollowUp, MarketSubmission, Vehicle } from "@prisma/client";

export type FollowUpWithContext = FollowUp & {
  documentRequirement?: DocumentRequirement | null;
  driver?: Driver | null;
  vehicle?: Vehicle | null;
  marketSubmission?: MarketSubmission | null;
};

/** The small "Missing: X" / "Driver: X" / "Market: X" context line shown above a follow-up's action text. */
export function followUpContextLabel(fu: FollowUpWithContext): string | null {
  if (fu.documentRequirement && fu.documentRequirement.status !== "Received") {
    return `Missing: ${fu.documentRequirement.name}`;
  }
  if (fu.driver) return `Driver: ${fu.driver.name}`;
  if (fu.vehicle) {
    const label = [fu.vehicle.year, fu.vehicle.make, fu.vehicle.model].filter(Boolean).join(" ");
    return `Vehicle: ${label || fu.vehicle.vin || "Vehicle"}`;
  }
  if (fu.marketSubmission) return `Market: ${fu.marketSubmission.carrierName}`;
  return null;
}
