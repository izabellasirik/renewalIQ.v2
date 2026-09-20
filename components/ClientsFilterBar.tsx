"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { useRef, useTransition } from "react";
import { CLIENT_STATUSES } from "@/lib/constants";

const FILTERS = ["All", ...CLIENT_STATUSES];

export function ClientsFilterBar({ defaultQuery, defaultStatus }: { defaultQuery: string; defaultStatus: string }) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [, startTransition] = useTransition();
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  function updateParam(key: string, value: string) {
    const params = new URLSearchParams(searchParams.toString());
    if (value) params.set(key, value);
    else params.delete(key);
    startTransition(() => {
      router.push(`/clients?${params.toString()}`);
    });
  }

  function updateSearch(value: string) {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => updateParam("q", value), 250);
  }

  return (
    <div className="flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-center">
      <div className="relative sm:max-w-xs sm:flex-1">
        <svg
          className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth={2}
          strokeLinecap="round"
          strokeLinejoin="round"
          aria-hidden
        >
          <circle cx="11" cy="11" r="7" />
          <line x1="21" y1="21" x2="16.65" y2="16.65" />
        </svg>
        <input
          type="search"
          placeholder="Search by company or contact..."
          defaultValue={defaultQuery}
          onChange={(e) => updateSearch(e.target.value)}
          className="input pl-9"
        />
      </div>
      <div className="flex flex-wrap gap-2">
        {FILTERS.map((f) => {
          const value = f === "All" ? "" : f;
          const active = defaultStatus === value;
          return (
            <button
              key={f}
              type="button"
              onClick={() => updateParam("status", value)}
              className={active ? "btn btn-primary rounded-full text-sm" : "btn btn-secondary rounded-full text-sm"}
            >
              {f}
            </button>
          );
        })}
      </div>
    </div>
  );
}
