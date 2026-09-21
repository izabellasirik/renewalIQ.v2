"use client";

import { useEffect, useSyncExternalStore } from "react";
import { ensureSchemaVersion, getAllRecords } from "./db";
import { EMPTY_STATE, type LocalStoreState } from "./types";
import { seedIfEmpty } from "./seed";

// Small hand-rolled reactive store (no new dependency) sitting in front of
// IndexedDB: repository mutation functions in ./repository write to
// IndexedDB and then call applyLocalUpdate so every subscribed component
// re-renders — the same role Next.js's revalidatePath played for the
// Postgres-backed pages, just client-side instead of server-side.

type Listener = () => void;

let state: LocalStoreState = EMPTY_STATE;
let hydrated = false;
let hydrationError: string | null = null;
const listeners = new Set<Listener>();

function emit() {
  for (const listener of listeners) listener();
}

function subscribe(listener: Listener): () => void {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

/** Synchronous read of current state — used by repository.ts mutation functions that need to read-then-write a single record (find the existing row, merge fields, persist, update state) without a render dependency. */
export function getCurrentState(): LocalStoreState {
  return state;
}

function getServerSnapshot(): LocalStoreState {
  return EMPTY_STATE;
}

let hydratePromise: Promise<void> | null = null;

/** Idempotent — safe to call from every component that needs local data; only the first call does real work. */
export function hydrate(): Promise<void> {
  if (!hydratePromise) {
    hydratePromise = (async () => {
      try {
        await ensureSchemaVersion();
        const [
          clients,
          contacts,
          documentRequirements,
          files,
          documentInsights,
          activities,
          notes,
          followUps,
          marketSubmissions,
        ] = await Promise.all([
          getAllRecords("clients"),
          getAllRecords("contacts"),
          getAllRecords("documentRequirements"),
          getAllRecords("files"),
          getAllRecords("documentInsights"),
          getAllRecords("activities"),
          getAllRecords("notes"),
          getAllRecords("followUps"),
          getAllRecords("marketSubmissions"),
        ]);
        state = {
          clients,
          contacts,
          documentRequirements,
          files,
          documentInsights,
          activities,
          notes,
          followUps,
          marketSubmissions,
        } as LocalStoreState;
        state = await seedIfEmpty(state);
      } catch (err) {
        // Corrupted profile, private-browsing storage restrictions, etc. —
        // never let a broken local DB crash the app; start from empty state.
        console.warn("[localdb] Falling back to empty in-memory state:", err);
        hydrationError = err instanceof Error ? err.message : "Local storage unavailable.";
        state = EMPTY_STATE;
      } finally {
        hydrated = true;
        emit();
      }
    })();
  }
  return hydratePromise;
}

/** Used by repository mutation functions after they've already persisted the change to IndexedDB. */
export function applyLocalUpdate(updater: (current: LocalStoreState) => LocalStoreState): void {
  state = updater(state);
  emit();
}

export function getHydrationError(): string | null {
  return hydrationError;
}

/** Full reset — used by the "Clear Test Data" control. */
export function resetLocalState(): void {
  state = EMPTY_STATE;
  emit();
}

export function useLocalStore<T>(selector: (s: LocalStoreState) => T): T {
  useEffect(() => {
    void hydrate();
  }, []);
  return useSyncExternalStore(subscribe, () => selector(state), () => selector(getServerSnapshot()));
}

export function useHydrated(): boolean {
  useEffect(() => {
    void hydrate();
  }, []);
  return useSyncExternalStore(subscribe, () => hydrated, () => false);
}
