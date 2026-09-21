"use client";

import { useMemo } from "react";
import { useLocalStore, useHydrated } from "./store";

export { useHydrated };

// Each hook selects a stable top-level array straight out of store state
// (applyLocalUpdate only replaces the slice(s) it actually changed, so
// unrelated arrays keep the same reference across updates) and then derives
// with useMemo, rather than filtering inside the useSyncExternalStore
// selector itself — filtering there would return a new array every render
// and defeat snapshot caching.

export function useClients() {
  return useLocalStore((s) => s.clients);
}

export function useClient(id: string) {
  const clients = useClients();
  return useMemo(() => clients.find((c) => c.id === id) ?? null, [clients, id]);
}

export function useContacts(clientId: string) {
  const all = useLocalStore((s) => s.contacts);
  return useMemo(() => all.filter((c) => c.clientId === clientId), [all, clientId]);
}

export function useDocumentRequirements(clientId: string) {
  const all = useLocalStore((s) => s.documentRequirements);
  return useMemo(() => all.filter((d) => d.clientId === clientId), [all, clientId]);
}

export function useFiles(clientId: string) {
  const all = useLocalStore((s) => s.files);
  return useMemo(() => all.filter((f) => f.clientId === clientId), [all, clientId]);
}

export function useDocumentInsights() {
  return useLocalStore((s) => s.documentInsights);
}

export function useActivities(clientId: string) {
  const all = useLocalStore((s) => s.activities);
  return useMemo(() => all.filter((a) => a.clientId === clientId), [all, clientId]);
}

export function useNotes(clientId: string) {
  const all = useLocalStore((s) => s.notes);
  return useMemo(() => all.filter((n) => n.clientId === clientId), [all, clientId]);
}

export function useAllFollowUps() {
  return useLocalStore((s) => s.followUps);
}

export function useFollowUps(clientId: string) {
  const all = useAllFollowUps();
  return useMemo(() => all.filter((f) => f.clientId === clientId), [all, clientId]);
}

export function useMarkets(clientId: string) {
  const all = useLocalStore((s) => s.marketSubmissions);
  return useMemo(() => all.filter((m) => m.clientId === clientId), [all, clientId]);
}
