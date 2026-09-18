import Link from "next/link";
import { endOfDay, startOfDay } from "date-fns";
import { prisma } from "@/lib/db";
import { TodayTaskCard } from "@/components/TodayTaskCard";
import { followUpContextLabel } from "@/lib/followups";
import { formatFriendlyDueDate, formatLongDate } from "@/lib/format";

export const dynamic = "force-dynamic";

export default async function TodayPage() {
  const now = new Date();
  const endToday = endOfDay(now);
  const startToday = startOfDay(now);

  const [todayTasks, completedToday, upcoming] = await Promise.all([
    prisma.followUp.findMany({
      where: { completed: false, dueDate: { lte: endToday } },
      orderBy: { dueDate: "asc" },
      include: { client: true, documentRequirement: true, driver: true, vehicle: true, marketSubmission: true },
    }),
    prisma.followUp.findMany({
      where: { completed: true, completedAt: { gte: startToday, lte: endToday } },
      orderBy: { completedAt: "desc" },
      include: { client: true },
    }),
    prisma.followUp.findMany({
      where: { completed: false, dueDate: { gt: endToday } },
      orderBy: { dueDate: "asc" },
      take: 10,
      include: { client: true, documentRequirement: true, driver: true, vehicle: true, marketSubmission: true },
    }),
  ]);

  const upcomingGroups: { label: string; items: typeof upcoming }[] = [];
  for (const item of upcoming) {
    const label = formatFriendlyDueDate(item.dueDate);
    const group = upcomingGroups.find((g) => g.label === label);
    if (group) group.items.push(item);
    else upcomingGroups.push({ label, items: [item] });
  }

  return (
    <div className="mx-auto max-w-3xl px-6 py-10">
      <header className="mb-8">
        <p className="text-sm text-muted">{formatLongDate(now)}</p>
        <h1 className="mt-1 text-3xl font-semibold tracking-tight text-foreground">Today&apos;s Plate</h1>
        <p className="mt-1 text-muted">Here&apos;s what needs your attention today.</p>
      </header>

      <section className="mb-10">
        <h2 className="mb-4 text-xs font-semibold uppercase tracking-wide text-muted">
          Today — {todayTasks.length} {todayTasks.length === 1 ? "Task" : "Tasks"}
        </h2>
        {todayTasks.length === 0 ? (
          <div className="surface-card p-8 text-center text-muted">
            Nothing due today. Enjoy the clear plate.
          </div>
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
    </div>
  );
}
