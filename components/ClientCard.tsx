import Link from "next/link";
import { StatusBadge, clientStatusTone } from "./StatusBadge";
import { formatShortDate } from "@/lib/format";

export function ClientCard({
  client,
}: {
  client: {
    id: string;
    companyName: string;
    primaryContactName: string | null;
    renewalDate: Date | null;
    status: string;
    missingCount: number;
    nextFollowUpDate: Date | null;
  };
}) {
  return (
    <Link href={`/clients/${client.id}`} className="surface-card block p-5 transition-shadow hover:shadow-sm">
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <p className="truncate text-lg font-semibold text-foreground">{client.companyName}</p>
          <p className="mt-0.5 text-sm text-muted">{client.primaryContactName ?? client.status}</p>
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
          <p className={`mt-0.5 font-semibold ${client.missingCount > 0 ? "text-[var(--status-warn)]" : "text-[var(--status-good)]"}`}>
            {client.missingCount > 0 ? `${client.missingCount} missing` : "All received"}
          </p>
        </div>
        <div className="text-right">
          <p className="text-muted">Next follow-up</p>
          <p className="mt-0.5 font-semibold text-foreground">{formatShortDate(client.nextFollowUpDate)}</p>
        </div>
      </div>

      <div className="mt-4">
        <StatusBadge label={client.status} tone={clientStatusTone(client.status)} />
      </div>
    </Link>
  );
}
