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
  translate: (input: string, extraInfo?: string | number) => string;
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

type Language = Record<string, string>;

export type Value = string | boolean | number | object | Language;

// Helper Functions
function createDBPromise() {
  if (typeof window === "undefined") {
    return Promise.resolve(null);
  }
  return openDB<DBType>("tensamin", 1, {
    upgrade(db) {
      if (!db.objectStoreNames.contains("kv")) {
        db.createObjectStore("kv", { keyPath: "key" });
      }
    },
  });
}

// Main
const StorageContext = createContext<StorageContextType | null>(null);

export function useStorageContext() {
  const context = useContext(StorageContext);
  if (!context) throw new Error("hook outside of provider");
  return context;
}

export function StorageProvider({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const [data, setData] = useState<Data>({});
  const [ready, setReady] = useState(false);
  const [db, setDb] = useState<IDBPDatabase<DBType> | null>(null);
  const [language, setLanguage] = useState<Language | null>(null);

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
    } finally {
      setReady(true);
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

  useEffect(() => {
    if (typeof data.language === "undefined") {
      setLanguage({
        CANCEL: "Cancel",
        SAVE: "Save",
        EDIT: "Edit",
        DELETE: "Delete",

        // Sidebar
        COMMUNITIES: "Communities",
        CONVERSATIONS: "Conversations",

        // Homepage
        HOME_PAGE_ADD_CONVERSATION_LABEL: "Add Conversation",
        HOME_PAGE_ADD_CONVERSATION_DESCRIPTION:
          "Create a new conversation with a user by entering their username.",
        HOME_PAGE_ADD_CONVERSATION_INPUT_PLACEHOLDER: "Enter username...",
        HOME_PAGE_ADD_COMMUNITY_LABEL: "Add Community",

        // Settings
        SETTINGS_PAGE_LABEL_ACCOUNT: "Account",
        SETTINGS_PAGE_LABEL_APPEARANCE: "Appearance",
        SETTINGS_PAGE_LABEL_GENERAL: "General",
        SETTINGS_PAGE_LABEL_ADVANCED: "Advanced",
        SETTINGS_PAGE_LABEL_INFORMATION: "Information",

        SETTINGS_PAGE_LABEL_IOTA: "Iota",
        SETTINGS_PAGE_LABEL_PROFILE: "Profile",
        SETTINGS_PAGE_LABEL_PRIVACY: "Privacy",
        SETTINGS_PAGE_LABEL_DEVICES: "Devices",

        SETTINGS_PAGE_LOGOUT_BUTTON_ACTION: "Logout",
        SETTINGS_PAGE_LOGOUT_BUTTON_LABEL: "Are you sure you want to logout?",
        SETTINGS_PAGE_LOGOUT_BUTTON_DESCRIPTION:
          "This will log you out of your account and delete all your settings.",

        SETTINGS_PAGE_LABEL_TINT: "Tint",
        SETTINGS_PAGE_LABEL_CSS: "Custom CSS",
        SETTINGS_PAGE_LABEL_LAYOUT: "Layout",

        SETTINGS_PAGE_LABEL_AUDIO: "Audio",
        SETTINGS_PAGE_LABEL_VIDEO: "Video",
        SETTINGS_PAGE_LABEL_SOUNDBOARD: "Soundboard",
        SETTINGS_PAGE_LABEL_NOTIFICATIONS: "Notifications",
        SETTINGS_PAGE_LABEL_ACCESSABILITY: "Accessibility",
        SETTINGS_PAGE_LABEL_LANGUAGE: "Language",
        SETTINGS_PAGE_LABEL_PREMIUM: "Premium",

        SETTINGS_PAGE_LABEL_DEVELOPER: "Developer",
        SETTINGS_PAGE_ENABLE_DEBUG_MODE: "Enable Debug Mode",
        DEVELOPER_PAGE_NEW_ENTREY_DIALOG_LABEL: "New Entry",
        DEVELOPER_PAGE_NEW_ENTREY_DIALOG_DESCRIPTION:
          "Add a new entry to the database.",
        DEVELOPER_PAGE_NEW_ENTREY_DIALOG_KEY_LABEL: "Key",
        DEVELOPER_PAGE_NEW_ENTREY_DIALOG_KEY_EXAMPLE: "someKey",
        DEVELOPER_PAGE_NEW_ENTREY_DIALOG_VALUE_LABEL:
          "Value (Strings need to be in quotes)",
        DEVELOPER_PAGE_NEW_ENTREY_DIALOG_VALUE_EXAMPLE:
          'e.g. {"enabled": true} or 42 or "hello"',
        DEVELOPER_PAGE_DELETE_ENTRY_LABEL: "Delete Entry",
        DEVELOPER_PAGE_DELETE_ENTRY_DESCRIPTION:
          "Are you sure you want to delete this entry?",
        DEVELOPER_PAGE_SEARCH_PLACEHOLDER: "Search by key...",
        DEVELOPER_PAGE_TABLE_KEY: "Key",
        DEVELOPER_PAGE_TABLE_VALUE: "Value",
        DEVELOPER_PAGE_TABLE_ACTION: "Action",

        VERSION: "Version: ",
        CLIENT_PING: "Client Ping: ",
        IOTA_PING: "Iota Ping: ",
      });
    } else {
      setLanguage(data.language as Language);
    }
  }, [data.language]);

  function translate(input: string, extraInfo?: string | number) {
    if (!language || typeof language[input] === "undefined") {
      return input;
    } else {
      return extraInfo ? language[input] + extraInfo : language[input];
    }
  }

  return ready && language !== null ? (
    <StorageContext.Provider
      value={{
        set,
        clearAll,
        data,
        translate,
      }}
    >
      {children}
    </StorageContext.Provider>
  ) : null;
}
