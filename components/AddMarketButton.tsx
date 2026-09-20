"use client";

import { useState, useTransition } from "react";
import { Modal } from "./Modal";
import { addMarket } from "@/app/actions/markets";
import { MARKET_STATUSES } from "@/lib/constants";

export function AddMarketButton({ clientId }: { clientId: string }) {
  const [open, setOpen] = useState(false);
  const [pending, startTransition] = useTransition();

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    startTransition(async () => {
      await addMarket(fd);
      setOpen(false);
    });
  }

  return (
    <>
      <button type="button" className="btn btn-primary" onClick={() => setOpen(true)}>
        Add Quote
      </button>
      <Modal open={open} onClose={() => setOpen(false)} title="Add Quote">
        <form onSubmit={handleSubmit} className="space-y-4">
          <input type="hidden" name="clientId" value={clientId} />
          <div>
            <label className="field-label">Carrier Name</label>
            <input name="carrierName" required autoFocus className="input mt-1" placeholder="Progressive" />
          </div>
          <div>
            <label className="field-label">Contact / Underwriter Name</label>
            <input name="contactName" className="input mt-1" placeholder="Sarah Miller" />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="field-label">Contact Email</label>
              <input type="email" name="contactEmail" className="input mt-1" />
            </div>
            <div>
              <label className="field-label">Contact Phone</label>
              <input name="contactPhone" className="input mt-1" />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="field-label">Date Submitted/Contacted</label>
              <input type="date" name="submittedDate" className="input mt-1" />
            </div>
            <div>
              <label className="field-label">Status</label>
              <select name="status" defaultValue="Not Contacted" className="input mt-1">
                {MARKET_STATUSES.map((s) => (
                  <option key={s} value={s}>
                    {s}
                  </option>
                ))}
              </select>
            </div>
          </div>
          <div>
            <label className="field-label">Notes</label>
            <textarea name="notes" rows={2} className="input mt-1" />
          </div>
          <div className="flex justify-end gap-2 pt-2">
            <button type="button" className="btn btn-secondary" onClick={() => setOpen(false)}>
              Cancel
            </button>
            <button type="submit" disabled={pending} className="btn btn-primary">
              {pending ? "Adding..." : "Add Quote"}
            </button>
          </div>
        </form>
      </Modal>
    </>
  );
}
