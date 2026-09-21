import { STORE_NAMES, type StoreName } from "./types";

/**
 * Low-level IndexedDB access for the broker-testing prototype's local
 * persistence. Chosen over localStorage because the Account Workspace's data
 * (clients + contacts + checklist items + document metadata/insights +
 * activity + notes + follow-ups + quotes, all relational and open-ended in
 * volume — activity/notes/follow-up history only grows) doesn't fit
 * localStorage's ~5–10MB synchronous, string-only model well; IndexedDB is
 * the browser-native fit for structured, growing, object data.
 *
 * SCHEMA_VERSION is a manual version key stored in a dedicated `meta` object
 * store (separate from IndexedDB's own internal version number, which only
 * controls object-store creation). If a future change to the shapes in
 * ./types.ts isn't backward compatible, bump this constant — on next load,
 * anyone on an older version gets their local data safely reset rather than
 * fed mismatched records the UI doesn't know how to render.
 */
export const SCHEMA_VERSION = 1;

const DB_NAME = "renewaliq_prototype";
const IDB_VERSION = 1;
const META_STORE = "meta";
const SCHEMA_VERSION_KEY = "schemaVersion";

function openRawDb(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    if (typeof indexedDB === "undefined") {
      reject(new Error("IndexedDB is not available in this environment."));
      return;
    }
    const request = indexedDB.open(DB_NAME, IDB_VERSION);

    request.onupgradeneeded = () => {
      const db = request.result;
      for (const name of STORE_NAMES) {
        if (!db.objectStoreNames.contains(name)) {
          db.createObjectStore(name, { keyPath: "id" });
        }
      }
      if (!db.objectStoreNames.contains(META_STORE)) {
        db.createObjectStore(META_STORE, { keyPath: "key" });
      }
    };

    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error ?? new Error("Failed to open IndexedDB."));
    request.onblocked = () => reject(new Error("IndexedDB open blocked by another tab."));
  });
}

let dbPromise: Promise<IDBDatabase> | null = null;

/** Cached, lazily-opened connection. A failed open (corrupted profile, private-browsing restrictions, etc.) is never retried automatically within a session — callers treat rejection as "local storage unavailable" and fall back to an empty, in-memory-only state. */
function getDb(): Promise<IDBDatabase> {
  if (!dbPromise) dbPromise = openRawDb();
  return dbPromise;
}

function tx<T>(db: IDBDatabase, stores: string[], mode: IDBTransactionMode, run: (tx: IDBTransaction) => void): Promise<T> {
  return new Promise((resolve, reject) => {
    const transaction = db.transaction(stores, mode);
    let result: unknown;
    transaction.oncomplete = () => resolve(result as T);
    transaction.onerror = () => reject(transaction.error ?? new Error("IndexedDB transaction failed."));
    transaction.onabort = () => reject(transaction.error ?? new Error("IndexedDB transaction aborted."));
    run(transaction);
    void result;
  });
}

export async function getAllRecords<T>(store: StoreName): Promise<T[]> {
  const db = await getDb();
  return new Promise((resolve, reject) => {
    const transaction = db.transaction(store, "readonly");
    const request = transaction.objectStore(store).getAll();
    request.onsuccess = () => resolve(request.result as T[]);
    request.onerror = () => reject(request.error ?? new Error(`Failed to read ${store}.`));
  });
}

export async function putRecord<T>(store: StoreName, record: T): Promise<void> {
  const db = await getDb();
  await tx(db, [store], "readwrite", (transaction) => {
    transaction.objectStore(store).put(record);
  });
}

export async function deleteRecord(store: StoreName, id: string): Promise<void> {
  const db = await getDb();
  await tx(db, [store], "readwrite", (transaction) => {
    transaction.objectStore(store).delete(id);
  });
}

export async function clearStore(store: StoreName): Promise<void> {
  const db = await getDb();
  await tx(db, [store], "readwrite", (transaction) => {
    transaction.objectStore(store).clear();
  });
}

export async function clearAllStores(): Promise<void> {
  const db = await getDb();
  await tx(db, [...STORE_NAMES, META_STORE], "readwrite", (transaction) => {
    for (const name of STORE_NAMES) transaction.objectStore(name).clear();
    transaction.objectStore(META_STORE).clear();
  });
}

async function readSchemaVersion(): Promise<number | null> {
  const db = await getDb();
  return new Promise((resolve, reject) => {
    const transaction = db.transaction(META_STORE, "readonly");
    const request = transaction.objectStore(META_STORE).get(SCHEMA_VERSION_KEY);
    request.onsuccess = () => resolve((request.result as { key: string; value: number } | undefined)?.value ?? null);
    request.onerror = () => reject(request.error ?? new Error("Failed to read schema version."));
  });
}

async function writeSchemaVersion(version: number): Promise<void> {
  const db = await getDb();
  await tx(db, [META_STORE], "readwrite", (transaction) => {
    transaction.objectStore(META_STORE).put({ key: SCHEMA_VERSION_KEY, value: version });
  });
}

/**
 * Call once before reading any data. Resets local storage if the stored
 * schema version is missing/older/newer than SCHEMA_VERSION (handles both a
 * genuinely old browser profile and a corrupted/partial write) — a safe
 * reset for prototype data, never a silent data-shape mismatch reaching the
 * UI. Returns whether a reset happened, purely for the caller's own
 * diagnostics/logging.
 */
export async function ensureSchemaVersion(): Promise<{ reset: boolean }> {
  let stored: number | null;
  try {
    stored = await readSchemaVersion();
  } catch {
    stored = null;
  }

  if (stored === SCHEMA_VERSION) return { reset: false };

  try {
    await clearAllStores();
  } catch {
    // Best-effort — if even clearing fails, the DB is unusable; the caller's
    // own try/catch around hydration will fall back to an empty in-memory state.
  }
  await writeSchemaVersion(SCHEMA_VERSION);
  return { reset: true };
}
