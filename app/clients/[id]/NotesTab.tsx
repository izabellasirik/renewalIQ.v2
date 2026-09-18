import { prisma } from "@/lib/db";
import { addNote } from "@/app/actions/notes";
import { SubmitButton } from "@/components/SubmitButton";
import { NoteItem } from "@/components/NoteItem";

export async function NotesTab({ clientId }: { clientId: string }) {
  const notes = await prisma.note.findMany({
    where: { clientId },
    orderBy: { createdAt: "desc" },
  });

  return (
    <div className="space-y-6">
      <form action={addNote} className="surface-card space-y-3 p-4">
        <input type="hidden" name="clientId" value={clientId} />
        <label className="field-label">Add Note</label>
        <textarea name="content" required rows={3} className="input" placeholder="Client prefers phone communication." />
        <div className="flex justify-end">
          <SubmitButton pendingLabel="Adding...">Add Note</SubmitButton>
        </div>
      </form>

      {notes.length === 0 ? (
        <p className="text-center text-muted">No notes yet.</p>
      ) : (
        <div className="space-y-3">
          {notes.map((n) => (
            <NoteItem key={n.id} note={n} clientId={clientId} />
          ))}
        </div>
      )}
    </div>
  );
}
