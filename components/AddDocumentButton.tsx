"use client";

import { useState, useTransition } from "react";
import { Modal } from "./Modal";
import { addDocumentRequirement } from "@/app/actions/documents";

export function AddDocumentButton({ clientId }: { clientId: string }) {
  const [open, setOpen] = useState(false);
  const [pending, startTransition] = useTransition();

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    startTransition(async () => {
      await addDocumentRequirement(fd);
      setOpen(false);
    });
  }

  return (
    <>
      <button type="button" className="btn btn-primary" onClick={() => setOpen(true)}>
        Add Required Document
      </button>
      <Modal open={open} onClose={() => setOpen(false)} title="Add Required Document">
        <form onSubmit={handleSubmit} className="space-y-4">
          <input type="hidden" name="clientId" value={clientId} />
          <div>
            <label className="field-label">Document Name</label>
            <input name="name" required autoFocus className="input mt-1" placeholder="Loss Runs" />
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
