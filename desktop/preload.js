const { contextBridge, ipcRenderer } = require("electron");

const UPDATE_AVAILABLE_CHANNEL = "app:update-available";

contextBridge.exposeInMainWorld("electronAPI", {
  minimize: () => ipcRenderer.invoke("minimize-window"),
  maximize: () => ipcRenderer.invoke("maximize-window"),
  close: () => ipcRenderer.invoke("close-window"),
  onUpdateAvailable: (callback) => {
    if (typeof callback !== "function") {
      return () => undefined;
    }

    const subscription = (_event, payload) => callback(payload);
    ipcRenderer.on(UPDATE_AVAILABLE_CHANNEL, subscription);

    return () => {
      ipcRenderer.removeListener(UPDATE_AVAILABLE_CHANNEL, subscription);
    };
  },
});
