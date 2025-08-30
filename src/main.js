const { app, protocol, BrowserWindow, ipcMain, net } = require("electron");
const path = require("path");
const keytar = require("keytar");
const { pathToFileURL } = require("url");

if (require("electron-squirrel-startup")) {
  app.quit();
}

const ROOT = path.resolve(__dirname, "..", "dist");

let mainWindow = null;

protocol.registerSchemesAsPrivileged([
  {
    scheme: "app",
    privileges: {
      standard: true,
      secure: true,
      supportFetchAPI: true,
    },
  },
]);

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1200,
    height: 800,
    frame: false,
    autoHideMenuBar: true,
    webPreferences: {
      preload: path.join(__dirname, "preload.js"),
      contextIsolation: true,
      nodeIntegration: false,
    },
  });

  mainWindow.loadURL("app://dist/index.html");

  mainWindow.on("maximize", () => {
    mainWindow?.webContents.send("window-maximized-changed", true);
  });
  mainWindow.on("unmaximize", () => {
    mainWindow?.webContents.send("window-maximized-changed", false);
  });
  mainWindow.on("closed", () => {
    mainWindow = null;
  });
}

app.on("window-all-closed", () => {
  if (process.platform !== "darwin") app.quit();
});

ipcMain.handle("keyring-set", async (event, { service, account, secret }) => {
  await keytar.setPassword(service, account, secret);
  return true;
});

ipcMain.handle("keyring-get", async (event, { service, account }) => {
  return keytar.getPassword(service, account);
});

ipcMain.handle("keyring-delete", async (event, { service, account }) => {
  return keytar.deletePassword(service, account);
});

ipcMain.on("window-minimize", () => {
  if (mainWindow && !mainWindow.isDestroyed()) {
    mainWindow.minimize();
  }
});

ipcMain.on("window-close", () => {
  if (mainWindow && !mainWindow.isDestroyed()) {
    mainWindow.close();
  }
});

ipcMain.on("window-toggle-maximize", () => {
  if (mainWindow && !mainWindow.isDestroyed()) {
    if (mainWindow.isMaximized()) mainWindow.unmaximize();
    else mainWindow.maximize();
  }
});

ipcMain.handle("window-is-maximized", () => {
  return Boolean(
    mainWindow && !mainWindow.isDestroyed() && mainWindow.isMaximized(),
  );
});

app.whenReady().then(() => {
  protocol.handle("app", (request) => {
    const url = new URL(request.url);
    if (url.hostname && url.hostname !== "dist") {
      return new Response("Not found", { status: 404 });
    }

    const rel = decodeURIComponent(url.pathname);
    const cleaned = rel.replace(/^\/+/, "");
    const fsPath = path.resolve(ROOT, cleaned);

    if (!fsPath.startsWith(ROOT + path.sep) && fsPath !== ROOT) {
      return new Response("Forbidden", { status: 403 });
    }

    return net.fetch(pathToFileURL(fsPath).toString());
  });

  createWindow();

  app.on("activate", () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow();
    }
  });
});
