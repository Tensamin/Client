const { app, BrowserWindow, ipcMain } = require('electron');
const keytar = require('keytar');

if (require('electron-squirrel-startup')) {
  app.quit();
};

const createWindow = () => {
  const mainWindow = new BrowserWindow({
    width: 800,
    height: 600,
    webPreferences: {
    preload: TENSAMIN_PRELOAD_WEBPACK_ENTRY,
    },
  });
  mainWindow.loadURL(TENSAMIN_WEBPACK_ENTRY);
  mainWindow.webContents.openDevTools();
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
  createWindow();
  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow();
    }
  });
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});