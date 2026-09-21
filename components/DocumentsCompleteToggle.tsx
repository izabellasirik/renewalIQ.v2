"use client";

import { useTransition } from "react";
import { setDocumentsComplete } from "@/lib/localdb/repository";

export function DocumentsCompleteToggle({ clientId, complete }: { clientId: string; complete: boolean }) {
  const [pending, startTransition] = useTransition();

  function handleChange(checked: boolean) {
    const fd = new FormData();
    fd.set("clientId", clientId);
    fd.set("complete", String(checked));
    startTransition(async () => {
      await setDocumentsComplete(fd);
    });
  }

  return (
    <label className="flex items-center gap-2 text-sm text-foreground">
      <input
        type="checkbox"
        checked={complete}
        disabled={pending}
        onChange={(e) => handleChange(e.target.checked)}
      />
      Mark all documents as received
    </label>
  );
}
