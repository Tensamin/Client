// Package Imports
import { app, BrowserWindow, ipcMain, protocol, net } from "electron";
import type { ProgressInfo, UpdateInfo } from "electron-updater";
import electronUpdater from "electron-updater";
// @ts-expect-error Import shows an error when the preload.js is not open
import squirrelStartup from "electron-squirrel-startup";

// Node Imports
import * as path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

// Types
type UpdatePayload = {
  version: string | null;
  releaseName: string | null;
  releaseNotes: UpdateInfo["releaseNotes"] | null;
  releaseDate: number | null;
  url: string;
};

type UpdateLogPayload = {
  level: "info" | "error";
  message: string;
  details?: Record<string, unknown>;
  timestamp: number;
};

// Main
const FILENAME = fileURLToPath(import.meta.url);
const DIRNAME = path.dirname(FILENAME);
const RELEASES_URL = "https://github.com/Tensamin/Frontend/releases";
const UPDATE_AVAILABLE_CHANNEL = "app:update-available";
const UPDATE_LOG_CHANNEL = "app:update-log";
const UPDATE_CHECK_INTERVAL_MS = 60 * 60 * 1000; // 1 hour

let mainWindow: BrowserWindow | null = null;
let updateWindow: BrowserWindow | null = null;
let autoUpdaterLogsRegistered = false;
let updateCheckInterval: ReturnType<typeof setInterval> | null = null;
let pendingUpdate = false;

// Log history for replaying to new windows
const logHistory: UpdateLogPayload[] = [];

// Squirrel Startup Handling
if (squirrelStartup) app.quit();

// Setup Electron Updater
const { autoUpdater } = electronUpdater;

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

function emitUpdateAvailable(payload: UpdatePayload) {
  if (!mainWindow) {
    return;
  }

  mainWindow.webContents.send(UPDATE_AVAILABLE_CHANNEL, payload);
}

function emitUpdateLog(payload: UpdateLogPayload) {
  // Store in history for replaying to new windows
  logHistory.push(payload);
  if (logHistory.length > 100) {
    logHistory.shift();
  }

  [mainWindow, updateWindow].forEach((windowInstance) => {
    windowInstance?.webContents.send(UPDATE_LOG_CHANNEL, payload);
  });
}

function replayLogHistory(window: BrowserWindow) {
  logHistory.forEach((log) => {
    window.webContents.send(UPDATE_LOG_CHANNEL, log);
  });
}

