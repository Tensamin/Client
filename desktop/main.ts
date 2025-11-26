// Package Imports
import { app, BrowserWindow, ipcMain, protocol, net, shell } from "electron";
import updateElectronApp from "update-electron-app";
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
let pendingUpdate = false;
let latestUpdatePayload: UpdatePayload | null = null;

// Log history for replaying to new windows
const logHistory: UpdateLogPayload[] = [];

// Squirrel Startup Handling
if (squirrelStartup) app.quit();

// Setup Electron Updater (replaced by update-electron-app)

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

function registerUpdateElectronApp() {
  try {
    updateElectronApp({
      repo: "Tensamin/Frontend",
      updateInterval: `${Math.max(5, Math.floor(UPDATE_CHECK_INTERVAL_MS / 1000))} seconds`,
      logger: {
        info: (msg: unknown) =>
          emitUpdateLog({ level: "info", message: String(msg), timestamp: Date.now() }),
        warn: (msg: unknown) =>
          emitUpdateLog({ level: "info", message: String(msg), timestamp: Date.now() }),
        error: (msg: unknown) =>
          emitUpdateLog({ level: "error", message: String(msg), timestamp: Date.now() }),
      },
    });

    emitUpdateLog({ level: "info", message: "Update service initialized", timestamp: Date.now() });
  } catch (error) {
    emitUpdateLog({
      level: "error",
      message: `Failed to initialize update service: ${error instanceof Error ? error.message : String(error)}`,
      details: serializeErrorDetails(error),
      timestamp: Date.now(),
    });
  }
}

async function setupUpdateNotifications() {
  const isLinux = process.platform === "linux";
  registerUpdateElectronApp();

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

  emitUpdateLog({ level: "info", message: "Update integration active", timestamp: Date.now() });
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
  // No active interval to clear when using `update-electron-app`.
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
  emitUpdateLog({ level: "info", message: "Opening releases page for update...", timestamp: Date.now() });
  shell.openExternal(RELEASES_URL);
});

ipcMain.handle("get-update-logs", async () => logHistory);

ipcMain.handle("get-latest-update", async () => latestUpdatePayload);

ipcMain.handle("open-link", async (_event, url: string) => {
  shell.openExternal(url);
});
