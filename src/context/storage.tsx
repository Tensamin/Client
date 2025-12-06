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
import { useTheme } from "next-themes";

// Lib Imports
import { handleError } from "@/lib/utils";
import { generateColors } from "@/lib/theme";

// Context Imports
import { Community, Conversation } from "@/lib/types";

// Components
import { RawLoading } from "@/components/loading";

// Types
import { OfflineData, StoredSettings, Value } from "@/lib/types";

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

export function rawDebugLog(
  sender: string,
  message: string,
  extraInfo?: unknown,
  color?: string,
) {
  const tagStyle =
    "background: #3f3f3f; padding: 1px 4px; border-radius: 2px; " +
    "font-size: 10px; font-weight: 700; letter-spacing: 0.5px;";

  const msgStyle =
    "padding: 1px 4px; border-radius: 2px; font-size: 10px; " +
    "font-family: 'Consolas', 'Monaco', monospace; " +
    (color === "green"
      ? "color: #a6d189;"
      : color === "red"
        ? "color: #e78284;"
        : color === "yellow"
          ? "color: #f9e2af;"
          : "");

  console.log(
    "%c%s%c %c%s%c",
    tagStyle,
    sender,
    "",
    msgStyle,
    message,
    "",
    extraInfo !== undefined ? extraInfo : "",
  );
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
  const [userData, setUserData] = useState<StoredSettings>({});
  const [offlineData, setOfflineData] = useState<OfflineData>({
    storedConversations: [],
    storedCommunities: [],
  });
  const [bypass, setBypass] = useState(false);
  const [ready, setReady] = useState(false);
  const [isElectron, setIsElectron] = useState(false);
  const [db, setDb] = useState<IDBPDatabase<DBType> | null>(null);
  const [, setRawThemeTint] = useState<string | null>(null);
  const [themeCSS, setRawThemeCSS] = useState<string | null>(null);
  const [, setRawThemeTintType] = useState<string | null>(null);

  const { resolvedTheme, systemTheme } = useTheme();

  useEffect(() => {
    // @ts-expect-error ElectronAPI only available in Electron
    if (window.electronAPI) {
      setIsElectron(true);
    } else {
      setIsElectron(false);
    }
  }, []);

  const dbPromise = useMemo(() => createDBPromise(), []);

  const loadData = useCallback(async () => {
    if (!db) return;
    try {
      const userData = await db.getAll("data");
      const loadedUserData: StoredSettings = {};
      const offlineData = await db.getAll("offline");
      const loadedOfflineData: OfflineData = {
        storedConversations: [],
        storedCommunities: [],
      };
      userData.forEach((entry) => {
        loadedUserData[entry.key] = entry.value;
      });

      if (loadedUserData.audioThreshold === undefined) {
        loadedUserData.audioThreshold = -40;
        db.put("data", { key: "audioThreshold", value: -40 });
      }
      if (loadedUserData.enableAudioGate === undefined) {
        console.log("Storage: Defaulting enableAudioGate to true");
        loadedUserData.enableAudioGate = true;
        db.put("data", { key: "enableAudioGate", value: true });
      }

      setUserData(loadedUserData);
      offlineData.forEach((entry) => {
        switch (entry.key) {
          case "storedConversations":
            entry.value.forEach((conversation: Conversation) => {
              loadedOfflineData.storedConversations.push(conversation);
            });
            break;
          case "storedCommunities":
            entry.value.forEach((community: Community) => {
              loadedOfflineData.storedCommunities.push(community);
            });
            break;
        }
      });
      setOfflineData(loadedOfflineData);

      setRawThemeTint((loadedUserData.themeTint as string) || null);
      setRawThemeCSS((loadedUserData.themeCSS as string) || null);
      setRawThemeTintType((loadedUserData.themeTintType as string) || null);
    } catch (err: unknown) {
      handleError("STORAGE_CONTEXT", "ERROR_STORAGE_CONTEXT_UNKOWN", err);
    } finally {
      setReady(true);
    }
  }, [db]);

  useEffect(() => {
    if (!themeCSS) return;

    const isRules = /\{/.test(themeCSS);
    if (isRules) {
      let style = document.getElementById(
        "theme-style",
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

  const set = useCallback(
    async (key: string, value: Value) => {
      if (!db) return;
      try {
        if (value === null || typeof value === "undefined" || value === "") {
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
    [db],
  );

  const setThemeCSS = useCallback(
    (css: string) => {
      setRawThemeCSS(css);
      set("themeCSS", css);
    },
    [set],
  );

  const setThemeTint = useCallback(
    (tint: string) => {
      setRawThemeTint(tint);
      set("themeTint", tint);
    },
    [set],
  );

  const setThemeTintType = useCallback(
    (tintType: string) => {
      setRawThemeTintType(tintType);
      set("themeTintType", tintType);
    },
    [set],
  );

  useEffect(() => {
    if (
      !userData.themeHex ||
      userData.themeHex === "" ||
      !userData.tintType ||
      userData.tintType === ""
    )
      return;

    const activeScheme = (resolvedTheme ?? systemTheme ?? "light") as
      | "light"
      | "dark";

    const colors = generateColors(
      userData.themeHex as string,
      userData.tintType as "hard" | "light",
      activeScheme,
    );

    Object.entries(colors).forEach(([name, value]) =>
      document.documentElement.style.setProperty(name, value),
    );
  }, [resolvedTheme, systemTheme, userData.tintType, userData.themeHex]);

  const clearAll = useCallback(async () => {
    if (!db) return;
    try {
      await db.clear("data");
      setUserData({});
      await db.clear("offline");
      setOfflineData({
        storedConversations: [],
        storedCommunities: [],
      });
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

  const setOfflineConversations = useCallback(
    (conversations: Conversation[]) => {
      if (!db) return;
      db.put("offline", {
        key: "storedConversations",
        value: conversations,
      });
    },
    [db],
  );

  const setOfflineCommunities = useCallback(
    (communities: Community[]) => {
      if (!db) return;
      db.put("offline", {
        key: "storedCommunities",
        value: communities,
      });
    },
    [db],
  );

  function debugLog(
    sender: string,
    message: string,
    extraInfo?: unknown,
  ): void {
    rawDebugLog(sender, message, extraInfo);
  }

  if (typeof window !== "undefined") {
    // @ts-expect-error window does not have bypassLockScreen
    window.bypassLockScreen = () => {
      setBypass(true);
      void set("enableLockScreenBypass", true);
      console.log("Set bypass to true!");
    };
  }

  if (failed) {
    return (
      <RawLoading
        debug={false}
        isError
        addBypassButton={false}
        addClearButton={false}
        message="Unsupported Browser"
        extra="Please try another browser, the current one does not support IndexedDB. Tensamin was developed and tested on Chromium based browsers."
      />
    );
  }

  return ready ? (
    <StorageContext.Provider
      value={{
        set,
        clearAll,
        data: userData,
        offlineData,
        debugLog,
        setThemeCSS,
        setThemeTint,
        setThemeTintType,
        bypass,
        isElectron,
        setBypass,
        setOfflineCommunities,
        setOfflineConversations,
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
  data: StoredSettings;
  offlineData: OfflineData;
  debugLog: (sender: string, message: string, extraInfo?: unknown) => void;
  setThemeCSS: (css: string) => void;
  setThemeTint: (tint: string) => void;
  setThemeTintType: (tintType: string) => void;
  bypass: boolean;
  isElectron: boolean;
  setBypass: (bypass: boolean) => void;
  setOfflineCommunities: (communities: Community[]) => void;
  setOfflineConversations: (conversations: Conversation[]) => void;
};
