import { app, BrowserWindow } from "electron";
import * as path from "node:path";

let mainWindow;

const createWindow = () => {
  const basePath = app.isPackaged ? process.resourcesPath : app.getAppPath();
  const distPath = path.join(basePath, "build");
  const preloadPath = path.join(distPath, "build/preload.js");

  mainWindow = new BrowserWindow({
    width: 1280,
    height: 800,
    webPreferences: {
      preload: preloadPath,
      contextIsolation: true,
      nodeIntegration: false,
    },
  });

  mainWindow.loadFile(path.join(distPath, "index.html"));

  mainWindow.on("closed", () => {
    mainWindow = null;
  });
};

app.on("ready", createWindow);

app.on("window-all-closed", () => {
  if (process.platform !== "darwin") app.quit();
});

app.on("activate", () => {
  if (mainWindow === null) createWindow();
});
