import Link from "next/link";
import { isPast, isToday, startOfDay } from "date-fns";
import { StatusBadge } from "./StatusBadge";
import { CompleteFollowUpButton } from "./CompleteFollowUpButton";
import { followUpContextLabel, type LocalFollowUpWithContext } from "@/lib/localdb/followups";

export function TodayTaskCard({
  followUp,
  companyName,
}: {
  followUp: LocalFollowUpWithContext;
  companyName: string;
}) {
  const overdue = !isToday(followUp.dueDate) && isPast(startOfDay(followUp.dueDate));
  const contextLabel = followUpContextLabel(followUp);

  return (
    <div className="surface-card flex items-start justify-between gap-4 p-5">
      <div className="min-w-0">
        <div className="mb-1">
          <StatusBadge label={overdue ? "Overdue" : "Due today"} tone={overdue ? "bad" : "warn"} />
        </div>
        <Link href={`/clients/${followUp.clientId}`} className="text-base font-semibold text-foreground hover:underline">
          {companyName}
        </Link>
        {contextLabel && <p className="mt-1 text-sm font-medium text-foreground">{contextLabel}</p>}
        <p className="mt-1 text-sm text-muted">{followUp.action}</p>
      </div>
      <div className="flex shrink-0 flex-col items-end gap-2">
        <div className="flex gap-2">
          <Link href={`/clients/${followUp.clientId}`} className="btn btn-secondary">
            Open Client
          </Link>
          <CompleteFollowUpButton id={followUp.id} clientId={followUp.clientId} />
        </div>
      </div>
    </div>
  );
}
