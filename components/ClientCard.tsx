import Link from "next/link";
import { clientStatusTone } from "./StatusBadge";
import { formatShortDate } from "@/lib/format";

const TONE_TEXT_CLASS: Record<"good" | "warn" | "bad" | "neutral", string> = {
  good: "text-[var(--status-good)]",
  warn: "text-[var(--status-warn)]",
  bad: "text-[var(--status-bad)]",
  neutral: "text-[var(--status-neutral)]",
};

export function ClientCard({
  client,
}: {
  client: {
    id: string;
    companyName: string;
    primaryContactName: string | null;
    renewalDate: Date | null;
    status: string;
    documentsComplete: boolean;
    nextFollowUpDate: Date | null;
  };
}) {
  // Broker-confirmed only — never inferred from checklist counts, since a
  // fully-checked-off checklist and "nothing left to collect" aren't the
  // same fact (see Client.documentsComplete / Overview tab's toggle).
  const missingLabel = client.documentsComplete ? "All received" : "—";
  const missingToneClass = client.documentsComplete ? TONE_TEXT_CLASS.good : "text-muted";

  return (
    <Link href={`/clients/${client.id}`} className="surface-card block p-5 transition-shadow hover:shadow-sm">
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <p className="truncate text-lg font-semibold text-foreground">{client.companyName}</p>
          <p className={`mt-0.5 text-sm font-medium ${TONE_TEXT_CLASS[clientStatusTone(client.status)]}`}>{client.status}</p>
        </div>
        <span className="mt-1 shrink-0 text-muted" aria-hidden>
          ›
        </span>
      </div>

      <hr className="my-3 border-border" />

      <div className="text-sm">
        <span className="text-muted">Renewal: </span>
        <span className="font-semibold text-foreground">{formatShortDate(client.renewalDate)}</span>
      </div>

      <hr className="my-3 border-border" />

      <div className="flex items-start justify-between gap-4 text-sm">
        <div>
          <p className="text-muted">Missing documents</p>
          <p className={`mt-0.5 font-semibold ${missingToneClass}`}>{missingLabel}</p>
        </div>
        <div className="text-right">
          <p className="text-muted">Next follow-up</p>
          <p className="mt-0.5 font-semibold text-foreground">{formatShortDate(client.nextFollowUpDate)}</p>
        </div>
      </div>
    </Link>
  );
}
