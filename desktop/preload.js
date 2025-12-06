const { contextBridge, ipcRenderer } = require("electron");

const UPDATE_AVAILABLE_CHANNEL = "app:update-available";
const UPDATE_LOG_CHANNEL = "app:update-log";

contextBridge.exposeInMainWorld("electronAPI", {
  minimize: () => ipcRenderer.invoke("minimize-window"),
  maximize: () => ipcRenderer.invoke("maximize-window"),
  close: () => ipcRenderer.invoke("close-window"),
  openLink: (url) => ipcRenderer.invoke("open-link", url),
  getLatestUpdate: () => ipcRenderer.invoke("get-latest-update"),
  doUpdate: () => ipcRenderer.invoke("do-update"),
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
  onUpdateLog: (callback) => {
    if (typeof callback !== "function") {
      return () => undefined;
    }

    const subscription = (_event, payload) => callback(payload);
    ipcRenderer.on(UPDATE_LOG_CHANNEL, subscription);

    return () => {
      ipcRenderer.removeListener(UPDATE_LOG_CHANNEL, subscription);
    };
  },

  getMicrophoneAccess: () =>
    ipcRenderer.invoke("electronMain:getMicrophoneAccess"),
  getCameraAccess: () => ipcRenderer.invoke("electronMain:getCameraAccess"),
  getScreenAccess: () => ipcRenderer.invoke("electronMain:getScreenAccess"),
  getScreenSources: () => ipcRenderer.invoke("electronMain:screen:getSources"),
});
