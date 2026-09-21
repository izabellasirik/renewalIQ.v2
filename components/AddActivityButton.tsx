"use client";

import { useState, useTransition } from "react";
import { Modal } from "./Modal";
import { addActivity } from "@/lib/localdb/repository";
import { ACTIVITY_TYPES } from "@/lib/activity";

export function AddActivityButton({
  clientId,
  contacts,
}: {
  clientId: string;
  contacts: { id: string; name: string }[];
}) {
  const [open, setOpen] = useState(false);
  const [pending, startTransition] = useTransition();

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    startTransition(async () => {
      await addActivity(fd);
      setOpen(false);
    });
  }

  return (
    <>
      <button type="button" className="btn btn-primary" onClick={() => setOpen(true)}>
        Add Activity
      </button>
      <Modal open={open} onClose={() => setOpen(false)} title="Add Activity">
        <form onSubmit={handleSubmit} className="space-y-4">
          <input type="hidden" name="clientId" value={clientId} />
          <div>
            <label className="field-label">Activity Type</label>
            <select name="type" required className="input mt-1" defaultValue="Other">
              {ACTIVITY_TYPES.map((t) => (
                <option key={t} value={t}>
                  {t}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="field-label">Description</label>
            <input name="description" required className="input mt-1" placeholder="Requested updated loss runs." />
          </div>
          {contacts.length > 0 && (
            <div>
              <label className="field-label">Contact</label>
              <select name="contactId" defaultValue="" className="input mt-1">
                <option value="">None</option>
                {contacts.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name}
                  </option>
                ))}
              </select>
            </div>
          )}
          <div>
            <label className="field-label">Optional Note</label>
            <textarea name="note" rows={2} className="input mt-1" />
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
