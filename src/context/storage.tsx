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
import { useTheme } from "next-themes";
import { contextBridge, ipcRenderer } from "electron";

// Lib Imports
import { handleError } from "@/lib/utils";
import { generateColors } from "@/lib/theme";

// Context Imports
import { Community, Conversation, User, StoredUser } from "@/lib/types";

// Components
import { RawLoading } from "@/components/loading";

// Types
import { OfflineData, StoredSettings, Value, Language } from "@/lib/types";

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
    storedUsers: [],
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
  const [language, setLanguageState] = useState<string | null>(null);
  const [languages, setLanguagesState] = useState<{
    en_int: Language;
    [key: string]: Language;
  }>({
    en_int: {
      GENERIC_NAME: "English International (default)",

      // General
      GENERAL_CLOSE: "Close",

      // Sidebar
      COMMUNITIES: "Communities",
      CONVERSATIONS: "Conversations",
      CATEGORY_NO_COMMUNITIES: "No communities",
      CATEGORY_NO_CONVERSATIONS: "No conversations",

      // Homepage
      HOME_PAGE_ADD_CONVERSATION_LABEL: "Add Conversation",
      HOME_PAGE_ADD_CONVERSATION_DESCRIPTION:
        "Create a new conversation with a user by entering their username.",
      HOME_PAGE_ADD_CONVERSATION_INPUT_PLACEHOLDER: "Enter username...",
      HOME_PAGE_ADD_COMMUNITY_LABEL: "Add Community",
      ERROR_HOME_PAGE_ADD_CONVERSATION_FAILED: "Failed to add conversation",
      HOME_PAGE_PLACEHOLDER_MESSAGE: "WEEWOO HOMEPAGE!!! WEEWOO",
      HOME_PAGE_START_CALL_BUTTON: "Start Call",
      HOME_PAGE_ACTIVE_STATUS: "Active",

      // Login Page
      LOGIN_PAGE_TU_FILE_TITLE: "Login using .tu file",
      LOGIN_PAGE_TU_FILE_RECOMMENDED: "Recommended",
      LOGIN_PAGE_TU_FILE_RELEASE: "Release to login",
      LOGIN_PAGE_TU_FILE_SELECT: "Select a .tu file",
      LOGIN_PAGE_CREDENTIALS_TITLE: "Login using credentials",
      LOGIN_PAGE_USERNAME_LABEL: "Username",
      LOGIN_PAGE_USERNAME_PLACEHOLDER: "some_user",
      LOGIN_PAGE_PRIVATE_KEY_LABEL: "Private Key",
      LOGIN_PAGE_PRIVATE_KEY_PLACEHOLDER: "•••••••••••••••",
      LOGIN_PAGE_SUBMIT_BUTTON: "Login",
      LOGIN_PAGE_TOS_NOTICE: "By logging in you agree to our",
      LOGIN_PAGE_TERMS_LINK: "Terms of Service",
      LOGIN_PAGE_PRIVACY_LINK: "Privacy Policy",
      LOGIN_PAGE_AND: "and",

      // Chat Page
      FAILED_MESSAGES_MULTIPLE: " messages failed to load",
      FAILED_MESSAGES_SINGLE: "Failed to load 1 message",
      CHAT_PAGE_INPUT_PLACEHOLDER: "Type a message...",
      ERROR_CONVERSATION_LOADING_FAILED: "No conversation?",
      NO_MESSAGES_WITH_USER: "You have no messages with this user.",
      CHAT_MESSAGE_COPY: "Copy",
      CHAT_MESSAGE_REPLY: "Reply",
      COPY_MESSAGE_TO_CLIPBOARD: "Message copied to clipboard!",
      ERROR_COPY_MESSAGE_TO_CLIPBOARD: "Failed to copy message to clipboard.",

      // Call Page
      CALL_PAGE_PLACEHOLDER_MESSAGE: "Call Page",
      VOICE_ACTIONS_EXPAND: "Expand",

      // Settings
      SETTINGS_PAGE_LABEL_ACCOUNT: "Account",
      SETTINGS_PAGE_LABEL_APPEARANCE: "Appearance",
      SETTINGS_PAGE_LABEL_GENERAL: "General",
      SETTINGS_PAGE_LABEL_ADVANCED: "Advanced",
      SETTINGS_PAGE_LABEL_INFORMATION: "Information",

      SETTINGS_PAGE_LABEL_IOTA: "Iota",
      SETTINGS_PAGE_LABEL_PROFILE: "Profile",
      SETTINGS_PAGE_LABEL_PRIVACY: "Privacy",
      SETTINGS_PRIVACY_PLACEHOLDER: "Privacy settings are coming soon.",

      SETTINGS_PAGE_LOGOUT_BUTTON_ACTION: "Logout",
      SETTINGS_PAGE_LOGOUT_BUTTON_LABEL: "Are you sure you want to logout?",
      SETTINGS_PAGE_LOGOUT_BUTTON_DESCRIPTION:
        "This will log you out of your account and delete all your settings.",

      SETTINGS_PAGE_LABEL_THEME: "Theme",
      SETTINGS_PAGE_LABEL_CSS: "Custom CSS",
      SETTINGS_PAGE_LABEL_LAYOUT: "Layout",
      SETTINGS_LAYOUT_PLACEHOLDER: "Layout settings are coming soon.",

      SETTINGS_PAGE_LABEL_AUDIO: "Audio",
      SETTINGS_PAGE_LABEL_VIDEO: "Video",
      SETTINGS_VIDEO_PLACEHOLDER: "Video settings are coming soon.",
      SETTINGS_PAGE_LABEL_SOUNDBOARD: "Soundboard",
      SETTINGS_SOUNDBOARD_PLACEHOLDER: "Soundboard settings are coming soon.",
      SETTINGS_PAGE_LABEL_NOTIFICATIONS: "Notifications",
      SETTINGS_NOTIFICATIONS_ENABLE_NATIVE: "Enable native notifications",
      SETTINGS_PAGE_LABEL_ACCESSABILITY: "Accessibility",
      SETTINGS_ACCESSABILITY_REVERSE_ENTER: "Invert enter key behavior",
      SETTINGS_PAGE_LABEL_LANGUAGE: "Language",
      SETTINGS_PAGE_LABEL_PREMIUM: "Premium",
      SETTINGS_PREMIUM_STATUS_LABEL: "Status:",
      SETTINGS_PREMIUM_LEVEL_FREE: "Free",
      SETTINGS_PREMIUM_LEVEL_PREMIUM: "Premium",
      SETTINGS_PREMIUM_LEVEL_ERROR: "Unknown",
      SETTINGS_PREMIUM_REMAINING_DAYS: "Days remaining: ",

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
      DEVELOPER_PAGE_NO_ENTRIES: "No entries found.",
      DEVELOPER_PAGE_EDIT_VALUE_PLACEHOLDER: '{"enabled": true}',
      DEVELOPER_PAGE_EDIT_VALUE_REQUIRED: "Value is required.",
      DEVELOPER_PAGE_EDIT_VALUE_INVALID_JSON:
        "Value must be valid JSON (wrap strings in quotes).",
      DEVELOPER_PAGE_NEW_ENTRY_KEY_REQUIRED: "Key is required.",
      DEVELOPER_PAGE_NEW_ENTRY_KEY_EXISTS: "Key already exists.",
      DEVELOPER_PAGE_NEW_ENTRY_VALUE_REQUIRED: "Value is required.",
      DEVELOPER_PAGE_NEW_ENTRY_INVALID_JSON:
        "Value must be valid JSON (wrap strings in quotes).",

      // Iota Page
      IOTA_PAGE_SYNC_SECTION_TITLE: "Sync your settings with Iota",
      IOTA_PAGE_LOAD_BUTTON: "Load",
      IOTA_PAGE_SAVE_BUTTON: "Save",
      IOTA_PAGE_SETTINGS_LOADING: "Loading settings...",
      IOTA_PAGE_SETTINGS_LOAD_SUCCESS: "Settings loaded",
      IOTA_PAGE_SETTINGS_LOAD_FAILED: "Failed to load settings",
      IOTA_PAGE_SETTINGS_SAVED: "Settings saved",
      IOTA_PAGE_PROFILES_LOADING: "Loading profiles...",
      IOTA_PAGE_SELECT_PROFILE_PLACEHOLDER: "Select a profile",
      IOTA_PAGE_SEARCH_PROFILE_PLACEHOLDER: "Search profiles...",
      IOTA_PAGE_NO_PROFILE_FOUND: "No profiles found.",
      IOTA_PAGE_LOAD_SETTINGS_TITLE:
        "Are you sure you want to load this profile?",
      IOTA_PAGE_LOAD_SETTINGS_DESCRIPTION:
        "This will replace your current settings! Make sure to save them first if you want to keep them.",
      IOTA_PAGE_ADD_PROFILE_TOOLTIP: "Create a new profile",
      IOTA_PAGE_ADD_PROFILE_TITLE: "Create profile",
      IOTA_PAGE_ADD_PROFILE_DESCRIPTION:
        "Name a profile so you can quickly load it later.",
      IOTA_PAGE_PROFILE_NAME_LABEL: "Profile name",
      IOTA_PAGE_PROFILE_NAME_PLACEHOLDER: "e.g. Profile 1",
      IOTA_PAGE_ADD_PROFILE_BUTTON: "Add profile",
      IOTA_PAGE_INCLUDE_PRIVATE_KEY_LABEL: "Include private key",
      IOTA_PAGE_INCLUDE_PRIVATE_KEY_WARNING_TITLE: "This is not recommended!",
      IOTA_PAGE_INCLUDE_PRIVATE_KEY_WARNING_DESCRIPTION:
        "Including your private key can act as a backup to restore your account and for quickly switching between accounts, but the securiy risks that come with it are significant. Only enable this option if you trust the Iota host.",
      IOTA_PAGE_INCLUDE_PRIVATE_KEY_ALERT_TITLE: "Include private key?",
      IOTA_PAGE_INCLUDE_PRIVATE_KEY_ALERT_DESCRIPTION:
        "Anyone with access to this profile can read your private key.",
      IOTA_PAGE_INCLUDE_PRIVATE_KEY_ALERT_CONTINUE: "Continue",

      // Language Page
      UNKOWN_LANGUAGE: "Unknown Language",
      LANGUAGE_PAGE_ADD_LANGUAGE_BUTTON: "Add Language",
      LANGUAGE_PAGE_SEARCH_LANGUAGES: "Search languages...",
      LANGUAGE_PAGE_NO_LANGUAGE_FOUND: "No language found.",
      LANGUAGE_PAGE_MISSING_TRANSLATIONS: "This file is missing translations.",
      ERROR_INVALID_TL_FILE: "Invalid translation file.",
      ERROR_LANGUAGE_PAGE_INVALID_TL_FILE: "Failed to parse translation file.",
      PROFILE_PAGE_ABOUT:
        "Coffee enthusiast, cat lover, and part time superhero.",
      PROFILE_PAGE_UPDATE_SUCCESS: "Profile updated successfully!",
      ERROR_PROFILE_PAGE_FAILED_BROADCAST:
        "Failed to broadcast profile changes (users have to reload their client to see the changes)",

      // Profile Page
      PROFILE_PAGE: "Profile Page",
      DATA_PROFILE_PAGE_UPDATE: "Profile data updated",
      ERROR_PROFILE_PAGE_UPDATE_FAILED: "Failed to update profile",
      PROFILE_PAGE_REMOVE_AVATAR: "Remove Avatar",
      PROFILE_PAGE_ABOUT_COUNT: "Characters: ",

      // Custom CSS Page
      SETTINGS_CSS_SAVED: "CSS saved successfully",
      SETTINGS_CSS_CLEARED: "CSS cleared successfully",
      SETTINGS_CSS_CUSTOM_CSS: "Custom CSS",

      // Theme Page
      SETTINGS_THEME_COLOR_HEX_LABEL: "Theme color",
      SETTINGS_THEME_COLOR_SCHEME_LABEL: "Color scheme",
      SETTINGS_THEME_COLOR_SCHEME_PLACEHOLDER: "Select a color scheme",
      SETTINGS_THEME_COLOR_SCHEME_OPTION_LIGHT: "Light",
      SETTINGS_THEME_COLOR_SCHEME_OPTION_DARK: "Dark",
      SETTINGS_THEME_COLOR_SCHEME_OPTION_SYSTEM: "System",
      SETTINGS_THEME_TINT_TYPE_LABEL: "Tint type",
      SETTINGS_THEME_TINT_TYPE_PLACEHOLDER: "Select a tint style",
      SETTINGS_THEME_TINT_TYPE_OPTION_HARD: "Light", // yes, this is correct (i'll switch it at some point)
      SETTINGS_THEME_TINT_TYPE_OPTION_LIGHT: "Dark", // vvv
      SETTINGS_THEME_DISABLE_VIEW_TRANSITIONS_LABEL: "Disable view transitions",

      // Socket Context
      SOCKET_CONTEXT: "Socket Context",
      SOCKET_CONTEXT_CONNECTED: "Connected to Omikron",
      SOCKET_CONTEXT_DISCONNECTED: "Disconnected from Omikron",
      SOCKET_CONTEXT_SEND: "Sent to socket:",
      SOCKET_CONTEXT_RECEIVE: "Received from socket:",
      SOCKET_CONTEXT_IDENTIFICATION_SUCCESS: "Identification success",
      ERROR_SOCKET_CONTEXT_IDENTIFICATION_FAILED:
        "Unknown identification error",
      ERROR_SOCKET_CONTEXT_CANNOT_CONNECT: "Could not connect to the Omikron",
      ERROR_SOCKET_CONTEXT_CANNOT_CONNECT_EXTRA:
        "Check your internet connection and try again.\n If the issue persists check the Tensamin status page.",
      SOCKET_CONTEXT_LOADING_IDENTIFYING: "Identifying client...",
      SOCKET_CONTEXT_LOADING_CONNECTING: "Connecting to Omikron...",
      SOCKET_CONTEXT_LOADING_CLOSING: "Closing connection...",
      SOCKET_CONTEXT_LOADING_CLOSED: "Socket closed",
      SOCKET_CONTEXT_LOADING_UNINSTANTIATED: "Initializing socket...",
      SOCKET_CONTEXT_LOADING: "Preparing socket...",

      // Audio Settings
      SETTINGS_AUDIO: "Audio",
      SETTINGS_AUDIO_NO_PERMISSION:
        "Tensamin doesn't have access to your microphone.",
      SETTINGS_PAGE_LABEL_RETRY: "Retry",
      SETTINGS_AUDIO_DEVICES_LOADING: "Loading devices...",
      SETTINGS_AUDIO_INPUT_DEVICE_LABEL: "Input Device",
      SETTINGS_AUDIO_DEFAULT_DEVICE: "Default device",
      SETTINGS_AUDIO_UNKNOWN_DEVICE: "Unknown device",
      SETTINGS_AUDIO_MICROPHONE_FALLBACK: "Microphone",
      SETTINGS_AUDIO_SPEAKER_FALLBACK: "Speaker",
      SETTINGS_AUDIO_OUTPUT_DEVICE_LABEL: "Output Device",
      SETTINGS_AUDIO_INPUT_VOLUME: "Input Volume",
      SETTINGS_AUDIO_OUTPUT_VOLUME: "Output Volume",
      SETTINGS_AUDIO_TEST_TITLE: "Microphone test",
      SETTINGS_AUDIO_TEST_LABEL:
        "Test your microphone and hear how you sound to others. Make sure to speak clearly into your mic.",
      SETTINGS_AUDIO_START_TEST: "Start Test",
      SETTINGS_AUDIO_STOP_TEST: "Stop Test",
      SETTINGS_AUDIO_TEST_VOLUME_1:
        "Try speaking into your microphone (or just scream as loud as you can).",
      SETTINGS_AUDIO_TEST_VOLUME_2: "Try speaking a bit louder",
      SETTINGS_AUDIO_TEST_VOLUME_3: "Sounds good!",
      SETTINGS_AUDIO_TEST_VOLUME_4:
        "You might be a bit too loud, try lowering your input volume",
      SETTINGS_AUDIO_NS_LABEL: "Noise Suppression",
      SETTINGS_AUDIO_NS_DESCRIPTION:
        "You can suppress background noise in your calls while using Tensamin. Higher quality methods use more CPU but if your computer was made in the last decade and isn't a literal potato or toaster, you should be fine though.",
      SETTINGS_AUDIO_NS_DISABLED: "Disabled",
      SETTINGS_AUDIO_NS_BUILTIN:
        "Built-in (You don't want to use this, trust me)",
      SETTINGS_AUDIO_NS_SPEEX: "Speex (lower quality, lower CPU usage)",
      SETTINGS_AUDIO_NS_RNNOISE: "RNNoise (higher quality, higher CPU usage)",
      SETTINGS_AUDIO_NS_NOT_SUPPORTED:
        "Your browser does not support noise suppression.",
      SETTINGS_AUDIO_CONTEXT_PREFIX: "Audio context:",
      SETTINGS_AUDIO_CONTEXT_NONE: "Unavailable",

      ERROR_INVALID_USER_ID: "The provided user id is invalid",
      ERROR_INVALID_PRIVATE_KEY: "The provided private key is invalid",
      ERROR_INVALID_PRIVATE_KEY_EXTRA:
        "Reload the page and try again. If the issue persists clear your storage and log in again.",

      ERROR_NO_IOTA: "No Iota for this user found",
      ERROR_NO_IOTA_EXTRA:
        "Check the internet connection of your Iota and try again.\n This error occurs when the Omikron cannot find a connected Iota for your user.",

      ERROR_SOCKET_CONTEXT_TIMEOUT: "Socket timeout",

      // User Context
      USER_CONTEXT: "User Context",
      USER_CONTEXT_USER_NOT_FETCHED: "User not fetched",
      USER_CONTEXT_USER_ALREADY_FETCHED: "User already fetched",

      // Crypto Context
      CRYPTO_CONTEXT_LOADING: "Initializing crypto...",

      // Bypass Messages
      BYPASS_CRYPTO_CONTEXT_ENCRYPT: "Encryption bypassed",
      BYPASS_CRYPTO_CONTEXT_DECRYPT: "Decryption bypassed",
      BYPASS_CRYPTO_CONTEXT_GET_SHARED_SECRET: "Get shared secret bypassed",

      // Worker
      ERROR_ENCRYPTION_WORKER_NO_SUBTLE:
        "The Crypto worker is missing subtle crypto.",

      // Other Stuff
      CREATE: "Create",
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
      ERROR_DECRYPTING_MESSAGE: "Error decrypting message",
      RESCUE_BYPASS_BUTTON_LABEL: "Bypass Screen",
      RESCUE_CLEAR_STORAGE_BUTTON_LABEL: "Clear Storage",
      RESCUE_CLEAR_STORAGE_BUTTON_DESCRIPTION:
        "This will clear all your settings and log you out of your account.",
    },
  });
  const { resolvedTheme, systemTheme } = useTheme();

  useEffect(() => {
    // @ts-expect-error
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
        storedUsers: [],
        storedConversations: [],
        storedCommunities: [],
      };
      userData.forEach((entry) => {
        loadedUserData[entry.key] = entry.value;
      });
      setUserData(loadedUserData);
      offlineData.forEach((entry) => {
        switch (entry.key) {
          case "storedUsers":
            entry.value.forEach(
              (userEntry: { user: User; storeTime: number }) => {
                if (
                  userEntry.storeTime + 1000 * 60 * 60 * 24 * 7 <
                  Date.now()
                ) {
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
              }
            );
            break;
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

      // Extra User Data Stuff
      setLanguagesState({
        en_int: languages.en_int,
        ...(loadedUserData.languages as Language),
      } as {
        en_int: Language;
        [key: string]: Language;
      });
      setLanguageState((loadedUserData.language as string) || "en_int");
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

  const setThemeCSS = useCallback(
    (css: string) => {
      setRawThemeCSS(css);
      set("themeCSS", css);
    },
    [set]
  );

  const setThemeTint = useCallback(
    (tint: string) => {
      setRawThemeTint(tint);
      set("themeTint", tint);
    },
    [set]
  );

  const setThemeTintType = useCallback(
    (tintType: string) => {
      setRawThemeTintType(tintType);
      set("themeTintType", tintType);
    },
    [set]
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
      activeScheme
    );

    Object.entries(colors).forEach(([name, value]) =>
      document.documentElement.style.setProperty(name, value)
    );
  }, [resolvedTheme, systemTheme, userData.tintType, userData.themeHex]);

  const persistLanguages = useCallback(
    (nextLanguages: { en_int: Language; [key: string]: Language }) => {
      const languagesWithoutEnInt: { [key: string]: Language } = {
        ...nextLanguages,
      };
      delete languagesWithoutEnInt["en_int"];
      set("languages", languagesWithoutEnInt);
    },
    [set]
  );

  const setLanguage = useCallback(
    (langKey: string) => {
      setLanguageState(langKey);
      set("language", langKey);
    },
    [set]
  );

  const clearAll = useCallback(async () => {
    if (!db) return;
    try {
      await db.clear("data");
      setUserData({});
      await db.clear("offline");
      setOfflineData({
        storedUsers: [],
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

  const addOfflineUser = useCallback(
    async (user: User) => {
      if (!db) return;
      try {
        const tx = db.transaction("offline", "readwrite");
        const store = tx.objectStore("offline");
        const entry = await store.get("storedUsers");
        const rawValue = entry?.value;
        const current: StoredUser[] = Array.isArray(rawValue)
          ? (rawValue as StoredUser[])
          : [];

        const storeTime = Date.now();
        const existingIndex = current.findIndex(
          (stored) => stored.user.uuid === user.uuid
        );

        const updated: StoredUser[] = [...current];
        if (existingIndex !== -1) {
          updated[existingIndex] = {
            user,
            storeTime,
          };
        } else {
          updated.push({ user, storeTime });
        }

        await store.put({ key: "storedUsers", value: updated });
        await tx.done;

        setOfflineData((prev) => ({
          ...prev,
          storedUsers: updated,
        }));
      } catch (err: unknown) {
        handleError("STORAGE_CONTEXT", "ERROR_ADD_OFFLINE_USER_UNKNOWN", err);
      }
    },
    [db]
  );

  const setOfflineConversations = useCallback(
    (conversations: Conversation[]) => {
      if (!db) return;
      db.put("offline", {
        key: "storedConversations",
        value: conversations,
      });
    },
    [db]
  );

  const setOfflineCommunities = useCallback(
    (communities: Community[]) => {
      if (!db) return;
      db.put("offline", {
        key: "storedCommunities",
        value: communities,
      });
    },
    [db]
  );

  const translate = useCallback(
    (input: string, extraInfo?: string | number) => {
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
    },
    [language, languages]
  );

  const addLanguage = useCallback(
    (langKey: string, langData: Language) => {
      setLanguagesState((prev) => {
        const updated = { ...prev, [langKey]: langData };
        persistLanguages(updated);
        return updated;
      });
      toast.success(translate("STORAGE_CONTEXT_LANGUAGE_ADDED"));
    },
    [persistLanguages, translate]
  );

  const removeLanguage = useCallback(
    (langKey: string) => {
      setLanguagesState((prev) => {
        const updated = { ...prev };
        delete updated[langKey];
        persistLanguages(updated);
        return updated;
      });
      toast.success(translate("STORAGE_CONTEXT_LANGUAGE_DELETED"));
    },
    [persistLanguages, translate]
  );

  const debugLog = useCallback(
    (sender: string, message: string, extraInfo?: unknown): void => {
      const tagStyle =
        "background: #3f3f3f; padding: 1px 4px; border-radius: 2px; " +
        "font-size: 10px; font-weight: 700; letter-spacing: 0.5px;";

      const msgStyle =
        "padding: 1px 4px; border-radius: 2px; font-size: 10px; " +
        "font-family: 'Consolas', 'Monaco', monospace; " +
        (message === "SOCKET_CONTEXT_IDENTIFICATION_SUCCESS"
          ? "color: #a6d189;"
          : message === "SOCKET_CONTEXT_CONNECTED"
          ? "color: #a6d189;"
          : message === "SOCKET_CONTEXT_DISCONNECTED"
          ? "color: #e78284;"
          : message.startsWith("ERROR")
          ? "color: #e78284;"
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
    },
    [translate]
  );

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
        isElectron,
        setBypass,
        addOfflineUser,
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
  isElectron: boolean;
  setBypass: (bypass: boolean) => void;
  addOfflineUser: (user: User) => Promise<void>;
  setOfflineCommunities: (communities: Community[]) => void;
  setOfflineConversations: (conversations: Conversation[]) => void;
};
