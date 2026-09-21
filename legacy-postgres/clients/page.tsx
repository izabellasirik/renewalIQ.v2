import Link from "next/link";
import { prisma } from "@/lib/db";
import { ClientsFilterBar } from "@/components/ClientsFilterBar";
import { ClientCard } from "@/components/ClientCard";

export const dynamic = "force-dynamic";

export default async function ClientsPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; status?: string }>;
}) {
  const sp = await searchParams;
  const q = sp.q?.trim() ?? "";
  const status = sp.status ?? "";

  const clients = await prisma.client.findMany({
    where: {
      AND: [
        q
          ? {
              OR: [
                { companyName: { contains: q, mode: "insensitive" } },
                { primaryContactName: { contains: q, mode: "insensitive" } },
              ],
            }
          : {},
        status ? { status } : {},
      ],
    },
    include: {
      followUps: { where: { completed: false }, orderBy: { dueDate: "asc" }, take: 1 },
    },
    orderBy: { companyName: "asc" },
  });

  const rows = clients.map((c) => ({
    id: c.id,
    companyName: c.companyName,
    primaryContactName: c.primaryContactName,
    renewalDate: c.renewalDate,
    status: c.status,
    documentsComplete: c.documentsComplete,
    nextFollowUpDate: c.followUps[0]?.dueDate ?? null,
  }));

  return (
    <div className="mx-auto max-w-6xl px-6 py-10">
      <header className="mb-6 flex items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-semibold tracking-tight text-foreground">Clients</h1>
          <p className="mt-1 text-muted">{clients.length} accounts</p>
        </div>
        <Link href="/clients/new" className="btn btn-primary">
          <span aria-hidden>+</span> Add Client
        </Link>
      </header>

      <div className="mb-6">
        <ClientsFilterBar defaultQuery={q} defaultStatus={status} />
      </div>

      {rows.length === 0 ? (
        <div className="surface-card p-10 text-center text-muted">
          No clients match your search.
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {rows.map((c) => (
            <ClientCard key={c.id} client={c} />
          ))}
        </div>
      )}
    </div>
  );
}
