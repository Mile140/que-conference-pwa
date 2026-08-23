// Data-layer offline cache for read content (schedule, speakers, sponsors,
// maps, info -- spec §7). The service worker (vite-plugin-pwa/Workbox, see
// vite.config.ts) already caches raw Supabase REST responses via
// NetworkFirst, which covers "reload while offline" for whatever the last
// request happened to be. This module is a small IndexedDB-backed key/value
// store that the data hooks (useSessions, useSpeakers, etc.) write structured
// rows into on every successful fetch, so the app has something real to read
// on a cold start with zero connection at all -- not just whatever the SW's
// HTTP cache happened to keep.
//
// Deliberately dependency-free (raw indexedDB API, same philosophy as
// imageCompress.ts using raw Canvas) -- this is a small enough surface that
// pulling in idb or similar isn't worth it.
//
// Every function swallows its own errors and never throws: this cache is a
// nice-to-have offline fallback, not a critical path. A private-browsing tab
// with IndexedDB disabled, or any other storage failure, should just mean
// "no offline fallback available" -- never a broken app.

const DB_NAME = "que-offline-cache";
const STORE_NAME = "kv";
const DB_VERSION = 1;

function openDb(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    if (typeof indexedDB === "undefined") {
      reject(new Error("IndexedDB not available"));
      return;
    }
    const req = indexedDB.open(DB_NAME, DB_VERSION);
    req.onupgradeneeded = () => {
      if (!req.result.objectStoreNames.contains(STORE_NAME)) {
        req.result.createObjectStore(STORE_NAME);
      }
    };
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

/** Reads a cached value, or null if there's nothing cached (or storage isn't available). */
export async function getCached<T>(key: string): Promise<T | null> {
  try {
    const db = await openDb();
    return await new Promise<T | null>((resolve, reject) => {
      const tx = db.transaction(STORE_NAME, "readonly");
      const req = tx.objectStore(STORE_NAME).get(key);
      req.onsuccess = () => resolve((req.result as T) ?? null);
      req.onerror = () => reject(req.error);
    });
  } catch (err) {
    console.error(`offlineCache: failed to read "${key}"`, err);
    return null;
  }
}

/** Writes a value to the cache, keyed by name. Fire-and-forget: failures are logged, not thrown. */
export async function setCached<T>(key: string, value: T): Promise<void> {
  try {
    const db = await openDb();
    await new Promise<void>((resolve, reject) => {
      const tx = db.transaction(STORE_NAME, "readwrite");
      tx.objectStore(STORE_NAME).put(value, key);
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error);
    });
  } catch (err) {
    console.error(`offlineCache: failed to write "${key}"`, err);
  }
}
