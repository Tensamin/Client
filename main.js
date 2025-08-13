import { app, BrowserWindow, shell } from 'electron';

function createWindow() {
  const win = new BrowserWindow({
    width: 1024,
    height: 768,
    show: false,
    backgroundColor: '#fff',
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true
      // path.join(__dirname, 'preload.js')
    }
  });

  win.loadURL('https://tensamin.methanium.net');

  win.once('ready-to-show', () => win.show());

  win.webContents.setWindowOpenHandler(({ url }) => {
    shell.openExternal(url);
    return { action: 'deny' };
  });

  win.webContents.on('will-navigate', (event, url) => {
    try {
      const requestedHost = new URL(url).host;
      const currentHost = new URL(win.webContents.getURL()).host;
      if (requestedHost && requestedHost !== currentHost) {
        event.preventDefault();
        shell.openExternal(url);
      }
    } catch (err) {
    }
  });

  // win.webContents.openDevTools();
}

app.whenReady().then(createWindow);

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit();
});

app.on('activate', () => {
  if (BrowserWindow.getAllWindows().length === 0) createWindow();
});