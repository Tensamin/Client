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

let mainWindow: BrowserWindow | null = null;
let updateWindow: BrowserWindow | null = null;
let autoUpdaterLogsRegistered = false;

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
  [mainWindow, updateWindow].forEach((windowInstance) => {
    windowInstance?.webContents.send(UPDATE_LOG_CHANNEL, payload);
  });
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
      message: "Checking for updates",
      timestamp: Date.now(),
    });
  });

  autoUpdater.on("update-available", (info: UpdateInfo) => {
    const releaseDate = info.releaseDate
      ? new Date(info.releaseDate).getTime()
      : null;

    emitUpdateLog({
      level: "info",
      message: "Update available",
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
      message: "No updates available",
      details: {
        version: info.version ?? null,
      },
      timestamp: Date.now(),
    });
  });

  autoUpdater.on("download-progress", (progress: ProgressInfo) => {
    emitUpdateLog({
      level: "info",
      message: "Downloading update",
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
    emitUpdateLog({
      level: "info",
      message: "Update downloaded",
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
      message: "Auto updater error",
      details: serializeErrorDetails(error),
      timestamp: Date.now(),
    });
  });

  autoUpdaterLogsRegistered = true;
}

async function setupUpdateNotifications() {
  autoUpdater.autoDownload = true;
  registerAutoUpdaterLogging();

  const isDevelopment = process.env.NODE_ENV === "development";
  const artificialDelayMs = 3000;
  const delay = () =>
    new Promise((resolve) => setTimeout(resolve, artificialDelayMs));

  emitUpdateLog({
    level: "info",
    message: "Starting update check",
    timestamp: Date.now(),
  });

  if (isDevelopment) {
    emitUpdateLog({
      level: "info",
      message: `Development mode: delaying update flow by ${artificialDelayMs}ms`,
      timestamp: Date.now(),
    });
  }

  try {
    await autoUpdater.checkForUpdates();
    await delay();

    if (isDevelopment) {
      emitUpdateLog({
        level: "info",
        message: `Development mode: delaying post-check flow by ${artificialDelayMs}ms`,
        timestamp: Date.now(),
      });
    }

    emitUpdateLog({
      level: "info",
      message: "Update check finished",
      timestamp: Date.now(),
    });
  } catch (error) {
    emitUpdateLog({
      level: "error",
      message: "Update check failed",
      details: serializeErrorDetails(error),
      timestamp: Date.now(),
    });
  } finally {
    createWindow();
  }
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

    if (updateWindow) updateWindow?.close();

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
      message: "Update requested but main window is missing",
      timestamp: Date.now(),
    });
    return;
  }

  emitUpdateLog({
    level: "info",
    message: "Renderer requested update download",
    timestamp: Date.now(),
  });

  try {
    await autoUpdater.downloadUpdate();

    emitUpdateLog({
      level: "info",
      message: "Download finished, restarting to install",
      timestamp: Date.now(),
    });

    autoUpdater.quitAndInstall();
  } catch (error) {
    emitUpdateLog({
      level: "error",
      message: "Manual update download failed",
      details: serializeErrorDetails(error),
      timestamp: Date.now(),
    });
    throw error;
  }
});
