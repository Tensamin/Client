"use client";

// Package Imports
import {
  createContext,
  useContext,
  useState,
  useEffect,
  useCallback,
  useMemo,
} from "react";
import { openDB, IDBPDatabase } from "idb";

// Lib Imports
import { handleError, log } from "@/lib/utils";

// Types
type StorageContextType = {
  set: (key: string, value: Value) => void;
  clearAll: () => void;
  data: Data;
};

type Data = {
  [key: string]: Value;
};

type DBType = IDBPDatabase<{
  kv: {
    key: string;
    value: Value;
  };
}>;

export type Value = string | boolean | number | object;

// Main
const StorageContext = createContext<StorageContextType | null>(null);

export function useStorageContext() {
  const context = useContext(StorageContext);
  if (!context)
    throw new Error("useContext function used outside of its provider");
  return context;
}

function createDBPromise() {
  if (typeof window === "undefined") {
    return Promise.resolve(null as any);
  }
  return openDB<DBType>("tensamin", 1, {
    upgrade(db) {
      if (!db.objectStoreNames.contains("kv")) {
        const store = db.createObjectStore("kv", { keyPath: "key" });
      }
    },
  });
}

export function StorageProvider({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const [data, setData] = useState<Data>({});
  const [ready, setReady] = useState(false);
  const [db, setDb] = useState<IDBPDatabase<DBType> | null>(null);

  const dbPromise = useMemo(() => createDBPromise(), []);

  const loadData = useCallback(async () => {
    if (!db) return;
    try {
      const allEntries = await db.getAll("kv");
      const loadedData: Data = {};
      allEntries.forEach((entry) => {
        loadedData[entry.key] = entry.value;
      });
      setData(loadedData);
    } catch (err: unknown) {
      handleError("STORAGE_CONTEXT", "ERROR_STORAGE_CONTEXT_UNKOWN", err);
    }
  }, [db]);

  const set = useCallback(
    async (key: string, value: Value) => {
      if (!db) {
        log(
          "warn",
          "STORAGE_CONTEXT",
          "STORAGE_CONTEXT_DATABASE_NOT_READY_SKIPPING"
        );
        return;
      }
      try {
        if (value === false) {
          await db.delete("kv", key);
          setData((prevData) => {
            const newData = { ...prevData };
            delete newData[key];
            return newData;
          });
        } else {
          await db.put("kv", { key, value });
          setData((prevData) => ({ ...prevData, [key]: value }));
        }
      } catch (err: unknown) {
        handleError("STORAGE_CONTEXT", "ERROR_UPDATING_DATABASE_UNKNOWN", err);
      }
    },
    [db]
  );

  const clearAll = useCallback(async () => {
    if (!db) {
      log(
        "warn",
        "STORAGE_CONTEXT",
        "STORAGE_CONTEXT_DATABASE_NOT_READY_SKIPPING"
      );
      return;
    }
    try {
      await db.clear("kv");
      setData({});
    } catch (err: unknown) {
      handleError("STORAGE_CONTEXT", "ERROR_CLEARING_DATABASE_UNKNOWN", err);
    }
  }, [db]);

  useEffect(() => {
    if (typeof window === "undefined") return;

    (async () => {
      try {
        const initializedDb = await dbPromise;
        setDb(initializedDb);
        await loadData();
        setReady(true);
      } catch (err: unknown) {
        log(
          "error",
          "STORAGE_CONTEXT",
          "ERROR_STORGE_CONTEXT_INIT_FAILED_UNKNOWN",
          err
        );
        setReady(true);
      }
    })();
  }, [dbPromise, loadData]);

  if (!ready) {
    return null;
  }

  return (
    <StorageContext.Provider
      value={{
        set,
        clearAll,
        data,
      }}
    >
      {children}
    </StorageContext.Provider>
  );
}
