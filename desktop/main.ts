// Package Imports
import {
  app,
  autoUpdater,
  BrowserWindow,
  desktopCapturer,
  ipcMain,
  net,
  protocol,
  shell,
  systemPreferences,
  globalShortcut,
} from "electron";
import * as path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
// @ts-ignore Squirrel startup
import squirrelStartup from "electron-squirrel-startup";

// Platform detection - robust Wayland detection
const isLinux = process.platform === "linux";
const ozonePlatformArg = process.argv.find((arg) =>
  arg.startsWith("--ozone-platform="),
);
const ozonePlatformValue = ozonePlatformArg?.split("=")[1];
const isWayland =
  isLinux &&
  (ozonePlatformValue === "wayland" ||
    process.env.ELECTRON_OZONE_PLATFORM_HINT === "wayland" ||
    process.env.XDG_SESSION_TYPE === "wayland" ||
    !!process.env.WAYLAND_DISPLAY);

// CLI argument parsing for --shortcut <action>
function parseShortcutArg(): string | null {
  const shortcutIndex = process.argv.indexOf("--shortcut");
  if (shortcutIndex !== -1 && process.argv[shortcutIndex + 1]) {
    return process.argv[shortcutIndex + 1];
  }
  return null;
}

const cliShortcutAction = parseShortcutArg();

// Types
type UpdatePayload = {
  version: string | null;
  releaseName: string | null;
  releaseNotes: unknown | null;
  releaseDate: number | null;
  url: string;
};

type UpdateLogPayload = {
  level: "info" | "error";
  message: string;
  details?: Record<string, unknown>;
  timestamp: number;
};

type MediaAccessType = Parameters<
  typeof systemPreferences.getMediaAccessStatus
>[0];

// Helper Functions
function emitUpdateAvailable(payload: UpdatePayload) {
  latestUpdatePayload = payload;
  mainWindow?.webContents.send(UPDATE_AVAILABLE_CHANNEL, payload);
  splashWindow?.webContents.send(UPDATE_AVAILABLE_CHANNEL, payload);
}

function emitUpdateLog(payload: UpdateLogPayload) {
  mainWindow?.webContents.send(UPDATE_LOG_CHANNEL, payload);
  splashWindow?.webContents.send(UPDATE_LOG_CHANNEL, payload);
}

function serializeErrorDetails(error: unknown) {
  if (error instanceof Error) {
    return {
      name: error.name,
      message: error.message,
      stack: error.stack,
    };
  }

  return { message: String(error) };
}

function isMediaAccessGranted(mediaType: MediaAccessType) {
  const getStatus = systemPreferences.getMediaAccessStatus;

  if (typeof getStatus !== "function") {
    return true;
  }

  try {
    return getStatus.call(systemPreferences, mediaType) === "granted";
  } catch (error) {
    console.warn(`Unable to determine ${mediaType} access:`, error);
    return true;
  }
}

async function listScreenSources() {
  const sources = await desktopCapturer.getSources({
    types: ["window", "screen"],
    fetchWindowIcons: true,
    thumbnailSize: {
      width: 854,
      height: 480,
    },
  });

  return sources.map((source) => {
    return {
      id: source.id,
      name: source.name,
      thumbnail: source.thumbnail.toDataURL(),
      appIcon: source.appIcon ? source.appIcon.toDataURL() : null,
    };
  });
}

async function listAudioSources() {
  const audioSources: Array<{ id: string; name: string; type: string }> = [
    { id: "none", name: "None", type: "none" },
  ];

  try {
    audioSources.push({ id: "system", name: "Entire System", type: "system" });

    if (process.platform === "linux") {
      audioSources.push(
        {
          id: "pipewire:electron",
          name: "PipeWire ALSA [electron]",
          type: "pipewire",
        },
        {
          id: "pipewire:chrome",
          name: "PipeWire ALSA [chrome]",
          type: "pipewire",
        },
      );
    }
  } catch (error) {
    console.error("Error listing audio sources:", error);
  }

  return audioSources;
}

const registerShortcuts = (win: BrowserWindow | null = null) => {
  console.log("[Shortcuts] Registering shortcuts:", shortcuts);
  const targetWindow = win || mainWindow;

  if (!targetWindow) {
    console.warn("[Shortcuts] No window available for shortcuts");
    return;
  }

  Object.entries(shortcuts).forEach(([key, action]) => {
    const registered = globalShortcut.register(key, () => {
      console.log(`[Shortcuts] Shortcut triggered: ${key} -> ${action}`);
      targetWindow.webContents.send(`shortcut:${action}`);
    });

    if (registered) {
      console.log(`[Shortcuts] Successfully registered: ${key} -> ${action}`);
    } else {
      console.error(`[Shortcuts] Failed to register: ${key} -> ${action}`);
    }
  });
};

