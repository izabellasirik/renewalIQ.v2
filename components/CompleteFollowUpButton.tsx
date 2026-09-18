"use client";

import { useState, useTransition } from "react";
import { completeFollowUp } from "@/app/actions/followups";

export function CompleteFollowUpButton({
  id,
  clientId,
  onComplete,
  className = "btn btn-secondary",
}: {
  id: string;
  clientId: string;
  onComplete?: () => void;
  className?: string;
}) {
  const [pending, startTransition] = useTransition();
  const [done, setDone] = useState(false);

  function handleClick() {
    setDone(true);
    onComplete?.();
    const fd = new FormData();
    fd.set("id", id);
    fd.set("clientId", clientId);
    startTransition(async () => {
      await completeFollowUp(fd);
    });
  }

  return (
    <button
      type="button"
      onClick={handleClick}
      disabled={pending || done}
      className={className}
    >
      {done ? "Completed" : "Complete"}
    </button>
  );
}
