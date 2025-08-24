let { app, protocol, BrowserWindow, ipcMain, net } = require('electron');
let path = require('path');
let keytar = require('keytar');
let { pathToFileURL } = require('url');

if (require('electron-squirrel-startup')) {
  app.quit();
};

let ROOT = path.resolve(__dirname, '..', 'dist');

protocol.registerSchemesAsPrivileged([
  {
    scheme: 'app',
    privileges: {
      standard: true,
      secure: true,
      supportFetchAPI: true,
    },
  },
]);

let createWindow = () => {
  let mainWindow = new BrowserWindow({
    width: 800,
    height: 600,
    frame: false,
    autoHideMenuBar: true,
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false,
    },
  });
  mainWindow.loadURL('app://dist/index.html');
};

ipcMain.handle('keyring-set', async (event, { service, account, secret }) => {
  await keytar.setPassword(service, account, secret);
  return true;
});

ipcMain.handle('keyring-get', async (event, { service, account }) => {
  return keytar.getPassword(service, account);
});

ipcMain.handle('keyring-delete', async (event, { service, account }) => {
  return keytar.deletePassword(service, account);
});

app.whenReady().then(() => {
  protocol.handle('app', (request) => {
    let url = new URL(request.url);
    if (url.hostname && url.hostname !== 'dist') {
      return new Response('Not found', { status: 404 });
    };

    let rel = decodeURIComponent(url.pathname);
    let cleaned = rel.replace(/^\/+/, '');
    let fsPath = path.resolve(ROOT, cleaned);

    if (!fsPath.startsWith(ROOT + path.sep) && fsPath !== ROOT) {
      return new Response('Forbidden', { status: 403 });
    };

    return net.fetch(pathToFileURL(fsPath).toString());
  })

  createWindow();
  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow();
    };
  });
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});