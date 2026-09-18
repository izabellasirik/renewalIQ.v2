"use client";

import { useState, useTransition } from "react";
import { Modal } from "./Modal";
import { addMvr } from "@/app/actions/drivers";
import { toDateInputValue } from "@/lib/format";

export function AddMvrButton({ driverId, clientId }: { driverId: string; clientId: string }) {
  const [open, setOpen] = useState(false);
  const [pending, startTransition] = useTransition();

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    startTransition(async () => {
      await addMvr(fd);
      setOpen(false);
    });
  }

  return (
    <>
      <button type="button" className="btn btn-secondary text-xs" onClick={() => setOpen(true)}>
        Add MVR
      </button>
      <Modal open={open} onClose={() => setOpen(false)} title="Add MVR">
        <form onSubmit={handleSubmit} className="space-y-4" encType="multipart/form-data">
          <input type="hidden" name="driverId" value={driverId} />
          <input type="hidden" name="clientId" value={clientId} />
          <div>
            <label className="field-label">MVR Report Date</label>
            <input
              type="date"
              name="reportDate"
              required
              defaultValue={toDateInputValue(new Date())}
              className="input mt-1"
            />
          </div>
          <div>
            <label className="field-label">History Period Covered (years)</label>
            <input type="number" step="0.5" min={0} name="historyYears" className="input mt-1" placeholder="3" />
          </div>
          <div>
            <label className="field-label">Notes</label>
            <textarea name="notes" rows={2} className="input mt-1" />
          </div>
          <div>
            <label className="field-label">File (optional)</label>
            <input type="file" name="file" className="input mt-1" />
          </div>
          <div className="flex justify-end gap-2 pt-2">
            <button type="button" className="btn btn-secondary" onClick={() => setOpen(false)}>
              Cancel
            </button>
            <button type="submit" disabled={pending} className="btn btn-primary">
              {pending ? "Adding..." : "Add MVR"}
            </button>
          </div>
        </form>
      </Modal>
    </>
  );
}
