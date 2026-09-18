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
    <div className="surface-card flex flex-col justify-between gap-4 p-5 sm:flex-row sm:items-center">
      <div className="min-w-0">
        <p className="text-base font-semibold uppercase tracking-wide text-foreground">{client.companyName}</p>
        <p className="mt-0.5 text-sm text-muted">{client.primaryContactName ?? "No contact on file"}</p>
        <div className="mt-3 flex flex-wrap gap-x-6 gap-y-1 text-sm">
          <span className="text-muted">
            Renewal: <span className="font-medium text-foreground">{formatShortDate(client.renewalDate)}</span>
          </span>
          <span className="text-muted">
            {client.missingCount} Missing {client.missingCount === 1 ? "Document" : "Documents"}
          </span>
          <span className="text-muted">
            Next Follow-Up: <span className="font-medium text-foreground">{formatShortDate(client.nextFollowUpDate)}</span>
          </span>
        </div>
      </div>
      <div className="flex shrink-0 items-center gap-3">
        <StatusBadge label={client.status} tone={clientStatusTone(client.status)} />
        <Link href={`/clients/${client.id}`} className="btn btn-secondary">
          Open Client
        </Link>
      </div>
    </div>
  );
}
