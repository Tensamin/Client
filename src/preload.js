let { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('keyring', {
  set: (service, account, secret) =>
    ipcRenderer.invoke('keyring-set', { service, account, secret }),
  get: (service, account) =>
    ipcRenderer.invoke('keyring-get', { service, account }),
  delete: (service, account) =>
    ipcRenderer.invoke('keyring-delete', { service, account }),
});