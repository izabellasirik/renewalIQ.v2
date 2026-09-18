"use client";

import { useTransition } from "react";

export function DeleteButton({
  action,
  hiddenFields,
  confirmMessage = "Are you sure you want to delete this?",
  label = "Delete",
}: {
  action: (formData: FormData) => Promise<void>;
  hiddenFields: Record<string, string>;
  confirmMessage?: string;
  label?: string;
}) {
  const [pending, startTransition] = useTransition();

  function handleClick() {
    if (!window.confirm(confirmMessage)) return;
    const fd = new FormData();
    Object.entries(hiddenFields).forEach(([k, v]) => fd.set(k, v));
    startTransition(async () => {
      await action(fd);
    });
  }

  return (
    <button type="button" onClick={handleClick} disabled={pending} className="btn-danger btn text-xs">
      {pending ? "Deleting..." : label}
    </button>
  );
}