// Fixed variables
const FILENAME = fileURLToPath(import.meta.url);
const DIRNAME = path.dirname(FILENAME);
const RELEASES_URL = "https://github.com/Tensamin/Frontend/releases";
const UPDATE_AVAILABLE_CHANNEL = "app:update-available";
const UPDATE_LOG_CHANNEL = "app:update-log";
//const UPDATE_CHECK_INTERVAL_MS = 5 * 1000; // 5 seconds
const UPDATE_CHECK_INTERVAL_MS = 60 * 60 * 1000; // 1 hour

// Main
let shortcuts: Record<string, string> = {
  "CmdOrCtrl+K": "test",
};
let mainWindow: BrowserWindow | null = null;
let splashWindow: BrowserWindow | null = null;
let latestUpdatePayload: UpdatePayload | null = null;
let updateCheckInterval: ReturnType<typeof setInterval> | null = null;
let isUpdateDownloaded = false;

// Squirrel Startup Handling
if (squirrelStartup) app.quit();

// Single instance lock with CLI shortcut support
const gotTheLock = app.requestSingleInstanceLock({
  shortcutAction: cliShortcutAction,
});

if (!gotTheLock) {
  // Another instance is running
  // If we have a shortcut action, the other instance will handle it via second-instance event
  // Either way, quit this instance
  app.quit();
} else {
  // Handle second instance attempting to start
  app.on(
    "second-instance",
    (
      _event: Electron.Event,
      _commandLine: string[],
      _workingDirectory: string,
      additionalData: unknown,
    ) => {
      const data = additionalData as { shortcutAction?: string | null } | undefined;
      
      // If the second instance was launched with --shortcut, trigger it
      if (data?.shortcutAction && mainWindow) {
        console.log(
          `[CLI] Triggering shortcut action: ${data.shortcutAction}`,
        );
        mainWindow.webContents.send(
          `shortcut:${data.shortcutAction}`,
        );
      }

      // Focus the main window if it exists
      if (mainWindow) {
        if (mainWindow.isMinimized()) mainWindow.restore();
        mainWindow.focus();
      }
    },
  );
}

// If this instance was launched with --shortcut but we got the lock,
// it means no other instance was running - just quit silently
if (cliShortcutAction && gotTheLock) {
  app.quit();
}

// Force Wayland and PipeWire on Linux
if (process.platform === "linux") {
  app.commandLine.appendSwitch(
    "enable-features",
    "UseOzonePlatform,WebRTCPipeWireCapturer",
  );
  app.commandLine.appendSwitch("ozone-platform", "wayland");
}

// Register custom protocol
protocol.registerSchemesAsPrivileged([
  {
    scheme: "app",
    privileges: {
      standard: true,
      secure: true,
      supportFetchAPI: true,
      corsEnabled: true,
    },
  },
]);

function isAutoUpdateSupported(): boolean {
  return process.platform === "darwin" || process.platform === "win32";
}

function getFeedURL(): string | null {
  if (!isAutoUpdateSupported()) return null;
  const server = "https://update.electronjs.org";
  return `${server}/Tensamin/Frontend/${process.platform}-${process.arch}/${app.getVersion()}`;
}

// Setup auto updater
function setupBackgroundAutoUpdater() {
  if (!isAutoUpdateSupported()) {
    return;
  }

  try {
    const feed = getFeedURL();
    if (feed) {
      autoUpdater.setFeedURL({ url: feed });
    }

    // Error during update check or download
    autoUpdater.on("error", (error) => {
      console.error("Auto-updater error:", error.message);
      emitUpdateLog({
        level: "error",
        message: `Update error: ${error.message}`,
        details: serializeErrorDetails(error),
        timestamp: Date.now(),
      });
    });

    // Update available and downloading
    autoUpdater.on("update-available", () => {
      console.log("Update available, downloading...");
    });

    // No update available
    autoUpdater.on("update-not-available", () => {
      console.log("No update available.");
    });

    // Update downloaded and ready to install
    autoUpdater.on(
      "update-downloaded",
      (event, releaseNotes, releaseName, releaseDate, updateURL) => {
        isUpdateDownloaded = true;

        const payload: UpdatePayload = {
          version: releaseName || null,
          releaseName: releaseName || null,
          releaseNotes: releaseNotes || null,
          releaseDate: releaseDate ? new Date(releaseDate).getTime() : null,
          url: updateURL || RELEASES_URL,
        };

        // Emit update available
        emitUpdateAvailable(payload);
        emitUpdateLog({
          level: "info",
          message: `Update ${releaseName || "available"} downloaded and ready to install`,
          timestamp: Date.now(),
        });
      },
    );

    // Set up periodic update checks
    updateCheckInterval = setInterval(() => {
      autoUpdater.checkForUpdates();
    }, UPDATE_CHECK_INTERVAL_MS);
  } catch (error) {
    console.error("Failed to setup auto-updater:", error);
    emitUpdateLog({
      level: "error",
      message: `Failed to initialize update service: ${error instanceof Error ? error.message : String(error)}`,
      details: serializeErrorDetails(error),
      timestamp: Date.now(),
    });
  }
}

