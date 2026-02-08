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
import { onOpenUrl } from "@tauri-apps/plugin-deep-link";

// Lib Imports
import { handleError, progressBar } from "@/lib/utils";
import { generateColors, readThemeFromCSS } from "@/lib/theme";
import { shortcuts as defaultShortcuts } from "@/config/defaults";
import { debugLog } from "@/lib/logger";

// Components
import RawLoading from "@/components/Loading/RawLoading";

// Types
import { StoredSettings, Value } from "@/lib/types";

type DBType = IDBPDatabase<{
  data: {
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
    },
  });
}

// Re-export debugLog as rawDebugLog for backwards compatibility
export { debugLog as rawDebugLog } from "@/lib/logger";

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
  const [ready, setReady] = useState(false);
  const [isElectron, setIsElectron] = useState(false);
  const [isTauri, setIsTauri] = useState(false);
  const [isLinux, setIsLinux] = useState(false);
  const [isWayland, setIsWayland] = useState(false);
  const [db, setDb] = useState<IDBPDatabase<DBType> | null>(null);
  const [, setRawThemeTint] = useState<string | null>(null);
  const [themeCSS, setRawThemeCSS] = useState<string | null>(null);
  const [, setRawThemeTintType] = useState<string | null>(null);
  const [currentDeepLink, setCurrentDeepLink] = useState<string[] | null>(null);

  const { resolvedTheme, systemTheme } = useTheme();

  // Check if running in Electron and get platform info
  useEffect(() => {
    // @ts-expect-error ElectronAPI only available in Electron
    if (window.electronAPI) {
      setIsElectron(true);
      // Get platform info including Wayland detection
      // @ts-expect-error Electron API only available in Electron
      if (window.electronAPI.getPlatformInfo) {
        // @ts-expect-error Electron API only available in Electron
        window.electronAPI
          .getPlatformInfo()
          .then((info: { isLinux: boolean; isWayland: boolean }) => {
            setIsLinux(info.isLinux);
            setIsWayland(info.isWayland);
            debugLog("Storage", "Platform info", info, "green");
          })
          .catch((err: unknown) => {
            debugLog("Storage", "Failed to get platform info", err, "red");
          });
      }
    } else {
      setIsElectron(false);
    }
  }, []);

  // Check if running in Tauri
  useEffect(() => {
    // @ts-expect-error ElectronAPI only available in Electron
    if (window.__TAURI_INTERNALS__) {
      setIsTauri(true);
    } else {
      setIsTauri(false);
    }
  }, []);

  // Tauri Stuff
  useEffect(() => {
    if (isTauri) {
      const setupDeeplink = async () => {
        await onOpenUrl(async (urls) => {
          if (!urls?.length) return;

          const action = urls[0].replace("tensamin://", "");
          const data = action.split(":");

          debugLog("Tauri", "Deep Link Opened", data, "yellow");

          setCurrentDeepLink(data);
        });
      };

      setupDeeplink();
    }
  }, [isTauri]);

  // Electron Shortcuts
  const [shortcuts, setShortcutsState] = useState<Record<string, string>>({});
  const [shortcutsLoaded, setShortcutsLoaded] = useState(false);

  // Load shortcuts from IndexedDB on init
  useEffect(() => {
    if (!isElectron || !db || shortcutsLoaded) return;

    const loadShortcuts = async () => {
      try {
        const storedShortcuts = await db.get("data", "shortcuts");
        const config =
          (storedShortcuts?.value as Record<string, string>) || defaultShortcuts;

        // @ts-expect-error Electron API only available in Electron
        if (window.electronAPI && window.electronAPI.updateShortcuts) {
          // @ts-expect-error Electron API only available in Electron
          window.electronAPI.updateShortcuts(config);
          setShortcutsState(config);
          debugLog(
            "Storage",
            "Shortcuts loaded and synced to Electron",
            config,
            "green",
          );
        } else {
          setShortcutsState(config);
          debugLog(
            "Storage",
            "Shortcuts loaded but Electron API not available",
            config,
            "yellow",
          );
        }
      } catch (err) {
        debugLog("Storage", "Failed to load shortcuts", err, "red");
        setShortcutsState(defaultShortcuts);
      } finally {
        setShortcutsLoaded(true);
      }
    };

    loadShortcuts();
  }, [isElectron, db, shortcutsLoaded, shortcuts]);

  const updateShortcuts = useCallback(
    async (newShortcuts: Record<string, string>) => {
      if (!isElectron) {
        debugLog(
          "Storage",
          "Cannot update shortcuts: not in Electron",
          undefined,
          "yellow",
        );
        return;
      }

      // Save to IndexedDB
      if (db) {
        try {
          await db.put("data", { key: "shortcuts", value: newShortcuts });
          debugLog(
            "Storage",
            "Shortcuts saved to IndexedDB",
            newShortcuts,
            "green",
          );
        } catch (err) {
          debugLog(
            "Storage",
            "Failed to save shortcuts to IndexedDB",
            err,
            "red",
          );
        }
      }

      // Update Electron
      // @ts-expect-error Electron API only available in Electron
      if (window.electronAPI && window.electronAPI.updateShortcuts) {
        // @ts-expect-error Electron API only available in Electron
        window.electronAPI.updateShortcuts(newShortcuts);
        setShortcutsState(newShortcuts);
        debugLog(
          "Storage",
          "Shortcuts synced to Electron",
          newShortcuts,
          "green",
        );
      } else {
        setShortcutsState(newShortcuts);
        debugLog(
          "Storage",
          "electronAPI.updateShortcuts not available",
          undefined,
          "red",
        );
      }
    },
    [isElectron, db],
  );

  const onShortcut = (action: string, callback: () => void) => {
    console.log("[Storage] onShortcut called for action:", action);

    if (!isElectron) {
      console.warn("[Storage] Cannot register shortcut: not in Electron");
      return () => {};
    }

    // @ts-expect-error Electron API only available in Electron
    if (!window.electronAPI || !window.electronAPI.onShortcut) {
      console.error("[Storage] electronAPI.onShortcut not available");
      return () => {};
    }

    console.log("[Storage] Registering shortcut listener for action:", action);
    // @ts-expect-error Electron API only available in Electron
    const cleanup = window.electronAPI.onShortcut(action, () => {
      console.log("[Storage] Shortcut callback triggered for action:", action);
      callback();
    });

    console.log(
      "[Storage] Shortcut listener registered, cleanup function:",
      typeof cleanup,
    );
    return cleanup;
  };

  // Other Stuff
  const dbPromise = useMemo(() => createDBPromise(), []);

  const loadData = useCallback(async () => {
    if (!db) return;
    try {
      const userData = await db.getAll("data");
      const loadedUserData: StoredSettings = {};
      userData.forEach((entry) => {
        loadedUserData[entry.key] = entry.value;
      });

      setUserData(loadedUserData);
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
    ) {
      const variables = readThemeFromCSS("dark");
      Object.entries(variables).forEach(([name]) =>
        document.documentElement.style.removeProperty(name),
      );
      return;
    }

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

  if (failed) {
    return (
      <RawLoading
        debug={false}
        isError
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
        setThemeCSS,
        setThemeTint,
        setThemeTintType,
        isElectron,
        isTauri,
        isLinux,
        isWayland,
        currentDeepLink,
        shortcuts,
        updateShortcuts,
        onShortcut,
      }}
    >
      {children}
    </StorageContext.Provider>
  ) : (
    <RawLoading
      debug={false}
      isError={false}
      addClearButton={false}
      message=""
      progress={progressBar.storage}
    />
  );
}

type StorageContextType = {
  set: (key: string, value: Value) => void;
  clearAll: () => void;
  data: StoredSettings;
  setThemeCSS: (css: string) => void;
  setThemeTint: (tint: string) => void;
  setThemeTintType: (tintType: string) => void;
  isElectron: boolean;
  isTauri: boolean;
  isLinux: boolean;
  isWayland: boolean;
  currentDeepLink: string[] | null;
  shortcuts: Record<string, string>;
  updateShortcuts: (newShortcuts: Record<string, string>) => void;
  onShortcut: (action: string, callback: () => void) => () => void;
};
