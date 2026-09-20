"use client";

import { useState, useTransition } from "react";
import { updateClientOverview } from "@/app/actions/clients";
import { CLIENT_STATUSES } from "@/lib/constants";
import { formatShortDate, toDateInputValue } from "@/lib/format";
import { StatusBadge, clientStatusTone } from "./StatusBadge";

type Client = {
  id: string;
  companyName: string;
  primaryContactName: string | null;
  phone: string | null;
  email: string | null;
  renewalDate: Date | null;
  policyExpirationDate: Date | null;
  status: string;
};

export function ClientDetailsCard({ client }: { client: Client }) {
  const [editing, setEditing] = useState(false);
  const [pending, startTransition] = useTransition();

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    startTransition(async () => {
      await updateClientOverview(fd);
      setEditing(false);
    });
  }

  return (
    <section className="surface-card p-6">
      <div className="mb-4 flex items-center justify-between">
        <h2 className="text-sm font-semibold text-foreground">Client Details</h2>
        {!editing && (
          <button type="button" className="btn btn-secondary text-xs" onClick={() => setEditing(true)}>
            Edit
          </button>
        )}
      </div>

      {editing ? (
        <form onSubmit={handleSubmit} className="space-y-4">
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
          <div className="flex justify-end gap-2">
            <button type="button" className="btn btn-secondary" onClick={() => setEditing(false)}>
              Cancel
            </button>
            <button type="submit" disabled={pending} className="btn btn-primary">
              {pending ? "Saving..." : "Save Changes"}
            </button>
          </div>
        </form>
      ) : (
        <dl className="grid gap-4 text-sm sm:grid-cols-2">
          <div>
            <dt className="field-label">Company Name</dt>
            <dd className="mt-1 text-foreground">{client.companyName}</dd>
          </div>
          <div>
            <dt className="field-label">Owner / Primary Contact</dt>
            <dd className="mt-1 text-foreground">{client.primaryContactName || "—"}</dd>
          </div>
          <div>
            <dt className="field-label">Phone</dt>
            <dd className="mt-1 text-foreground">{client.phone || "—"}</dd>
          </div>
          <div>
            <dt className="field-label">Email</dt>
            <dd className="mt-1 text-foreground">{client.email || "—"}</dd>
          </div>
          <div>
            <dt className="field-label">Renewal Date</dt>
            <dd className="mt-1 text-foreground">{formatShortDate(client.renewalDate)}</dd>
          </div>
          <div>
            <dt className="field-label">Policy Expiration Date</dt>
            <dd className="mt-1 text-foreground">{formatShortDate(client.policyExpirationDate)}</dd>
          </div>
          <div>
            <dt className="field-label">Status</dt>
            <dd className="mt-1">
              <StatusBadge label={client.status} tone={clientStatusTone(client.status)} />
            </dd>
          </div>
        </dl>
      )}
    </section>
  );
}
