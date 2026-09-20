import Link from "next/link";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/db";
import { StatusBadge, clientStatusTone } from "@/components/StatusBadge";
import { OverviewTab } from "./OverviewTab";
import { DocumentsTab } from "./DocumentsTab";
import { MarketsTab } from "./MarketsTab";
import { ActivityTab } from "./ActivityTab";
import { NotesTab } from "./NotesTab";

export const dynamic = "force-dynamic";

const TABS = [
  { key: "overview", label: "Overview" },
  { key: "documents", label: "Documents" },
  { key: "markets", label: "Quotes" },
  { key: "activity", label: "Activity Log" },
  { key: "notes", label: "Notes" },
] as const;

export default async function ClientProfilePage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ tab?: string; new?: string }>;
}) {
  const { id } = await params;
  const sp = await searchParams;
  const tab = sp.tab ?? "overview";
  const isNew = sp.new === "1";

  const client = await prisma.client.findUnique({ where: { id } });
  if (!client) notFound();

  return (
    <div className="mx-auto max-w-4xl px-6 py-10">
      <div className="mb-6">
        <Link href="/clients" className="text-sm text-muted hover:text-foreground">
          ← All Clients
        </Link>
      </div>

      <header className="mb-6 flex items-start justify-between gap-4">
        <div>
          <h1 className="text-3xl font-semibold tracking-tight text-foreground">{client.companyName}</h1>
          <p className="mt-1 text-muted">{client.primaryContactName ?? "No primary contact"}</p>
        </div>
        <StatusBadge label={client.status} tone={clientStatusTone(client.status)} />
      </header>

      {isNew && tab === "documents" && (
        <div className="surface-card mb-6 border-l-4 border-l-accent p-4 text-sm text-foreground">
          Client created. Add the documents you&apos;ll need to collect for this account.
        </div>
      )}

      <nav className="mb-8 flex gap-6 border-b border-border">
        {TABS.map((t) => (
          <Link
            key={t.key}
            href={`/clients/${id}?tab=${t.key}`}
            className={`tab-link ${tab === t.key ? "tab-link-active" : ""}`}
          >
            {t.label}
          </Link>
        ))}
      </nav>

      {tab === "overview" && <OverviewTab clientId={id} />}
      {tab === "documents" && <DocumentsTab clientId={id} />}
      {tab === "markets" && <MarketsTab clientId={id} />}
      {tab === "activity" && <ActivityTab clientId={id} />}
      {tab === "notes" && <NotesTab clientId={id} />}
    </div>
  );
}
