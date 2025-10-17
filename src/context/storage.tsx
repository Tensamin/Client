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
import { toast } from "sonner";

// Lib Imports
import { handleError } from "@/lib/utils";

// Context Imports
import { User } from "@/lib/types";

// Components
import { RawLoading } from "@/components/loading";

// Types
import { OfflineData } from "@/lib/types";

type Data = {
  [key: string]: Value;
};

type DBType = IDBPDatabase<{
  data: {
    key: string;
    value: Value;
  };
  offline: {
    key: string;
    value: Value;
  };
}>;

type Language = Record<string, string>;

export type Value = string | boolean | number | object | Language | object[];

// Helper Functions
function createDBPromise() {
  if (typeof window === "undefined") {
    return Promise.resolve(null);
  }
  return openDB<DBType>("tensamin", 1, {
    upgrade(db) {
      if (!db.objectStoreNames.contains("data")) {
        db.createObjectStore("data", { keyPath: "key" });
      }
      if (!db.objectStoreNames.contains("offline")) {
        db.createObjectStore("offline", { keyPath: "key" });
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
  const [failed, setFailed] = useState(false);
  const [userData, setUserData] = useState<Data>({});
  const [offlineData, setOfflineData] = useState<OfflineData[]>([]);
  const [bypass, setBypass] = useState(false);
  const [ready, setReady] = useState(false);
  const [db, setDb] = useState<IDBPDatabase<DBType> | null>(null);
  const [themeTint, setRawThemeTint] = useState<string | null>(null);
  const [themeCSS, setRawThemeCSS] = useState<string | null>(null);
  const [themeTintType, setRawThemeTintType] = useState<string | null>(null);
  const [language, setLanguage] = useState<string | null>(null);
  const [languages, setLanguages] = useState<{
    en_int: Language;
    [key: string]: Language;
  }>({
    en_int: {
      GENERIC_NAME: "English International (default)",

      // Sidebar
      COMMUNITIES: "Communities",
      CONVERSATIONS: "Conversations",

      // Homepage
      HOME_PAGE_ADD_CONVERSATION_LABEL: "Add Conversation",
      HOME_PAGE_ADD_CONVERSATION_DESCRIPTION:
        "Create a new conversation with a user by entering their username.",
      HOME_PAGE_ADD_CONVERSATION_INPUT_PLACEHOLDER: "Enter username...",
      HOME_PAGE_ADD_COMMUNITY_LABEL: "Add Community",
      ERROR_HOME_PAGE_ADD_CONVERSATION_FAILED: "Failed to add conversation",

      // Chat Page
      FAILED_MESSAGES_MULTIPLE: " messages failed to load",
      FAILED_MESSAGES_SINGLE: "Failed to load 1 message",
      CHAT_PAGE_INPUT_PLACEHOLDER: "Type a message...",
      ERROR_CONVERSATION_LOADING_FAILED: "No conversation?",
      NO_MESSAGES_WITH_USER: "You have no messages with this user.",

      // Settings
      SETTINGS_PAGE_LABEL_ACCOUNT: "Account",
      SETTINGS_PAGE_LABEL_APPEARANCE: "Appearance",
      SETTINGS_PAGE_LABEL_GENERAL: "General",
      SETTINGS_PAGE_LABEL_ADVANCED: "Advanced",
      SETTINGS_PAGE_LABEL_INFORMATION: "Information",

      SETTINGS_PAGE_LABEL_IOTA: "Iota",
      SETTINGS_PAGE_LABEL_PROFILE: "Profile",
      SETTINGS_PAGE_LABEL_PRIVACY: "Privacy",

      SETTINGS_PAGE_LOGOUT_BUTTON_ACTION: "Logout",
      SETTINGS_PAGE_LOGOUT_BUTTON_LABEL: "Are you sure you want to logout?",
      SETTINGS_PAGE_LOGOUT_BUTTON_DESCRIPTION:
        "This will log you out of your account and delete all your settings.",

      SETTINGS_PAGE_LABEL_THEME: "Theme",
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

      // Language Page
      UNKOWN_LANGUAGE: "Unknown Language",
      LANGUAGE_PAGE_ADD_LANGUAGE_BUTTON: "Add Language",
      LANGUAGE_PAGE_SEARCH_LANGUAGES: "Search languages...",
      LANGUAGE_PAGE_NO_LANGUAGE_FOUND: "No language found.",
      PROFILE_PAGE_ABOUT:
        "Coffee enthusiast, cat lover, and part time superhero.",
      PROFILE_PAGE_UPDATE_SUCCESS: "Profile updated successfully!",
      ERROR_PROFILE_PAGE_FAILED_BROADCAST:
        "Failed to broadcast profile changes (users have to reload their client to see the changes)",

      // Profile Page
      PROFILE_PAGE: "Profile Page",
      DATA_PROFILE_PAGE_UPDATE: "Profile data updated",
      ERROR_PROFILE_PAGE_UPDATE_FAILED: "Failed to update profile",

      // Custom CSS Page
      SETTINGS_CSS_SAVED: "CSS saved successfully",
      SETTINGS_CSS_CLEARED: "CSS cleared successfully",
      SETTINGS_CSS_CUSTOM_CSS: "Custom CSS",

      // Socket Context
      SOCKET_CONTEXT: "Socket Context",
      SOCKET_CONTEXT_CONNECTED: "Connected to Omikron",
      SOCKET_CONTEXT_DISCONNECTED: "Disconnected from Omikron",
      SOCKET_CONTEXT_SEND: "Sent to socket:",
      SOCKET_CONTEXT_RECEIVE: "Received from socket:",
      SOCKET_CONTEXT_IDENTIFICATION_SUCCESS: "Identification success",
      ERROR_SOCKET_CONTEXT_CANNOT_CONNECT: "Could not connect to the Omikron",
      ERROR_SOCKET_CONTEXT_CANNOT_CONNECT_EXTRA:
        "Check your internet connection and try again.\n If the issue persists check the Tensamin status page.",

      ERROR_INVALID_USER_ID: "The provided User ID is invalid",
      ERROR_INVALID_PRIVATE_KEY: "The provided Private Key is invalid",
      ERROR_INVALID_PRIVATE_KEY_EXTRA:
        "Reload the page and try again. If the issue persists clear your storage and log in again.",

      ERROR_NO_IOTA: "No Iota for this user found",
      ERROR_NO_IOTA_EXTRA:
        "Check your Iota's internet connection and try again.\n If the issue persists try restarting your Iota.",

      ERROR_SOCKET_CONTEXT_TIMEOUT: "Socket timeout",

      // User Context
      USER_CONTEXT: "User Context",
      USER_CONTEXT_USER_NOT_FETCHED: "User not fetched",
      USER_CONTEXT_USER_ALREADY_FETCHED: "User already fetched",

      // Bypass Messages
      BYPASS_CRYPTO_CONTEXT_ENCRYPT: "Encryption bypassed",
      BYPASS_CRYPTO_CONTEXT_DECRYPT: "Decryption bypassed",
      BYPASS_CRYPTO_CONTEXT_GET_SHARED_SECRET: "Get shared secret bypassed",

      // Other Stuff
      CANCEL: "Cancel",
      SAVE: "Save",
      EDIT: "Edit",
      DELETE: "Delete",
      DISCARD: "Discard",

      VERSION: "Version: ",
      CLIENT_PING: "Client Ping: ",
      IOTA_PING: "Iota Ping: ",

      STATUS_IOTA_OFFLINE: "Iota Offline",
      STATUS_USER_OFFLINE: "User Offline",
      STATUS_ONLINE: "Online",
      STATUS_DND: "Do Not Disturb",
      STATUS_IDLE: "Idle",
      STATUS_NONE: "None",

      ERROR: "Unknown Error",
      ERROR_EXTRA: "An unknown error occurred. Please try again.",
      RESCUE_BYPASS_BUTTON_LABEL: "Bypass Screen",
      RESCUE_CLEAR_STORAGE_BUTTON_LABEL: "Clear Storage",
      RESCUE_CLEAR_STORAGE_BUTTON_DESCRIPTION:
        "This will clear all your settings and log you out of your account.",
    },
  });

  const dbPromise = useMemo(() => createDBPromise(), []);

  const loadData = useCallback(async () => {
    if (!db) return;
    try {
      const userData = await db.getAll("data");
      const loadedUserData: Data = {};
      const offlineData = await db.getAll("offline");
      const loadedOfflineData: { storedUsers: OfflineData[] } = {
        storedUsers: [],
      };
      userData.forEach((entry) => {
        loadedUserData[entry.key] = entry.value;
      });
      setUserData(loadedUserData);
      offlineData.forEach((entry) => {
        if (entry.key !== "storedUsers") return;

        entry.value.forEach((userEntry: { user: User; storeTime: number }) => {
          if (userEntry.storeTime + 1000 * 60 * 60 * 24 * 7 < Date.now()) {
            if (!db) return;

            const updated = (offlineData || []).filter(
              (entry) => entry.user.uuid !== userEntry.user.uuid
            );

            db.put("offline", { key: "storedUsers", value: updated });
            return;
          }

          loadedOfflineData.storedUsers.push({
            user: userEntry.user,
            storeTime: userEntry.storeTime,
          });
        });
      });
      setOfflineData(loadedOfflineData.storedUsers);

      // Extra User Data Stuff
      setLanguages({
        en_int: languages.en_int,
        ...(loadedUserData.languages as Language),
      } as {
        en_int: Language;
        [key: string]: Language;
      });
      setLanguage((loadedUserData.language as string) || "en_int");
      setRawThemeTint((loadedUserData.themeTint as string) || null);
      setRawThemeCSS((loadedUserData.themeCSS as string) || null);
      setRawThemeTintType((loadedUserData.themeTintType as string) || null);
    } catch (err: unknown) {
      handleError("STORAGE_CONTEXT", "ERROR_STORAGE_CONTEXT_UNKOWN", err);
    } finally {
      setReady(true);
    }
  }, [db, languages.en_int]);

  useEffect(() => {
    if (!themeCSS) return;

    const isRules = /\{/.test(themeCSS);
    if (isRules) {
      let style = document.getElementById(
        "theme-style"
      ) as HTMLStyleElement | null;
      if (!style) {
        style = document.createElement("style");
        style.id = "theme-style";
        document.head.appendChild(style);
      }
      style.textContent = themeCSS;
      return () => {
        style?.remove();
      };
    } else {
      document.body.style.cssText = themeCSS;
      return () => {
        document.body.style.cssText = "";
      };
    }
  }, [themeCSS]);

  useEffect(() => {
    if (themeTint) {
      alert("New Theme Tint: " + themeTint);
    }
  }, [themeTint]);

  useEffect(() => {
    if (themeTintType) {
      alert("New Theme Tint Type: " + themeTintType);
    }
  }, [themeTintType]);

  function setThemeCSS(css: string) {
    setRawThemeCSS(css);
    set("themeCSS", css);
  }

  function setThemeTint(tint: string) {
    setRawThemeTint(tint);
    set("themeTint", tint);
  }

  function setThemeTintType(tintType: string) {
    setRawThemeTintType(tintType);
    set("themeTintType", tintType);
  }

  const set = useCallback(
    async (key: string, value: Value) => {
      if (!db) return;
      try {
        if (
          value === false ||
          value === null ||
          typeof value === "undefined" ||
          value === ""
        ) {
          await db.delete("data", key);
          setUserData((prevData) => {
            const newData = { ...prevData };
            delete newData[key];
            return newData;
          });
        } else {
          await db.put("data", { key, value });
          setUserData((prevData) => ({ ...prevData, [key]: value }));
        }
      } catch (err: unknown) {
        handleError("STORAGE_CONTEXT", "ERROR_UPDATING_DATABASE_UNKNOWN", err);
      }
    },
    [db]
  );

  const clearAll = useCallback(async () => {
    if (!db) return;
    try {
      await db.clear("data");
      setUserData({});
      await db.clear("offline");
      setOfflineData([]);
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
      } catch {
        setFailed(true);
      }
    })();
  }, [dbPromise, loadData, setFailed]);

  useEffect(() => {
    set("language", language as string);
  }, [language, set]);

  useEffect(() => {
    const languagesWithoutEnInt: {
      [key: string]: Language;
    } = { ...languages };
    delete languagesWithoutEnInt["en_int"];
    set("languages", languagesWithoutEnInt);
  }, [languages, set]);

  function addOfflineUser(user: User) {
    if (!db) return;
    db.put("offline", {
      key: "storedUsers",
      value: [
        ...(offlineData || []),
        {
          user,
          storeTime: Date.now(),
        },
      ],
    });
  }

  function translate(input: string, extraInfo?: string | number) {
    if (
      !language ||
      !languages ||
      typeof languages[language] === "undefined" ||
      typeof languages[language][input] === "undefined"
    ) {
      return input;
    } else {
      return extraInfo
        ? languages[language][input] + extraInfo
        : languages[language][input];
    }
  }

  function addLanguage(langKey: string, langData: Language) {
    setLanguages((prev) => ({ ...prev, [langKey]: langData }));
    toast.success(translate("STORAGE_CONTEXT_LANGUAGE_ADDED"));
  }

  function removeLanguage(langKey: string) {
    setLanguages((prev) => {
      const updated = { ...prev };
      delete updated[langKey];
      return updated;
    });
    toast.success(translate("STORAGE_CONTEXT_LANGUAGE_DELETED"));
  }

  function debugLog(
    sender: string,
    message: string,
    extraInfo?: unknown
  ): void {
    const tagStyle =
      "background: #3f3f3f; padding: 1px 4px; border-radius: 2px; " +
      "font-size: 10px; font-weight: 700; letter-spacing: 0.5px;";

    const msgStyle =
      "padding: 1px 4px; border-radius: 2px; font-size: 10px; " +
      "font-family: 'Consolas', 'Monaco', monospace; " +
      (message === "SOCKET_CONTEXT_IDENTIFICATION_SUCCESS"
        ? // catppuccin frappé
          "color: #a6d189;" // green
        : message === "SOCKET_CONTEXT_CONNECTED"
        ? "color: #a6d189;" // green
        : message === "SOCKET_CONTEXT_DISCONNECTED"
        ? "color: #e78284;" // red
        : message.startsWith("ERROR")
        ? "color: #e78284;" // red
        : "");

    console.log(
      "%c%s%c %c%s%c",
      tagStyle,
      translate(sender),
      "",
      msgStyle,
      translate(message),
      "",
      extraInfo !== undefined ? extraInfo : ""
    );
  }

  if (typeof window !== "undefined") {
    // @ts-expect-error window does not have bypassLockScreen
    window.bypassLockScreen = () => setBypass(true);
  }

  if (failed) {
    return (
      <RawLoading
        debug={false}
        isError={true}
        addBypassButton={false}
        addClearButton={false}
        message="Unsupported Browser"
        extra="Please try another browser, the current one does not support IndexedDB. Tensamin was developed and tested on Chromium based browsers."
      />
    );
  }

  return ready && language !== null ? (
    <StorageContext.Provider
      value={{
        set,
        clearAll,
        data: userData,
        offlineData,
        translate,
        language,
        languages,
        addLanguage,
        setLanguage,
        removeLanguage,
        debugLog,
        setThemeCSS,
        setThemeTint,
        setThemeTintType,
        bypass,
        setBypass,
        addOfflineUser,
      }}
    >
      {children}
    </StorageContext.Provider>
  ) : (
    <RawLoading
      debug={false}
      isError={false}
      addBypassButton={false}
      addClearButton={false}
      message=""
    />
  );
}

type StorageContextType = {
  set: (key: string, value: Value) => void;
  clearAll: () => void;
  data: Data;
  offlineData: OfflineData[];
  translate: (input: string, extraInfo?: string | number) => string;
  language: string | null;
  languages: {
    en_int: Language;
    [key: string]: Language;
  };
  addLanguage: (langKey: string, langData: Language) => void;
  setLanguage: (langKey: string) => void;
  removeLanguage: (langKey: string) => void;
  debugLog: (sender: string, message: string, extraInfo?: unknown) => void;
  setThemeCSS: (css: string) => void;
  setThemeTint: (tint: string) => void;
  setThemeTintType: (tintType: string) => void;
  bypass: boolean;
  setBypass: (bypass: boolean) => void;
  addOfflineUser: (user: User) => void;
};
