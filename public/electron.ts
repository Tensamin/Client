import { app, BrowserWindow, ipcMain, protocol, net } from "electron";
import * as path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

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

function createWindow() {
  const preloadPath = path.join(DIRNAME, "preload.js");

  mainWindow = new BrowserWindow({
    width: 1200,
    height: 800,
    frame: false,
    webPreferences: {
      preload: preloadPath,
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
