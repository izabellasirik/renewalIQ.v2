"use client";

import { useMemo } from "react";
import Link from "next/link";
import { endOfDay, startOfDay } from "date-fns";
import { TodayTaskCard } from "@/components/TodayTaskCard";
import { followUpContextLabel, type LocalFollowUpWithContext } from "@/lib/localdb/followups";
import { formatFriendlyDueDate, formatLongDate } from "@/lib/format";
import { useAllFollowUps, useClients, useHydrated } from "@/lib/localdb/hooks";

export default function TodayPage() {
  const hydrated = useHydrated();
  const followUps = useAllFollowUps();
  const clients = useClients();

  const { todayTasks, completedToday, upcomingGroups, now } = useMemo(() => {
    const now = new Date();
    const endToday = endOfDay(now);
    const startToday = startOfDay(now);
    const clientById = new Map(clients.map((c) => [c.id, c]));

    function withContext(f: (typeof followUps)[number]): LocalFollowUpWithContext & { client: (typeof clients)[number] } {
      return { ...f, client: clientById.get(f.clientId)! };
    }

    const todayTasks = followUps
      .filter((f) => !f.completed && f.dueDate.getTime() <= endToday.getTime() && clientById.has(f.clientId))
      .sort((a, b) => a.dueDate.getTime() - b.dueDate.getTime())
      .map(withContext);

    const completedToday = followUps
      .filter(
        (f) =>
          f.completed &&
          f.completedAt &&
          f.completedAt.getTime() >= startToday.getTime() &&
          f.completedAt.getTime() <= endToday.getTime() &&
          clientById.has(f.clientId)
      )
      .sort((a, b) => (b.completedAt?.getTime() ?? 0) - (a.completedAt?.getTime() ?? 0))
      .map(withContext);

    const upcoming = followUps
      .filter((f) => !f.completed && f.dueDate.getTime() > endToday.getTime() && clientById.has(f.clientId))
      .sort((a, b) => a.dueDate.getTime() - b.dueDate.getTime())
      .slice(0, 10)
      .map(withContext);

    const upcomingGroups: { label: string; items: typeof upcoming }[] = [];
    for (const item of upcoming) {
      const label = formatFriendlyDueDate(item.dueDate);
      const group = upcomingGroups.find((g) => g.label === label);
      if (group) group.items.push(item);
      else upcomingGroups.push({ label, items: [item] });
    }

    return { todayTasks, completedToday, upcomingGroups, now };
  }, [followUps, clients]);

  return (
    <div className="mx-auto max-w-3xl px-6 py-10">
      <header className="mb-8">
        <p className="text-sm text-muted">{formatLongDate(now)}</p>
        <h1 className="mt-1 text-3xl font-semibold tracking-tight text-foreground">Today&apos;s Plate</h1>
        <p className="mt-1 text-muted">Here&apos;s what needs your attention today.</p>
      </header>

      {!hydrated ? (
        <div className="surface-card p-8 text-center text-muted">Loading local data…</div>
      ) : (
        <>
          <section className="mb-10">
            <h2 className="mb-4 text-xs font-semibold uppercase tracking-wide text-muted">
              Today — {todayTasks.length} {todayTasks.length === 1 ? "Task" : "Tasks"}
            </h2>
            {todayTasks.length === 0 ? (
              <div className="surface-card p-8 text-center text-muted">Nothing due today. Enjoy the clear plate.</div>
            ) : (
              <div className="space-y-3">
                {todayTasks.map((fu) => (
                  <TodayTaskCard key={fu.id} followUp={fu} companyName={fu.client.companyName} />
                ))}
              </div>
            )}
          </section>

          {completedToday.length > 0 && (
            <section className="mb-10">
              <h2 className="mb-4 text-xs font-semibold uppercase tracking-wide text-muted">Completed Today</h2>
              <div className="space-y-2">
                {completedToday.map((fu) => (
                  <div key={fu.id} className="surface-card flex items-center justify-between p-4 text-sm">
                    <div>
                      <span className="font-medium text-foreground">{fu.client.companyName}</span>
                      <span className="ml-2 text-muted">{fu.forLabel}</span>
                    </div>
                    <span className="badge badge-good">Completed</span>
                  </div>
                ))}
              </div>
            </section>
          )}

          <section>
            <h2 className="mb-4 text-xs font-semibold uppercase tracking-wide text-muted">Upcoming</h2>
            {upcomingGroups.length === 0 ? (
              <p className="text-sm text-muted">No upcoming follow-ups scheduled.</p>
            ) : (
              <div className="surface-card divide-y divide-border">
                {upcomingGroups.map((group) => (
                  <div key={group.label} className="p-4">
                    <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted">{group.label}</p>
                    <div className="space-y-2">
                      {group.items.map((item) => {
                        const context = followUpContextLabel(item);
                        return (
                          <Link
                            key={item.id}
                            href={`/clients/${item.clientId}`}
                            className="flex items-baseline gap-2 text-sm hover:underline"
                          >
                            <span className="font-medium text-foreground">{item.client.companyName}</span>
                            <span className="text-muted">— {context ? `${item.forLabel}` : item.action}</span>
                          </Link>
                        );
                      })}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </section>
        </>
      )}
    </div>
  );
}
