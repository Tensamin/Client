import { app, BrowserWindow, ipcMain, protocol, net } from "electron";
import * as path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

// Handle squirrel
import squirrelStartup from "electron-squirrel-startup";
if (squirrelStartup) app.quit();

// why is commonjs like this?
import pkg from "electron-updater";
const { autoUpdater } = pkg;
import type { UpdateInfo } from "electron-updater";

// Main
const FILENAME = fileURLToPath(import.meta.url);
const DIRNAME = path.dirname(FILENAME);

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

let mainWindow: BrowserWindow | null = null;
const RELEASES_URL = "https://github.com/Tensamin/Frontend/releases";
const UPDATE_AVAILABLE_CHANNEL = "app:update-available";

type UpdatePayload = {
  version: string | null;
  releaseName: string | null;
  releaseNotes: UpdateInfo["releaseNotes"] | null;
  releaseDate: string | null;
  url: string;
  mock?: boolean;
};

function emitUpdateAvailable(payload: UpdatePayload) {
  if (!mainWindow) {
    return;
  }

  mainWindow.webContents.send(UPDATE_AVAILABLE_CHANNEL, payload);
}

function setupUpdateNotifications() {
  if (process.platform === "linux") {
    return;
  }

  if (!app.isPackaged) {
    emitUpdateAvailable({
      version: "dev-template",
      releaseName: "Development build",
      releaseNotes: "Fake update payload rendered only in development.",
      releaseDate: new Date().toISOString(),
      url: RELEASES_URL,
      mock: true,
    });
    return;
  }

  autoUpdater.autoDownload = false;

  autoUpdater.on("update-available", (info: UpdateInfo) => {
    emitUpdateAvailable({
      version: info.version ?? null,
      releaseName: info.releaseName ?? null,
      releaseNotes: info.releaseNotes ?? null,
      releaseDate: info.releaseDate ?? null,
      url: RELEASES_URL,
    });
  });

  autoUpdater.on("error", (error: Error) => {
    console.error("Auto-update error:", error);
  });

  autoUpdater.checkForUpdates().catch((error: Error) => {
    console.error("Failed to check for updates:", error);
  });
}

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1200,
    height: 800,
    frame: false,
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

  mainWindow.on("closed", () => {
    mainWindow = null;
  });
}

app.whenReady().then(() => {
  protocol.handle("app", (request) => {
    const { pathname } = new URL(request.url);
    const filePath = path.join(DIRNAME, decodeURIComponent(pathname));

    return net.fetch(pathToFileURL(filePath).toString());
  });

  createWindow();
  setupUpdateNotifications();
});

app.on("window-all-closed", () => {
  if (process.platform !== "darwin") app.quit();
});

app.on("activate", () => {
  if (BrowserWindow.getAllWindows().length === 0) createWindow();
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
