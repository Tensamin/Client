import {
  app,
  BrowserWindow,
  ipcMain,
  protocol,
  net,
  Notification,
  shell,
} from "electron";
import * as path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

// Handle squirrel
import squirrelStartup from "electron-squirrel-startup";
if (squirrelStartup) app.quit();

import { autoUpdater } from "electron-updater";

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

function setupUpdateNotifications() {
  if (process.platform === "linux") {
    return;
  }

  autoUpdater.autoDownload = false;

  autoUpdater.on("update-available", (info) => {
    if (!Notification.isSupported()) {
      return;
    }

    const versionLabel = info.version
      ? `Tensamin v${info.version} is available.`
      : "A new Tensamin update is available.";

    const notification = new Notification({
      title: "Update available",
      body: `${versionLabel} Click to open the latest release.`,
    });

    const openReleases = () => {
      shell.openExternal(RELEASES_URL).catch((error) => {
        console.error("Failed to open releases page:", error);
      });
    };

    notification.on("click", openReleases);
    notification.on("action", openReleases);

    notification.show();
  });

  autoUpdater.on("error", (error) => {
    console.error("Auto-update error:", error);
  });

  autoUpdater.checkForUpdates().catch((error) => {
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

  mainWindow.loadURL("app://./index.html");

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
