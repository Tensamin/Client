let { app, protocol, BrowserWindow, ipcMain, net } = require("electron");
let path = require("path");
let keytar = require("keytar");
let { pathToFileURL } = require("url");
let { readFileSync } = require("fs");

let ROOT = path.resolve(__dirname, "..", "dist");

let mainWindow;
let preWindow;

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

function createWindow(url, width, height, resizable, window) {
  window = new BrowserWindow({
    icon: "app://dist/icon/icon.png",
    width: width,
    height: height,
    frame: false,
    resizable,
    autoHideMenuBar: true,
    transparent: true,
    webPreferences: {
      preload: path.join(__dirname, "preload.js"),
      contextIsolation: true,
      nodeIntegration: false,
    },
  });

  window.loadURL(url);

  window.on("maximize", () => {
    window?.webContents.send("window-maximized-changed", true);
  });
  window.on("unmaximize", () => {
    window?.webContents.send("window-maximized-changed", false);
  });
  window.on("closed", () => {
    window = null;
  });
};

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

app.whenReady().then(async () => {
  protocol.handle("app", (request) => {
    let url = new URL(request.url);
    if (url.hostname && url.hostname !== "dist") {
      return new Response("Not found", { status: 404 });
    };

    let rel = decodeURIComponent(url.pathname);
    let cleaned = rel.replace(/^\/+/, "");
    let fsPath = path.resolve(ROOT, cleaned);

    if (!fsPath.startsWith(ROOT + path.sep) && fsPath !== ROOT) {
      return new Response("Forbidden", { status: 403 });
    };

    return net.fetch(pathToFileURL(fsPath).toString());
  });

  createWindow('app://dist/starting.html', 515, 190, false, preWindow);

  let remote_packageJson = await fetch("https://raw.githubusercontent.com/Tensamin/Frontend/refs/heads/main/package.json").then(response => response.json());
  let local_packageJson = JSON.parse(readFileSync('./package.json'));

  mainWindow.close();

  if (local_packageJson.version === remote_packageJson.version) {
    let url = process.env.NODE_ENV === "development" ? "http://localhost:9161" : "app://dist/index.html";
    createWindow(url, 1280, 720, true, mainWindow);
    app.on("activate", () => {
      if (BrowserWindow.getAllWindows().length === 0) {
        createWindow(url, 1280, 720, true, mainWindow);
      }
    });
  } else {
    createWindow("app://dist/update.html", 515, 190, false, preWindow)
    console.log("New Version available!")
  };
});