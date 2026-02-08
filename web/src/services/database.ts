/**
 * IndexedDB database service
 * Extracted from context/storage.tsx for cleaner separation of concerns
 */

import { openDB, IDBPDatabase } from "idb";
import type { Value } from "@/lib/types";

// Database type definition
interface DataEntry {
  key: string;
  value: Value;
}

interface DatabaseSchema {
  data: {
    key: string;
    value: DataEntry;
  };
}

export type TensaminDB = IDBPDatabase<DatabaseSchema>;

const DB_NAME = "tensamin";
const DB_VERSION = 1;
const STORE_NAME = "data";

/**
 * Creates a promise that resolves to the database connection
 * Returns null on server-side (SSR)
 */
export function createDatabaseConnection(): Promise<TensaminDB | null> {
  if (typeof window === "undefined") {
    return Promise.resolve(null);
  }

  return openDB<DatabaseSchema>(DB_NAME, DB_VERSION, {
    upgrade(db) {
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        db.createObjectStore(STORE_NAME, { keyPath: "key" });
      }
    },
  });
}

/**
 * Get a value from the database
 */
export async function getFromDatabase(
  db: TensaminDB,
  key: string,
): Promise<Value | undefined> {
  const result = await db.get(STORE_NAME, key);
  return result?.value;
}

/**
 * Set a value in the database
 */
export async function setInDatabase(
  db: TensaminDB,
  key: string,
  value: Value,
): Promise<void> {
  if (value === null || typeof value === "undefined" || value === "") {
    await db.delete(STORE_NAME, key);
  } else {
    await db.put(STORE_NAME, { key, value });
  }
}

/**
 * Delete a value from the database
 */
export async function deleteFromDatabase(
  db: TensaminDB,
  key: string,
): Promise<void> {
  await db.delete(STORE_NAME, key);
}

/**
 * Get all data from the database
 */
export async function getAllFromDatabase(
  db: TensaminDB,
): Promise<Record<string, Value>> {
  const allData = await db.getAll(STORE_NAME);
  const result: Record<string, Value> = {};

  for (const entry of allData) {
    if (
      entry &&
      typeof entry === "object" &&
      "key" in entry &&
      "value" in entry
    ) {
      result[entry.key as string] = entry.value as Value;
    }
  }

  return result;
}

/**
 * Clear all data from the database
 */
export async function clearDatabase(db: TensaminDB): Promise<void> {
  await db.clear(STORE_NAME);
}
