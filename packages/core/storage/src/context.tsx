import {
  createContext,
  createSignal,
  Show,
  useContext,
  type ParentProps,
} from "solid-js";
import {
  type Storage as StorageSchema,
  storageDefaults as defaults,
} from "@tensamin/shared/data";
import { getEntry, setEntry, deleteEntry } from "./indexed-db";
import ErrorScreen from "@tensamin/ui/screens/error";
import { createStore } from "solid-js/store";
import { log } from "@tensamin/shared/log";

interface StorageContextValue {
  load<K extends keyof StorageSchema>(key: K): Promise<StorageSchema[K]>;
  save<K extends keyof StorageSchema>(
    key: K,
    value: StorageSchema[K],
  ): Promise<void>;
  clear: () => Promise<void>;
}

const StorageContext = createContext<StorageContextValue>();

const isIndexedDBSupported = typeof indexedDB !== "undefined";

export default function StorageProvider(props: ParentProps) {
  const [storage, setStorage] = createStore<StorageSchema>(defaults);

  const [error, setError] = createSignal<string>("");
  const [errorDescription, setErrorDescription] = createSignal<string>("");

  async function loadIO<K extends keyof StorageSchema>(
    key: K,
  ): Promise<StorageSchema[K]> {
    let stored;
    try {
      stored = await getEntry(key);
    } catch (err) {
      setError("Failed to load data");
      setErrorDescription(
        "An error occurred while loading data from IndexedDB. Please try again.",
      );
      log(0, "Storage", "red", err);
    }
    if (stored !== undefined) {
      setStorage(key, stored);
      return stored;
    }
    return defaults[key];
  }

  async function saveIO<K extends keyof StorageSchema>(
    key: K,
    value: StorageSchema[K],
  ): Promise<void> {
    if (JSON.stringify(value) === JSON.stringify(defaults[key])) {
      await deleteEntry(key);
      setStorage(key, defaults[key]);
    } else {
      await setEntry(key, value);
      setStorage(key, value);
    }
  }

  const value: StorageContextValue = {
    async load<K extends keyof StorageSchema>(
      key: K,
    ): Promise<StorageSchema[K]> {
      if (
        storage[key] === undefined ||
        JSON.stringify(storage[key]) === JSON.stringify(defaults[key])
      ) {
        const value = await loadIO(key);
        setStorage(key, value);
      }

      return storage[key];
    },

    async save<K extends keyof StorageSchema>(
      key: K,
      value: StorageSchema[K],
    ): Promise<void> {
      await saveIO(key, value);
      setStorage(key, value);
    },

    async clear() {
      const keys = Object.keys(defaults) as (keyof StorageSchema)[];
      await Promise.all(keys.map((key) => deleteEntry(key)));
    },
  };

  // @ts-expect-error development utility
  window.save = value.save;

  return (
    <Show
      when={error() !== "" && errorDescription() !== ""}
      fallback={
        <Show
          when={isIndexedDBSupported}
          fallback={
            <ErrorScreen
              error="Unsupported Browser"
              description="Your browser does not support IndexedDB, which is required for this application to function."
            />
          }
        >
          <StorageContext.Provider value={value}>
            {props.children}
          </StorageContext.Provider>
        </Show>
      }
    >
      <ErrorScreen error={error()} description={errorDescription()} />
    </Show>
  );
}

export function useStorage(): StorageContextValue {
  const context = useContext(StorageContext);
  if (!context) {
    throw new Error("useStorage must be used within a StorageProvider");
  }
  return context;
}
