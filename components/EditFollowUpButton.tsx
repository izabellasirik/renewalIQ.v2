"use client";

import { useState, useTransition } from "react";
import { Modal } from "./Modal";
import { editFollowUp } from "@/app/actions/followups";
import { toDateInputValue } from "@/lib/format";

export function EditFollowUpButton({
  followUp,
  clientId,
}: {
  followUp: { id: string; forLabel: string; action: string; dueDate: Date; note: string | null };
  clientId: string;
}) {
  const [open, setOpen] = useState(false);
  const [pending, startTransition] = useTransition();

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    startTransition(async () => {
      await editFollowUp(fd);
      setOpen(false);
    });
  }

  return (
    <>
      <button type="button" className="btn btn-secondary" onClick={() => setOpen(true)}>
        Edit Follow-Up
      </button>
      <Modal open={open} onClose={() => setOpen(false)} title="Edit Follow-Up">
        <form onSubmit={handleSubmit} className="space-y-4">
          <input type="hidden" name="id" value={followUp.id} />
          <input type="hidden" name="clientId" value={clientId} />

          <div>
            <label className="field-label">Follow-Up For</label>
            <input name="forLabel" defaultValue={followUp.forLabel} required className="input mt-1" />
          </div>
          <div>
            <label className="field-label">Action</label>
            <input name="action" defaultValue={followUp.action} required className="input mt-1" />
          </div>
          <div>
            <label className="field-label">Date</label>
            <input
              type="date"
              name="dueDate"
              defaultValue={toDateInputValue(followUp.dueDate)}
              required
              className="input mt-1"
            />
          </div>
          <div>
            <label className="field-label">Optional Note</label>
            <textarea name="note" defaultValue={followUp.note ?? ""} rows={2} className="input mt-1" />
          </div>

          <div className="flex justify-end gap-2 pt-2">
            <button type="button" className="btn btn-secondary" onClick={() => setOpen(false)}>
              Cancel
            </button>
            <button type="submit" disabled={pending} className="btn btn-primary">
              {pending ? "Saving..." : "Save"}
            </button>
          </div>
        </form>
      </Modal>
    </>
  );
}
