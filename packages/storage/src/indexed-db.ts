import type { Storage as StorageSchema } from "@tensamin/shared/data";

const DB_NAME = "tensamin";
const DB_VERSION = 1;
const STORE_NAME = "storage";

let dbPromise: Promise<IDBDatabase> | null = null;

/**
 * Executes openDB.
 * @param none This function has no parameters.
 * @returns Promise<IDBDatabase>.
 */
function openDB(): Promise<IDBDatabase> {
  if (dbPromise) return dbPromise;

  dbPromise = new Promise<IDBDatabase>((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);

    request.onupgradeneeded = () => {
      const db = request.result;
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        db.createObjectStore(STORE_NAME);
      }
    };

    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });

  return dbPromise;
}

/**
 * Executes getEntry.
 * @param key Parameter key.
 * @returns Promise<StorageSchema[K] | undefined>.
 */
export async function getEntry<K extends keyof StorageSchema>(
  key: K,
): Promise<StorageSchema[K] | undefined> {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, "readonly");
    const store = tx.objectStore(STORE_NAME);
    const request = store.get(key as string);

    request.onsuccess = () =>
      resolve(request.result as StorageSchema[K] | undefined);
    request.onerror = () => reject(request.error);
  });
}

/**
 * Executes setEntry.
 * @param key Parameter key.
 * @param value Parameter value.
 * @returns Promise<void>.
 */
export async function setEntry<K extends keyof StorageSchema>(
  key: K,
  value: StorageSchema[K],
): Promise<void> {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, "readwrite");
    const store = tx.objectStore(STORE_NAME);
    const request = store.put(value, key as string);

    request.onsuccess = () => resolve();
    request.onerror = () => reject(request.error);
  });
}

/**
 * Executes deleteEntry.
 * @param key Parameter key.
 * @returns Promise<void>.
 */
export async function deleteEntry<K extends keyof StorageSchema>(
  key: K,
): Promise<void> {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, "readwrite");
    const store = tx.objectStore(STORE_NAME);
    const request = store.delete(key as string);

    request.onsuccess = () => resolve();
    request.onerror = () => reject(request.error);
  });
}
