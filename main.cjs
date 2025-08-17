let { app, BrowserWindow, shell, ipcMain } = require('electron');
let path = require('path');
let keytar = require("keytar");

if (require('electron-squirrel-startup')) app.quit();

console.log(__dirname)

function createWindow() {
  let win = new BrowserWindow({
    width: 1024,
    height: 768,
    show: false,
    frame: false,
    autoHideMenuBar: true,
    backgroundColor: '#fff',
    webPreferences: {
      preload: path.join(__dirname + '/preload.js'),
      contextIsolation: true,
      nodeIntegration: false
    }
  });

  win.loadURL('https://tensamin.methanium.net');
  // win.loadURL('https://ma-at-home.hackrland.dev');

  win.once('ready-to-show', () => win.show());

  win.webContents.setWindowOpenHandler(({ url }) => {
    shell.openExternal(url);
    return { action: 'deny' };
  });

  win.webContents.on('will-navigate', (event, url) => {
    try {
      let requestedHost = new URL(url).host;
      let currentHost = new URL(win.webContents.getURL()).host;
      if (requestedHost && requestedHost !== currentHost) {
        event.preventDefault();
        shell.openExternal(url);
      }
    } catch (err) { }
  });

  // win.webContents.openDevTools();
}

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

app.whenReady().then(createWindow);

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit();
});

app.on('activate', () => {
  if (BrowserWindow.getAllWindows().length === 0) createWindow();
});