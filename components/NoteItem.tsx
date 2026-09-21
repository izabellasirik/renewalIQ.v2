"use client";

import { useState, useTransition } from "react";
import { updateNote, deleteNote } from "@/lib/localdb/repository";
import { formatDateTime } from "@/lib/format";

export function NoteItem({
  note,
  clientId,
}: {
  note: { id: string; content: string; createdAt: Date; updatedAt: Date };
  clientId: string;
}) {
  const [editing, setEditing] = useState(false);
  const [pending, startTransition] = useTransition();

  function handleSave(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    startTransition(async () => {
      await updateNote(fd);
      setEditing(false);
    });
  }

  function handleDelete() {
    if (!window.confirm("Delete this note?")) return;
    const fd = new FormData();
    fd.set("id", note.id);
    fd.set("clientId", clientId);
    startTransition(async () => {
      await deleteNote(fd);
    });
  }

  if (editing) {
    return (
      <form onSubmit={handleSave} className="surface-card space-y-2 p-4">
        <input type="hidden" name="id" value={note.id} />
        <input type="hidden" name="clientId" value={clientId} />
        <textarea name="content" defaultValue={note.content} rows={3} className="input" autoFocus />
        <div className="flex justify-end gap-2">
          <button type="button" className="btn btn-secondary text-xs" onClick={() => setEditing(false)}>
            Cancel
          </button>
          <button type="submit" disabled={pending} className="btn btn-primary text-xs">
            {pending ? "Saving..." : "Save"}
          </button>
        </div>
      </form>
    );
  }

  return (
    <div className="surface-card p-4">
      <p className="whitespace-pre-wrap text-sm text-foreground">{note.content}</p>
      <div className="mt-2 flex items-center justify-between">
        <p className="text-xs text-muted">{formatDateTime(note.createdAt)}</p>
        <div className="flex gap-2">
          <button type="button" className="btn btn-ghost text-xs" onClick={() => setEditing(true)}>
            Edit
          </button>
          <button type="button" className="btn-danger btn text-xs" onClick={handleDelete} disabled={pending}>
            Delete
          </button>
        </div>
      </div>
    </div>
  );
}
