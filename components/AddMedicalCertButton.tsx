"use client";

import { useState, useTransition } from "react";
import { Modal } from "./Modal";
import { addMedicalCert } from "@/app/actions/drivers";

export function AddMedicalCertButton({ driverId, clientId }: { driverId: string; clientId: string }) {
  const [open, setOpen] = useState(false);
  const [pending, startTransition] = useTransition();

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    startTransition(async () => {
      await addMedicalCert(fd);
      setOpen(false);
    });
  }

  return (
    <>
      <button type="button" className="btn btn-secondary text-xs" onClick={() => setOpen(true)}>
        Add Medical Certificate
      </button>
      <Modal open={open} onClose={() => setOpen(false)} title="Add Medical Certificate">
        <form onSubmit={handleSubmit} className="space-y-4">
          <input type="hidden" name="driverId" value={driverId} />
          <input type="hidden" name="clientId" value={clientId} />
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="field-label">Issue Date</label>
              <input type="date" name="issueDate" className="input mt-1" />
            </div>
            <div>
              <label className="field-label">Expiration Date</label>
              <input type="date" name="expirationDate" className="input mt-1" />
            </div>
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
              {pending ? "Adding..." : "Add"}
            </button>
          </div>
        </form>
      </Modal>
    </>
  );
}
