// Package Imports
import {
  app,
  autoUpdater,
  BrowserWindow,
  ipcMain,
  protocol,
  net,
  shell,
  systemPreferences,
  desktopCapturer,
} from "electron";
import * as path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
// @ts-expect-error Squirrel startup
import squirrelStartup from "electron-squirrel-startup";

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
}

function emitUpdateLog(payload: UpdateLogPayload) {
  mainWindow?.webContents.send(UPDATE_LOG_CHANNEL, payload);
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

async function withTimeout<T>(
  promise: Promise<T>,
  timeoutMs: number,
  timeoutMessage: string
) {
  let timeoutId: ReturnType<typeof setTimeout> | null = null;

  try {
    return await Promise.race([
      promise,
      new Promise<never>((_, reject) => {
        timeoutId = setTimeout(
          () => reject(new Error(timeoutMessage)),
          timeoutMs
        );
      }),
    ]);
  } finally {
    if (timeoutId) {
      clearTimeout(timeoutId);
    }
  }
}

// Main
const FILENAME = fileURLToPath(import.meta.url);
const DIRNAME = path.dirname(FILENAME);
const RELEASES_URL = "https://github.com/Tensamin/Frontend/releases";
const UPDATE_AVAILABLE_CHANNEL = "app:update-available";
const UPDATE_LOG_CHANNEL = "app:update-log";
//const UPDATE_CHECK_INTERVAL_MS = 5 * 1000; // 5 seconds
const UPDATE_CHECK_INTERVAL_MS = 60 * 60 * 1000; // 1 hour

let mainWindow: BrowserWindow | null = null;
let latestUpdatePayload: UpdatePayload | null = null;
let updateCheckInterval: ReturnType<typeof setInterval> | null = null;
let isUpdateDownloaded = false;

// Squirrel Startup Handling
if (squirrelStartup) app.quit();

// Force Wayland and PipeWire on Linux
if (process.platform === "linux") {
  app.commandLine.appendSwitch(
    "enable-features",
    "UseOzonePlatform,WebRTCPipeWireCapturer"
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

// Serup auto updater
function setupAutoUpdater() {
  if (!isAutoUpdateSupported()) {
    console.log(
      `Auto-updates not supported on ${process.platform}. Users will be directed to manual download.`
    );
    return;
  }

  try {
    const server = "https://update.electronjs.org";
    const feed = `${server}/Tensamin/Frontend/${process.platform}-${process.arch}/${app.getVersion()}`;
    autoUpdater.setFeedURL({
      url: feed,
    });

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
      }
    );

    // Check for updates immediately
    autoUpdater.checkForUpdates();

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

function createWindow() {
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

  const url =
    process.env.NODE_ENV === "development"
      ? "http://localhost:3000"
      : "app://./index.html";

  mainWindow.loadURL(url);

  mainWindow.on("ready-to-show", () => {
    mainWindow?.show();
    setupAutoUpdater();
  });

  mainWindow.webContents.on("did-finish-load", () => {
    if (mainWindow) {
      if (latestUpdatePayload) {
        mainWindow.webContents.send(
          UPDATE_AVAILABLE_CHANNEL,
          latestUpdatePayload
        );
      }
    }
  });

  mainWindow.on("closed", () => {
    mainWindow = null;
  });
}

app.whenReady().then(() => {
  const ozonePlatform =
    app.commandLine.getSwitchValue("ozone-platform") ||
    process.env.ELECTRON_OZONE_PLATFORM_HINT;
  const isWayland =
    ozonePlatform === "wayland" ||
    (ozonePlatform === "auto" && !!process.env.WAYLAND_DISPLAY);
  const platform = isWayland ? "Wayland" : "X11";
  const color = isWayland ? "\x1b[32m" : "\x1b[33m"; // Wayland: green, x11: yellow
  const reset = "\x1b[0m";

  console.log(`${color}[INFO] Running with ${platform}${reset}`);

  protocol.handle("app", (request) => {
    const { pathname } = new URL(request.url);
    const filePath = path.join(DIRNAME, decodeURIComponent(pathname));

    return net.fetch(pathToFileURL(filePath).toString());
  });

  createWindow();
});

app.on("window-all-closed", () => {
  if (process.platform !== "darwin") app.quit();
});

app.on("before-quit", () => {
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

ipcMain.handle("open-link", async (_event, url: string) => {
  shell.openExternal(url);
});

// Calling
ipcMain.handle("electronMain:getScreenAccess", () =>
  isMediaAccessGranted("screen")
);
ipcMain.handle("electronMain:getCameraAccess", () =>
  isMediaAccessGranted("camera")
);
ipcMain.handle("electronMain:getMicrophoneAccess", () =>
  isMediaAccessGranted("microphone")
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
