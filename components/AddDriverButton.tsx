"use client";

import { useState, useTransition } from "react";
import { Modal } from "./Modal";
import { addDriver } from "@/app/actions/drivers";
import { US_STATES } from "@/lib/constants";

export function AddDriverButton({ clientId }: { clientId: string }) {
  const [open, setOpen] = useState(false);
  const [pending, startTransition] = useTransition();

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    startTransition(async () => {
      await addDriver(fd);
      setOpen(false);
    });
  }

  return (
    <>
      <button type="button" className="btn btn-primary" onClick={() => setOpen(true)}>
        Add Driver
      </button>
      <Modal open={open} onClose={() => setOpen(false)} title="Add Driver">
        <form onSubmit={handleSubmit} className="space-y-4">
          <input type="hidden" name="clientId" value={clientId} />
          <div>
            <label className="field-label">Driver Name</label>
            <input name="name" required autoFocus className="input mt-1" />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="field-label">License Number</label>
              <input name="licenseNumber" className="input mt-1" />
            </div>
            <div>
              <label className="field-label">State</label>
              <select name="licenseState" defaultValue="" className="input mt-1">
                <option value="">—</option>
                {US_STATES.map((s) => (
                  <option key={s} value={s}>
                    {s}
                  </option>
                ))}
              </select>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="field-label">License Issue Date</label>
              <input type="date" name="licenseIssueDate" className="input mt-1" />
            </div>
            <div>
              <label className="field-label">License Expiration Date</label>
              <input type="date" name="licenseExpirationDate" className="input mt-1" />
            </div>
          </div>
          <div>
            <label className="field-label">Required Licensing History (years)</label>
            <input type="number" name="requiredHistoryYears" min={0} defaultValue={3} className="input mt-1" />
          </div>
          <div className="flex justify-end gap-2 pt-2">
            <button type="button" className="btn btn-secondary" onClick={() => setOpen(false)}>
              Cancel
            </button>
            <button type="submit" disabled={pending} className="btn btn-primary">
              {pending ? "Adding..." : "Add Driver"}
            </button>
          </div>
        </form>
      </Modal>
    </>
  );
}
