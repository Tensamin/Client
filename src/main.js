let { app, protocol, BrowserWindow, ipcMain, net } = require("electron");
let path = require("path");
let keytar = require("keytar");
let { pathToFileURL } = require("url");

if (require("electron-squirrel-startup")) {
  app.quit();
}

let ROOT = path.resolve(__dirname, "..", "dist");

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
    icon: "app://dist/icon/icon.png",
    width: 1280,
    height: 720,
    frame: false,
    autoHideMenuBar: true,
    transparent: true,
    webPreferences: {
      preload: path.join(__dirname, "preload.js"),
      contextIsolation: true,
      nodeIntegration: false,
    },
  });

  let url =
    process.env.NODE_ENV === "development"
      ? "https://ma-at-home.hackrland.dev"
      : "app://dist/index.html";
  mainWindow.loadURL(url);

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
    let url = new URL(request.url);
    if (url.hostname && url.hostname !== "dist") {
      return new Response("Not found", { status: 404 });
    }

    let rel = decodeURIComponent(url.pathname);
    let cleaned = rel.replace(/^\/+/, "");
    let fsPath = path.resolve(ROOT, cleaned);

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
