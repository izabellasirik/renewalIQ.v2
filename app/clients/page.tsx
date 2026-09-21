"use client";

import { Suspense, useMemo } from "react";
import { useSearchParams } from "next/navigation";
import Link from "next/link";
import { ClientsFilterBar } from "@/components/ClientsFilterBar";
import { ClientCard } from "@/components/ClientCard";
import { useClients, useAllFollowUps, useHydrated } from "@/lib/localdb/hooks";

export default function ClientsPage() {
  return (
    <Suspense fallback={<div className="mx-auto max-w-6xl px-6 py-10 text-muted">Loading…</div>}>
      <ClientsPageContent />
    </Suspense>
  );
}

function ClientsPageContent() {
  const searchParams = useSearchParams();
  const q = (searchParams.get("q") ?? "").trim();
  const status = searchParams.get("status") ?? "";

  const clients = useClients();
  const followUps = useAllFollowUps();
  const hydrated = useHydrated();

  const rows = useMemo(() => {
    const filtered = clients.filter((c) => {
      const matchesQuery =
        !q ||
        c.companyName.toLowerCase().includes(q.toLowerCase()) ||
        (c.primaryContactName ?? "").toLowerCase().includes(q.toLowerCase());
      const matchesStatus = !status || c.status === status;
      return matchesQuery && matchesStatus;
    });

    return filtered
      .map((c) => {
        const next = followUps
          .filter((f) => f.clientId === c.id && !f.completed)
          .sort((a, b) => a.dueDate.getTime() - b.dueDate.getTime())[0];
        return {
          id: c.id,
          companyName: c.companyName,
          primaryContactName: c.primaryContactName,
          renewalDate: c.renewalDate,
          status: c.status,
          documentsComplete: c.documentsComplete,
          nextFollowUpDate: next?.dueDate ?? null,
        };
      })
      .sort((a, b) => a.companyName.localeCompare(b.companyName));
  }, [clients, followUps, q, status]);

  return (
    <div className="mx-auto max-w-6xl px-6 py-10">
      <header className="mb-6 flex items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-semibold tracking-tight text-foreground">Clients</h1>
          <p className="mt-1 text-muted">{hydrated ? `${rows.length} accounts` : "Loading…"}</p>
        </div>
        <Link href="/clients/new" className="btn btn-primary">
          <span aria-hidden>+</span> Add Client
        </Link>
      </header>

      <div className="mb-6">
        <ClientsFilterBar defaultQuery={q} defaultStatus={status} />
      </div>

      {!hydrated ? (
        <div className="surface-card p-10 text-center text-muted">Loading local data…</div>
      ) : rows.length === 0 ? (
        <div className="surface-card p-10 text-center text-muted">No clients match your search.</div>
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