function createMainWindow() {
  mainWindow = new BrowserWindow({
    width: 1200,
    height: 800,
    frame: false,
    show: false,
    icon: "app://./assets/app/web-app-manifest-512x512.png",
    webPreferences: {
      preload: path.join(app.getAppPath(), "preload.js"),
      nodeIntegration: false,
      contextIsolation: true,
    },
  });

  mainWindow.webContents.setWindowOpenHandler(({ url }) => {
    if (
      url.startsWith("http://") ||
      url.startsWith("https://") ||
      url.startsWith("mailto:")
    ) {
      shell.openExternal(url);
      return { action: "deny" };
    }

    return { action: "allow" };
  });

  const url =
    process.env.NODE_ENV === "development"
      ? "http://localhost:3000"
      : "app://./index.html";

  mainWindow.loadURL(url);

  mainWindow.on("ready-to-show", () => {
    mainWindow?.show();
    setupBackgroundAutoUpdater();

    // Register shortcuts after window is ready
    console.log("[Main] Window ready, current shortcuts:", shortcuts);
    console.log("[Main] Registering shortcuts");
    registerShortcuts(mainWindow);
  });

  mainWindow.webContents.on("did-finish-load", () => {
    if (mainWindow) {
      if (latestUpdatePayload) {
        mainWindow.webContents.send(
          UPDATE_AVAILABLE_CHANNEL,
          latestUpdatePayload,
        );
      }
    }
  });

  mainWindow.on("closed", () => {
    mainWindow = null;
  });
}

function createSplashWindow() {
  splashWindow = new BrowserWindow({
    width: 300,
    height: 400,
    frame: false,
    show: false,
    resizable: false,
    center: true,
    icon: "app://./assets/app/web-app-manifest-512x512.png",
    webPreferences: {
      preload: path.join(app.getAppPath(), "preload.js"),
      nodeIntegration: false,
      contextIsolation: true,
    },
  });

  const splashUrl =
    process.env.NODE_ENV === "development"
      ? "http://localhost:3000/misc/loading"
      : "app://./misc/loading.html";

  splashWindow.loadURL(splashUrl);

  splashWindow.on("ready-to-show", () => {
    splashWindow?.show();

    // Configure for startup check
    const feed = getFeedURL();
    if (!feed) {
      closeSplashAndStartMain();
      return;
    }

    try {
      autoUpdater.setFeedURL({ url: feed });

      emitUpdateLog({
        level: "info",
        message: "Checking for updates...",
        timestamp: Date.now(),
      });

      // Handle startup specific events
      const onUpdateDownloaded = () => {
        emitUpdateLog({
          level: "info",
          message: "Update downloaded, installing...",
          timestamp: Date.now(),
        });
        cleanup();
        autoUpdater.quitAndInstall();
      };

      const onErrorOrNotAvailable = (err?: Error) => {
        if (err) {
          console.error("Auto-updater error/not-available during splash:", err);
        }
        cleanup();
        closeSplashAndStartMain();
      };

      const onUpdateAvailable = () => {
        emitUpdateLog({
          level: "info",
          message: "Update found, downloading...",
          timestamp: Date.now(),
        });
      };

      const cleanup = () => {
        autoUpdater.removeListener("update-downloaded", onUpdateDownloaded);
        autoUpdater.removeListener(
          "update-not-available",
          onErrorOrNotAvailable,
        );
        autoUpdater.removeListener("error", onErrorOrNotAvailable);
        autoUpdater.removeListener("update-available", onUpdateAvailable);
      };

      autoUpdater.once("update-downloaded", onUpdateDownloaded);
      autoUpdater.once("update-not-available", () => onErrorOrNotAvailable());
      autoUpdater.once("error", (e) => onErrorOrNotAvailable(e));
      autoUpdater.on("update-available", onUpdateAvailable);

      autoUpdater.checkForUpdates();
    } catch (error) {
      console.error("Error during splash update check:", error);
      closeSplashAndStartMain();
    }
  });

  splashWindow.on("closed", () => {
    splashWindow = null;
  });
}

function closeSplashAndStartMain() {
  if (splashWindow) {
    splashWindow.close();
    splashWindow = null;
  }
  createMainWindow();
}

