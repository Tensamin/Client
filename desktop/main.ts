// Package Imports
import { app, BrowserWindow, ipcMain, protocol, net, shell } from "electron";
import type { ProgressInfo, UpdateInfo } from "electron-updater";
import electronUpdater from "electron-updater";
// @ts-expect-error Import shows an error when the preload.js is not open
import squirrelStartup from "electron-squirrel-startup";

// Node Imports
import * as path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import * as fs from "node:fs";

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
const UPDATE_CHECK_INTERVAL_MS = 5000; // 5 seconds
//const UPDATE_CHECK_INTERVAL_MS = 60 * 60 * 1000; // 1 hour

let mainWindow: BrowserWindow | null = null;
let updateWindow: BrowserWindow | null = null;
let autoUpdaterLogsRegistered = false;
let updateCheckInterval: ReturnType<typeof setInterval> | null = null;
let pendingUpdate = false;
let latestUpdatePayload: UpdatePayload | null = null;

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

function ensureAppUpdateYml() {
  try {
    const resourcesPath =
      process.resourcesPath || app.getAppPath();

    const yamlLines = [
      "provider: generic",
      `url: ${RELEASES_URL}`,
      "useMultipleRangeRequest: false",
      "channel: latest",
      `updaterCacheDirName: ${JSON.stringify(app.getName())}`,
    ];

    const yaml = yamlLines.join("\n");

    const updateFile = path.join(resourcesPath, "app-update.yml");
    const devUpdateFile = path.join(resourcesPath, "dev-app-update.yml");
    const checkFiles = [updateFile, devUpdateFile];

    for (const filePath of checkFiles) {
      if (!fs.existsSync(filePath)) {
        fs.writeFileSync(filePath, yaml, { encoding: "utf8" });
        emitUpdateLog({
          level: "info",
          message: `Created missing update file: ${filePath}`,
          timestamp: Date.now(),
        });
      }
    }
  } catch (error) {
    emitUpdateLog({
      level: "error",
      message: `Failed to create app-update.yml: ${error instanceof Error ? error.message : String(error)
        }`,
      details: serializeErrorDetails(error),
      timestamp: Date.now(),
    });
  }
}

function emitUpdateAvailable(payload: UpdatePayload) {
  latestUpdatePayload = payload;

  [mainWindow, updateWindow].forEach((windowInstance) => {
    windowInstance?.webContents.send(UPDATE_AVAILABLE_CHANNEL, payload);
  });
}

function emitUpdateLog(payload: UpdateLogPayload) {
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
  const isLinux = process.platform === "linux";
  autoUpdater.autoDownload = !isLinux;
  autoUpdater.autoInstallOnAppQuit = !isLinux;
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
    return;
  }

  try {
    emitUpdateLog({
      level: "info",
      message: "Connecting to update server...",
      timestamp: Date.now(),
    });

    await autoUpdater.checkForUpdates();
  } catch (error) {
    emitUpdateLog({
      level: "error",
      message: `Update check failed: ${error instanceof Error ? error.message : String(error)}`,
      details: serializeErrorDetails(error),
      timestamp: Date.now(),
    });
  }

  if (updateCheckInterval) {
    clearInterval(updateCheckInterval);
  }

  updateCheckInterval = setInterval(async () => {
    if (process.env.NODE_ENV === "development") {
      emitUpdateLog({
        level: "info",
        message: "Updates disabled in development mode",
        timestamp: Date.now(),
      });
      return;
    }

    emitUpdateLog({
      level: "info",
      message: "Running scheduled update check...",
      timestamp: Date.now(),
    });

    try {
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
    setupUpdateNotifications();

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
  ensureAppUpdateYml();
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
    const log = {
      level: "error",
      message: "Cannot update: main window not available",
      timestamp: Date.now(),
    } satisfies UpdateLogPayload;
    emitUpdateLog(log);
    return log;
  }

  if (process.platform === "linux") {
    const log = {
      level: "info",
      message:
        "On linux, please use your package manager or download the update manually from the releases page",
      timestamp: Date.now(),
    } satisfies UpdateLogPayload;
    emitUpdateLog(log);
    return log;
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

ipcMain.handle("get-update-logs", async () => logHistory);

ipcMain.handle("get-latest-update", async () => latestUpdatePayload);

ipcMain.handle("open-link", async (_event, url: string) => {
  shell.openExternal(url);
});
