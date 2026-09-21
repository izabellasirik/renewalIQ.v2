"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { clearAllLocalData } from "@/lib/localdb/repository";

export function ClearTestDataButton() {
  const router = useRouter();
  const [pending, startTransition] = useTransition();

  function handleClick() {
    if (!window.confirm("Clear all test data in this browser? This removes every client, document, note, and quote stored locally here. This cannot be undone.")) {
      return;
    }
    startTransition(async () => {
      await clearAllLocalData();
      router.push("/clients");
    });
  }

  return (
    <button type="button" onClick={handleClick} disabled={pending} className="btn btn-secondary text-xs">
      {pending ? "Clearing…" : "Clear Test Data"}
    </button>
  );
}
