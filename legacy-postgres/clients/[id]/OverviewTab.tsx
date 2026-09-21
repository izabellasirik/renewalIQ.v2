import Link from "next/link";
import { prisma } from "@/lib/db";
import { ClientDetailsCard } from "@/components/ClientDetailsCard";
import { AddDocumentButton } from "@/components/AddDocumentButton";
import { DocumentRow } from "@/components/DocumentRow";
import { DocumentsCompleteToggle } from "@/components/DocumentsCompleteToggle";
import { EditFollowUpButton } from "@/components/EditFollowUpButton";
import { ScheduleFollowUpButton } from "@/components/ScheduleFollowUpButton";
import { formatShortDate, formatDateTime } from "@/lib/format";

export async function OverviewTab({ clientId }: { clientId: string }) {
  const [client, missingDocs, nextFollowUp, recentActivity, contacts] = await Promise.all([
    prisma.client.findUniqueOrThrow({ where: { id: clientId } }),
    prisma.documentRequirement.findMany({
      where: { clientId, status: { not: "Received" } },
      include: { files: true },
      orderBy: { createdAt: "asc" },
    }),
    prisma.followUp.findFirst({
      where: { clientId, completed: false },
      orderBy: { dueDate: "asc" },
    }),
    prisma.activity.findMany({
      where: { clientId },
      orderBy: { occurredAt: "desc" },
      take: 5,
    }),
    prisma.contact.findMany({ where: { clientId } }),
  ]);

  return (
    <div className="space-y-6">
      <ClientDetailsCard client={client} />

      <section className="surface-card p-6">
        <div className="mb-3 flex items-center justify-between">
          <h2 className="text-sm font-semibold text-foreground">Missing Information</h2>
          <AddDocumentButton clientId={clientId} />
        </div>
        {missingDocs.length === 0 ? (
          <p className="text-sm text-muted">Nothing missing — all requirements are in hand.</p>
        ) : (
          <>
            <p className="mb-3 text-sm text-muted">
              {missingDocs.length} {missingDocs.length === 1 ? "item" : "items"} missing
            </p>
            <div className="space-y-3">
              {missingDocs.map((d) => (
                <DocumentRow
                  key={d.id}
                  doc={d}
                  clientId={clientId}
                  companyName={client.companyName}
                  contactName={client.primaryContactName}
                  contacts={contacts}
                />
              ))}
            </div>
          </>
        )}
        <div className="mt-4 flex items-center justify-between border-t border-border pt-3">
          <DocumentsCompleteToggle clientId={clientId} complete={client.documentsComplete} />
          <Link href={`/clients/${clientId}?tab=documents`} className="text-sm text-accent hover:underline">
            View Uploaded Documents →
          </Link>
        </div>
      </section>

      <section className="surface-card p-6">
        <h2 className="mb-3 text-sm font-semibold text-foreground">Next Follow-Up</h2>
        {nextFollowUp ? (
          <div className="flex items-start justify-between gap-4">
            <div>
              <p className="text-lg font-semibold text-foreground">{formatShortDate(nextFollowUp.dueDate)}</p>
              <p className="mt-1 text-sm text-muted">{nextFollowUp.action}</p>
              {nextFollowUp.note && <p className="mt-1 text-sm italic text-muted">&quot;{nextFollowUp.note}&quot;</p>}
            </div>
            <EditFollowUpButton clientId={clientId} followUp={nextFollowUp} />
          </div>
        ) : (
          <div className="flex items-center justify-between">
            <p className="text-sm text-muted">No follow-up scheduled.</p>
            <ScheduleFollowUpButton clientId={clientId} contacts={contacts} />
          </div>
        )}
      </section>

      <section className="surface-card p-6">
        <h2 className="mb-3 text-sm font-semibold text-foreground">Recent Activity</h2>
        {recentActivity.length === 0 ? (
          <p className="text-sm text-muted">No activity yet.</p>
        ) : (
          <ul className="space-y-3">
            {recentActivity.map((a) => (
              <li key={a.id} className="text-sm">
                <p className="text-muted">{formatDateTime(a.occurredAt)}</p>
                <p className="font-medium text-foreground">{a.description}</p>
                {a.note && <p className="text-muted">{a.note}</p>}
              </li>
            ))}
          </ul>
        )}
        <Link href={`/clients/${clientId}?tab=activity`} className="mt-3 inline-block text-sm text-accent hover:underline">
          View Full Activity Log →
        </Link>
      </section>
    </div>
  );
}
