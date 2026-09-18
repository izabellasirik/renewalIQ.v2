import Link from "next/link";
import { prisma } from "@/lib/db";
import { updateClientOverview } from "@/app/actions/clients";
import { SubmitButton } from "@/components/SubmitButton";
import { EditFollowUpButton } from "@/components/EditFollowUpButton";
import { ScheduleFollowUpButton } from "@/components/ScheduleFollowUpButton";
import { CLIENT_STATUSES } from "@/lib/constants";
import { formatShortDate, formatDateTime, toDateInputValue } from "@/lib/format";

export async function OverviewTab({ clientId }: { clientId: string }) {
  const [client, missingDocs, nextFollowUp, recentActivity, contacts] = await Promise.all([
    prisma.client.findUniqueOrThrow({ where: { id: clientId } }),
    prisma.documentRequirement.findMany({
      where: { clientId, status: { not: "Received" } },
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
      <section className="surface-card p-6">
        <h2 className="mb-4 text-sm font-semibold text-foreground">Client Details</h2>
        <form action={updateClientOverview} className="space-y-4">
          <input type="hidden" name="id" value={client.id} />
          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <label className="field-label">Company Name</label>
              <input name="companyName" defaultValue={client.companyName} required className="input mt-1" />
            </div>
            <div>
              <label className="field-label">Owner / Primary Contact</label>
              <input name="primaryContactName" defaultValue={client.primaryContactName ?? ""} className="input mt-1" />
            </div>
            <div>
              <label className="field-label">Phone</label>
              <input name="phone" defaultValue={client.phone ?? ""} className="input mt-1" />
            </div>
            <div>
              <label className="field-label">Email</label>
              <input type="email" name="email" defaultValue={client.email ?? ""} className="input mt-1" />
            </div>
            <div>
              <label className="field-label">Renewal Date</label>
              <input
                type="date"
                name="renewalDate"
                defaultValue={toDateInputValue(client.renewalDate)}
                className="input mt-1"
              />
            </div>
            <div>
              <label className="field-label">Policy Expiration Date</label>
              <input
                type="date"
                name="policyExpirationDate"
                defaultValue={toDateInputValue(client.policyExpirationDate)}
                className="input mt-1"
              />
            </div>
            <div>
              <label className="field-label">Status</label>
              <select name="status" defaultValue={client.status} className="input mt-1">
                {CLIENT_STATUSES.map((s) => (
                  <option key={s} value={s}>
                    {s}
                  </option>
                ))}
              </select>
            </div>
          </div>
          <div className="flex justify-end">
            <SubmitButton>Save Changes</SubmitButton>
          </div>
        </form>
      </section>

      <section className="surface-card p-6">
        <h2 className="mb-3 text-sm font-semibold text-foreground">Missing Information</h2>
        {missingDocs.length === 0 ? (
          <p className="text-sm text-muted">Nothing missing — all requirements are in hand.</p>
        ) : (
          <>
            <p className="mb-2 text-sm text-muted">
              {missingDocs.length} {missingDocs.length === 1 ? "item" : "items"} missing
            </p>
            <ul className="list-inside list-disc space-y-1 text-sm text-foreground">
              {missingDocs.map((d) => (
                <li key={d.id}>{d.name}</li>
              ))}
            </ul>
          </>
        )}
        <Link href={`/clients/${clientId}?tab=documents`} className="mt-3 inline-block text-sm text-accent hover:underline">
          View Documents →
        </Link>
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
