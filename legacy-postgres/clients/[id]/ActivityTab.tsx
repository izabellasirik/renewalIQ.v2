import { prisma } from "@/lib/db";
import { AddActivityButton } from "@/components/AddActivityButton";
import { formatLongDate } from "@/lib/format";
import { format } from "date-fns";

export async function ActivityTab({ clientId }: { clientId: string }) {
  const [activities, contacts] = await Promise.all([
    prisma.activity.findMany({
      where: { clientId },
      include: { contact: true },
      orderBy: { occurredAt: "desc" },
    }),
    prisma.contact.findMany({ where: { clientId } }),
  ]);

  const groups: { key: string; label: string; items: typeof activities }[] = [];
  for (const a of activities) {
    const key = format(a.occurredAt, "yyyy-MM-dd");
    const group = groups.find((g) => g.key === key);
    if (group) group.items.push(a);
    else groups.push({ key, label: formatLongDate(a.occurredAt), items: [a] });
  }

  return (
    <div>
      <div className="mb-4 flex items-center justify-between">
        <h2 className="text-sm font-semibold text-foreground">Activity Log</h2>
        <AddActivityButton clientId={clientId} contacts={contacts} />
      </div>

      {groups.length === 0 ? (
        <p className="text-center text-muted">No activity yet.</p>
      ) : (
        <div className="space-y-6">
          {groups.map((g) => (
            <div key={g.key}>
              <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted">{g.label}</p>
              <div className="space-y-2">
                {g.items.map((a) => (
                  <div key={a.id} className="surface-card p-4">
                    <p className="text-sm font-medium text-foreground">{a.description}</p>
                    <p className="mt-0.5 text-xs text-muted">
                      {a.type}
                      {a.contact ? ` — ${a.contact.name}` : ""} · {format(a.occurredAt, "h:mm a")}
                    </p>
                    {a.note && <p className="mt-1 text-sm text-muted">{a.note}</p>}
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
