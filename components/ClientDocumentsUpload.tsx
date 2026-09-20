"use client";

import { useRef, useState, useTransition } from "react";
import { uploadClientDocuments } from "@/app/actions/clientDocuments";

export function ClientDocumentsUpload({ clientId }: { clientId: string }) {
  const [open, setOpen] = useState(false);
  const [dragOver, setDragOver] = useState(false);
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  function submitFiles(fileList: FileList | null) {
    if (!fileList || fileList.length === 0) return;
    setError(null);
    const fd = new FormData();
    fd.set("clientId", clientId);
    Array.from(fileList).forEach((f) => fd.append("files", f));
    startTransition(async () => {
      try {
        await uploadClientDocuments(fd);
        setOpen(false);
      } catch {
        setError("Upload failed. Please try again.");
      }
    });
  }

  return (
    <div>
      <button type="button" className="btn btn-primary" onClick={() => setOpen((o) => !o)}>
        + Add Required Documents
      </button>

      {open && (
        <div
          onDragOver={(e) => {
            e.preventDefault();
            setDragOver(true);
          }}
          onDragLeave={() => setDragOver(false)}
          onDrop={(e) => {
            e.preventDefault();
            setDragOver(false);
            submitFiles(e.dataTransfer.files);
          }}
          className={`mt-3 rounded-xl border-2 border-dashed p-8 text-center transition-colors ${
            dragOver ? "border-accent bg-[var(--status-good-bg)]" : "border-border bg-[var(--background)]"
          }`}
        >
          {pending ? (
            <p className="text-sm font-medium text-foreground">Uploading &amp; analyzing…</p>
          ) : (
            <>
              <p className="text-sm font-medium text-foreground">Drag &amp; drop files here</p>
              <p className="mt-1 text-sm text-muted">
                or{" "}
                <button type="button" className="text-accent hover:underline" onClick={() => inputRef.current?.click()}>
                  Browse Files
                </button>
              </p>
              <p className="mt-2 text-xs text-muted">PDF, images, or any document type.</p>
            </>
          )}
          <input
            ref={inputRef}
            type="file"
            multiple
            className="hidden"
            onChange={(e) => submitFiles(e.target.files)}
          />
          {error && <p className="mt-2 text-xs text-[var(--status-bad)]">{error}</p>}
        </div>
      )}
    </div>
  );
}
