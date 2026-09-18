"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { useTransition } from "react";
import { CLIENT_STATUSES } from "@/lib/constants";

export function ClientsFilterBar({ defaultQuery, defaultStatus }: { defaultQuery: string; defaultStatus: string }) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [, startTransition] = useTransition();

  function updateParam(key: string, value: string) {
    const params = new URLSearchParams(searchParams.toString());
    if (value) params.set(key, value);
    else params.delete(key);
    startTransition(() => {
      router.push(`/clients?${params.toString()}`);
    });
  }

  return (
    <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
      <input
        type="search"
        placeholder="Search clients..."
        defaultValue={defaultQuery}
        onChange={(e) => updateParam("q", e.target.value)}
        className="input sm:max-w-xs"
      />
      <select
        defaultValue={defaultStatus}
        onChange={(e) => updateParam("status", e.target.value)}
        className="input sm:max-w-[200px]"
      >
        <option value="">All statuses</option>
        {CLIENT_STATUSES.map((s) => (
          <option key={s} value={s}>
            {s}
          </option>
        ))}
      </select>
    </div>
  );
}