app.whenReady().then(() => {
  const ozonePlatform =
    app.commandLine.getSwitchValue("ozone-platform") ||
    process.env.ELECTRON_OZONE_PLATFORM_HINT;
  const isWayland =
    ozonePlatform === "wayland" ||
    (ozonePlatform === "auto" && !!process.env.WAYLAND_DISPLAY);

  if (isWayland) {
    console.log("\x1b[32m" + `[INFO] Running with Wayland` + "\x1b[0m");
  }

  protocol.handle("app", (request) => {
    const { pathname } = new URL(request.url);

    const filePath = path.join(
      app.getAppPath(),
      "public",
      decodeURIComponent(pathname),
    );

    return net.fetch(pathToFileURL(filePath).toString());
  });

  if (isAutoUpdateSupported()) {
    createSplashWindow();
  } else {
    createMainWindow();
  }
});

app.on("window-all-closed", () => {
  if (process.platform !== "darwin") app.quit();
});

app.on("before-quit", () => {
  globalShortcut.unregisterAll();
  if (updateCheckInterval) {
    clearInterval(updateCheckInterval);
    updateCheckInterval = null;
  }
});

// IPC Handlers (Translation Layer)
ipcMain.handle("minimize-window", () => {
  if (mainWindow) {
    mainWindow.minimize();
  }
});

ipcMain.handle("maximize-window", () => {
  if (mainWindow) {
    if (mainWindow.isMaximized()) {
      mainWindow.unmaximize();
    } else {
      mainWindow.maximize();
    }
  }
});

ipcMain.handle("close-window", () => {
  if (mainWindow) {
    mainWindow.close();
  }
});

ipcMain.handle("do-update", async () => {
  if (!mainWindow) {
    const log: UpdateLogPayload = {
      level: "error",
      message: "Cannot update: main window not available",
      timestamp: Date.now(),
    };
    emitUpdateLog(log);
    return log;
  }

  // If auto-update is supported and update is downloaded, quit and install
  if (isAutoUpdateSupported() && isUpdateDownloaded) {
    try {
      autoUpdater.quitAndInstall();
      return {
        level: "info",
        message: "Installing update...",
        timestamp: Date.now(),
      };
    } catch (error) {
      const log: UpdateLogPayload = {
        level: "error",
        message: `Failed to install update: ${error instanceof Error ? error.message : String(error)}`,
        details: serializeErrorDetails(error),
        timestamp: Date.now(),
      };
      emitUpdateLog(log);
      return log;
    }
  }

  // For Linux or if update not downloaded yet, open releases page
  const log: UpdateLogPayload = {
    level: "info",
    message:
      process.platform === "linux"
        ? "Auto-updates not supported on Linux. Opening releases page..."
        : "Update not ready. Opening releases page...",
    timestamp: Date.now(),
  };
  shell.openExternal(RELEASES_URL);
  return log;
});

ipcMain.handle("get-latest-update", async () => latestUpdatePayload);

// Calling
ipcMain.handle("electronMain:getScreenAccess", () =>
  isMediaAccessGranted("screen"),
);
ipcMain.handle("electronMain:getCameraAccess", () =>
  isMediaAccessGranted("camera"),
);
ipcMain.handle("electronMain:getMicrophoneAccess", () =>
  isMediaAccessGranted("microphone"),
);
ipcMain.handle("electronMain:screen:getSources", async () => {
  try {
    return await listScreenSources();
  } catch (error) {
    console.error("Failed to fetch screen sources:", error);
    const message = error instanceof Error ? error.message : String(error);
    throw new Error(`Failed to fetch screen sources: ${message}`);
  }
});
ipcMain.handle("electronMain:audio:getSources", async () => {
  try {
    return await listAudioSources();
  } catch (error) {
    console.error("Failed to fetch audio sources:", error);
    const message = error instanceof Error ? error.message : String(error);
    throw new Error(`Failed to fetch audio sources: ${message}`);
  }
});

ipcMain.handle("electronMain:audio:enumerateDevices", async () => {
  try {
    return { success: true };
  } catch (error) {
    console.error("Failed to enumerate audio devices:", error);
    return { success: false, error: String(error) };
  }
});

ipcMain.on(
  "update-shortcuts",
  (event, newShortcuts: Record<string, string>) => {
    try {
      console.log("[IPC] Updating shortcuts:", newShortcuts);
      globalShortcut.unregisterAll();
      shortcuts = newShortcuts;
      registerShortcuts(mainWindow);
      console.log("[IPC] Shortcuts updated successfully");
      event.reply("shortcuts-updated", { success: true });
    } catch (err) {
      console.error("[IPC] Failed to update shortcuts:", err);
      event.reply("shortcuts-updated", { success: false, error: String(err) });
    }
  },
);

// Platform info handler
ipcMain.handle("get-platform-info", () => {
  return {
    isLinux,
    isWayland,
    platform: process.platform,
  };
});