function formatBytes(bytes: number): string {
  if (bytes === 0) return "0 B";
  const k = 1024;
  const sizes = ["B", "KB", "MB", "GB"];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(1))} ${sizes[i]}`;
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

function registerAutoUpdaterLogging() {
  if (autoUpdaterLogsRegistered) {
    return;
  }

  autoUpdater.on("checking-for-update", () => {
    emitUpdateLog({
      level: "info",
      message: "Checking for updates...",
      timestamp: Date.now(),
    });
  });

  autoUpdater.on("update-available", (info: UpdateInfo) => {
    const releaseDate = info.releaseDate
      ? new Date(info.releaseDate).getTime()
      : null;

    emitUpdateLog({
      level: "info",
      message: `Update v${info.version} available`,
      details: {
        version: info.version ?? null,
        releaseName: info.releaseName ?? null,
        releaseDate,
      },
      timestamp: Date.now(),
    });

    emitUpdateAvailable({
      version: info.version ?? null,
      releaseName: info.releaseName ?? null,
      releaseNotes: info.releaseNotes ?? null,
      releaseDate,
      url: RELEASES_URL,
    });
  });

  autoUpdater.on("update-not-available", (info: UpdateInfo) => {
    emitUpdateLog({
      level: "info",
      message: `App is up to date (v${info.version})`,
      details: {
        version: info.version ?? null,
      },
      timestamp: Date.now(),
    });
  });

  autoUpdater.on("download-progress", (progress: ProgressInfo) => {
    const percent = Math.round(progress.percent);
    const transferred = formatBytes(progress.transferred);
    const total = formatBytes(progress.total);
    const speed = formatBytes(progress.bytesPerSecond);

    emitUpdateLog({
      level: "info",
      message: `Downloading: ${percent}% (${transferred}/${total} @ ${speed}/s)`,
      details: {
        percent: progress.percent,
        transferred: progress.transferred,
        total: progress.total,
        bytesPerSecond: progress.bytesPerSecond,
      },
      timestamp: Date.now(),
    });
  });

  autoUpdater.on("update-downloaded", (info: UpdateInfo) => {
    pendingUpdate = true;
    emitUpdateLog({
      level: "info",
      message: `Update v${info.version} ready to install`,
      details: {
        version: info.version ?? null,
        releaseName: info.releaseName ?? null,
      },
      timestamp: Date.now(),
    });
  });

  autoUpdater.on("error", (error: Error) => {
    emitUpdateLog({
      level: "error",
      message: `Update error: ${error.message}`,
      details: serializeErrorDetails(error),
      timestamp: Date.now(),
    });
  });

  autoUpdaterLogsRegistered = true;
}

async function setupUpdateNotifications() {
  autoUpdater.autoDownload = true;
  autoUpdater.autoInstallOnAppQuit = true;
  registerAutoUpdaterLogging();

  const isDevelopment = process.env.NODE_ENV === "development";

  emitUpdateLog({
    level: "info",
    message: "Initializing update system...",
    timestamp: Date.now(),
  });

  if (isDevelopment) {
    emitUpdateLog({
      level: "info",
      message: "Development mode: simulating update check",
      timestamp: Date.now(),
    });
    // In development, skip the actual update check and just open main window
    await new Promise((resolve) => setTimeout(resolve, 1500));
    emitUpdateLog({
      level: "info",
      message: "Starting application...",
      timestamp: Date.now(),
    });
    createWindow();
    return;
  }

  try {
    emitUpdateLog({
      level: "info",
      message: "Connecting to update server...",
      timestamp: Date.now(),
    });

    const result = await autoUpdater.checkForUpdates();

    if (result?.updateInfo) {
      const currentVersion = app.getVersion();
      const latestVersion = result.updateInfo.version;

      if (currentVersion !== latestVersion) {
        emitUpdateLog({
          level: "info",
          message: `Downloading update v${latestVersion}...`,
          timestamp: Date.now(),
        });
        // autoDownload is true, so it will download automatically
        // Wait for download to complete before opening main window
        await new Promise<void>((resolve) => {
          const onDownloaded = () => {
            autoUpdater.off("update-downloaded", onDownloaded);
            autoUpdater.off("error", onError);
            resolve();
          };
          const onError = () => {
            autoUpdater.off("update-downloaded", onDownloaded);
            autoUpdater.off("error", onError);
            resolve();
          };
          autoUpdater.on("update-downloaded", onDownloaded);
          autoUpdater.on("error", onError);
        });

        // If update downloaded successfully, install and relaunch
        if (pendingUpdate) {
          emitUpdateLog({
            level: "info",
            message: "Installing update and restarting...",
            timestamp: Date.now(),
          });
          await new Promise((resolve) => setTimeout(resolve, 1000));
          autoUpdater.quitAndInstall(false, true);
          return;
        }
      }
    }

    emitUpdateLog({
      level: "info",
      message: "Starting application...",
      timestamp: Date.now(),
    });
  } catch (error) {
    emitUpdateLog({
      level: "error",
      message: `Update check failed: ${error instanceof Error ? error.message : String(error)}`,
      details: serializeErrorDetails(error),
      timestamp: Date.now(),
    });
    emitUpdateLog({
      level: "info",
      message: "Starting application...",
      timestamp: Date.now(),
    });
  }

  // Start the main window
  createWindow();

  // Start hourly update checks
  startBackgroundUpdateChecks();
}

function startBackgroundUpdateChecks() {
  if (updateCheckInterval) {
    clearInterval(updateCheckInterval);
  }

  updateCheckInterval = setInterval(async () => {
    if (process.env.NODE_ENV === "development") {
      return;
    }

    emitUpdateLog({
      level: "info",
      message: "Running scheduled update check...",
      timestamp: Date.now(),
    });

    try {
      // This will automatically download if an update is available (autoDownload = true)
      // and autoInstallOnAppQuit = true will install it when the app closes
      await autoUpdater.checkForUpdates();
    } catch (error) {
      emitUpdateLog({
        level: "error",
        message: `Scheduled update check failed: ${error instanceof Error ? error.message : String(error)}`,
        details: serializeErrorDetails(error),
        timestamp: Date.now(),
      });
    }
  }, UPDATE_CHECK_INTERVAL_MS);
}

function createUpdateWindow() {
  updateWindow = new BrowserWindow({
    width: 290,
    height: 360,
    resizable: false,
    center: true,
    frame: false,
    icon: "app://./assets/app/web-app-manifest-512x512.png",
    webPreferences: {
      preload: path.join(app.getAppPath(), "preload.js"),
      nodeIntegration: false,
      contextIsolation: true,
    },
  });

  const url =
    process.env.NODE_ENV === "development"
      ? "http://localhost:3000/update"
      : "app://./update.html";

  updateWindow.loadURL(url);

  updateWindow.webContents.on("did-finish-load", () => {
    if (updateWindow) {
      replayLogHistory(updateWindow);
    }
  });

  updateWindow.on("closed", () => {
    updateWindow = null;
  });
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

    if (updateWindow) {
      updateWindow.close();
    }

    if (process.env.NODE_ENV === "development") {
      emitUpdateAvailable({
        version: "v0.0.0",
        releaseName: "Development Release",
        releaseNotes: "Fake update payload rendered only in development.",
        releaseDate: new Date().getTime(),
        url: RELEASES_URL,
      });
    }
  });

  mainWindow.webContents.on("did-finish-load", () => {
    if (mainWindow) {
      replayLogHistory(mainWindow);
    }
  });

  mainWindow.on("closed", () => {
    mainWindow = null;
  });
}

app.whenReady().then(() => {
  const args = process.argv.slice(2);

  protocol.handle("app", (request) => {
    const { pathname } = new URL(request.url);
    const filePath = path.join(DIRNAME, decodeURIComponent(pathname));

    return net.fetch(pathToFileURL(filePath).toString());
  });

  console.log("Provided Arguments:", args, process.argv);
  if (!args.includes("--disable-updates")) {
    createUpdateWindow();
    setupUpdateNotifications();
    return;
  }
  createWindow();
});

app.on("window-all-closed", () => {
  if (process.platform !== "darwin") app.quit();
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
    emitUpdateLog({
      level: "error",
      message: "Cannot update: main window not available",
      timestamp: Date.now(),
    });
    return;
  }

  emitUpdateLog({
    level: "info",
    message: "Manual update requested...",
    timestamp: Date.now(),
  });

  try {
    if (pendingUpdate) {
      emitUpdateLog({
        level: "info",
        message: "Installing update and restarting...",
        timestamp: Date.now(),
      });
      autoUpdater.quitAndInstall(false, true);
      return;
    }

    await autoUpdater.downloadUpdate();

    emitUpdateLog({
      level: "info",
      message: "Download complete, restarting to install...",
      timestamp: Date.now(),
    });

    autoUpdater.quitAndInstall(false, true);
  } catch (error) {
    emitUpdateLog({
      level: "error",
      message: `Update failed: ${error instanceof Error ? error.message : String(error)}`,
      details: serializeErrorDetails(error),
      timestamp: Date.now(),
    });
    throw error;
  }
});
