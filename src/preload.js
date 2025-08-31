let { contextBridge, ipcRenderer } = require("electron");

contextBridge.exposeInMainWorld("keyring", {
  set: (service, account, secret) =>
    ipcRenderer.invoke("keyring-set", { service, account, secret }),
  get: (service, account) =>
    ipcRenderer.invoke("keyring-get", { service, account }),
  delete: (service, account) =>
    ipcRenderer.invoke("keyring-delete", { service, account }),
});

contextBridge.exposeInMainWorld("windowControls", {
  minimize: () => ipcRenderer.send("window-minimize"),
  close: () => ipcRenderer.send("window-close"),
  toggleMaximize: () => ipcRenderer.send("window-toggle-maximize"),
  // listen to maximize state changes; returns an unsubscribe function
  onMaximize: (cb) => {
    const listener = (e, isMaximized) => cb(isMaximized);
    ipcRenderer.on("window-maximized-changed", listener);
    return () =>
      ipcRenderer.removeListener("window-maximized-changed", listener);
  },
  isMaximized: () => ipcRenderer.invoke("window-is-maximized"),
});
