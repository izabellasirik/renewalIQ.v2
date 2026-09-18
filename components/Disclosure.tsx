"use client";

import { ReactNode, useState } from "react";

export function Disclosure({
  summary,
  children,
  defaultOpen = false,
}: {
  summary: ReactNode;
  children: ReactNode;
  defaultOpen?: boolean;
}) {
  const [open, setOpen] = useState(defaultOpen);

  return (
    <div className="surface-card">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className="flex w-full items-center justify-between gap-4 p-4 text-left"
      >
        {summary}
        <span className="shrink-0 text-muted">{open ? "−" : "+"}</span>
      </button>
      {open && <div className="space-y-5 border-t border-border p-4">{children}</div>}
    </div>
  );
}
