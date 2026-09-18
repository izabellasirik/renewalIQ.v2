import { prisma } from "@/lib/db";
import { AddMarketButton } from "@/components/AddMarketButton";
import { MarketCard } from "@/components/MarketCard";
import { MARKET_STATUSES } from "@/lib/constants";

export async function MarketsTab({ clientId }: { clientId: string }) {
  const markets = await prisma.marketSubmission.findMany({
    where: { clientId },
    include: {
      files: true,
      followUps: { where: { completed: false }, orderBy: { dueDate: "asc" }, take: 1 },
    },
    orderBy: { createdAt: "asc" },
  });

  const counts = new Map<string, number>();
  for (const m of markets) counts.set(m.status, (counts.get(m.status) ?? 0) + 1);

  return (
    <div>
      <div className="mb-1 flex items-start justify-between gap-4">
        <div>
          <h2 className="text-base font-semibold text-foreground">Markets</h2>
          <p className="text-sm text-muted">Track carrier outreach and quote progress for this account.</p>
        </div>
        <AddMarketButton clientId={clientId} />
      </div>

      {markets.length > 0 && (
        <p className="mb-4 mt-3 text-sm text-muted">
          <span className="font-medium text-foreground">
            {markets.length} {markets.length === 1 ? "Market" : "Markets"}
          </span>
          {MARKET_STATUSES.filter((s) => counts.get(s)).map((s) => (
            <span key={s}> · {counts.get(s)} {s}</span>
          ))}
        </p>
      )}

      {markets.length === 0 ? (
        <div className="surface-card mt-4 p-8 text-center text-muted">
          No markets approached yet. Add a carrier to start tracking quote progress.
        </div>
      ) : (
        <div className="space-y-3">
          {markets.map((m) => (
            <MarketCard key={m.id} market={m} clientId={clientId} nextFollowUpDate={m.followUps[0]?.dueDate ?? null} />
          ))}
        </div>
      )}
    </div>
  );
}
