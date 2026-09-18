"use client";

import { useRef, useTransition } from "react";

export function UploadFileForm({
  action,
  hiddenFields,
  label = "Upload File",
}: {
  action: (formData: FormData) => Promise<void>;
  hiddenFields: Record<string, string>;
  label?: string;
}) {
  const [pending, startTransition] = useTransition();
  const formRef = useRef<HTMLFormElement>(null);

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    startTransition(async () => {
      await action(fd);
      formRef.current?.reset();
    });
  }

  return (
    <form ref={formRef} onSubmit={handleSubmit} className="flex flex-wrap items-center gap-2">
      {Object.entries(hiddenFields).map(([k, v]) => (
        <input key={k} type="hidden" name={k} value={v} />
      ))}
      <input type="file" name="file" required className="max-w-[220px] text-xs text-muted" />
      <button type="submit" disabled={pending} className="btn btn-secondary text-xs">
        {pending ? "Uploading..." : label}
      </button>
    </form>
  );
}
