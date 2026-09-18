"use client";

import { useState, useTransition } from "react";
import { Modal } from "./Modal";
import { updateDocumentRequirement } from "@/app/actions/documents";

export function EditDocumentButton({
  doc,
  clientId,
}: {
  doc: { id: string; name: string; note: string | null };
  clientId: string;
}) {
  const [open, setOpen] = useState(false);
  const [pending, startTransition] = useTransition();

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    startTransition(async () => {
      await updateDocumentRequirement(fd);
      setOpen(false);
    });
  }

  return (
    <>
      <button type="button" className="btn btn-ghost text-xs" onClick={() => setOpen(true)}>
        Edit
      </button>
      <Modal open={open} onClose={() => setOpen(false)} title="Edit Document">
        <form onSubmit={handleSubmit} className="space-y-4">
          <input type="hidden" name="id" value={doc.id} />
          <input type="hidden" name="clientId" value={clientId} />
          <div>
            <label className="field-label">Document Name</label>
            <input name="name" defaultValue={doc.name} required className="input mt-1" />
          </div>
          <div>
            <label className="field-label">Note</label>
            <textarea name="note" defaultValue={doc.note ?? ""} rows={2} className="input mt-1" />
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
