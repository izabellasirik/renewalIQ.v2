"use client";

import { useState, useTransition } from "react";
import { Modal } from "./Modal";
import { addViolation } from "@/app/actions/drivers";
import { VIOLATION_SEVERITIES } from "@/lib/constants";

export function AddViolationButton({ mvrId, clientId }: { mvrId: string; clientId: string }) {
  const [open, setOpen] = useState(false);
  const [pending, startTransition] = useTransition();

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    startTransition(async () => {
      await addViolation(fd);
      setOpen(false);
    });
  }

  return (
    <>
      <button type="button" className="btn btn-secondary text-xs" onClick={() => setOpen(true)}>
        Add Violation
      </button>
      <Modal open={open} onClose={() => setOpen(false)} title="Add Violation">
        <form onSubmit={handleSubmit} className="space-y-4">
          <input type="hidden" name="mvrId" value={mvrId} />
          <input type="hidden" name="clientId" value={clientId} />
          <div>
            <label className="field-label">Violation Type</label>
            <input name="type" required autoFocus className="input mt-1" placeholder="Speeding" />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="field-label">Date</label>
              <input type="date" name="date" className="input mt-1" />
            </div>
            <div>
              <label className="field-label">Severity</label>
              <select name="severity" required defaultValue="Minor" className="input mt-1">
                {VIOLATION_SEVERITIES.map((s) => (
                  <option key={s} value={s}>
                    {s}
                  </option>
                ))}
              </select>
            </div>
          </div>
          <div>
            <label className="field-label">Description</label>
            <textarea name="description" rows={2} className="input mt-1" />
          </div>
          <div className="flex justify-end gap-2 pt-2">
            <button type="button" className="btn btn-secondary" onClick={() => setOpen(false)}>
              Cancel
            </button>
            <button type="submit" disabled={pending} className="btn btn-primary">
              {pending ? "Adding..." : "Add Violation"}
            </button>
          </div>
        </form>
      </Modal>
    </>
  );
}
