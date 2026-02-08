const { contextBridge, ipcRenderer } = require("electron");

const UPDATE_AVAILABLE_CHANNEL = "app:update-available";
const UPDATE_LOG_CHANNEL = "app:update-log";

contextBridge.exposeInMainWorld("electronAPI", {
  minimize: () => ipcRenderer.invoke("minimize-window"),
  maximize: () => ipcRenderer.invoke("maximize-window"),
  close: () => ipcRenderer.invoke("close-window"),
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
  getAudioSources: () => ipcRenderer.invoke("electronMain:audio:getSources"),

  updateShortcuts: (shortcuts) => {
    console.log("[Preload] updateShortcuts called with:", shortcuts);
    ipcRenderer.send("update-shortcuts", shortcuts);
  },
  onShortcutsUpdated: (callback) => {
    console.log("[Preload] onShortcutsUpdated listener registered");
    if (typeof callback !== "function") {
      return () => undefined;
    }

    const subscription = (_event, payload) => {
      console.log("[Preload] shortcuts-updated event received:", payload);
      callback(payload);
    };
    ipcRenderer.on("shortcuts-updated", subscription);

    return () => {
      console.log("[Preload] onShortcutsUpdated listener removed");
      ipcRenderer.removeListener("shortcuts-updated", subscription);
    };
  },
  onShortcut: (action, callback) => {
    console.log(
      `[Preload] onShortcut listener registered for action: ${action}`,
    );
    if (typeof callback !== "function") {
      console.error(
        `[Preload] onShortcut called with non-function callback for action: ${action}`,
      );
      return () => undefined;
    }

    const subscription = (_event, payload) => {
      console.log(
        `[Preload] shortcut:${action} event received, payload:`,
        payload,
      );
      callback(payload);
    };
    ipcRenderer.on(`shortcut:${action}`, subscription);

    return () => {
      console.log(
        `[Preload] onShortcut listener removed for action: ${action}`,
      );
      ipcRenderer.removeListener(`shortcut:${action}`, subscription);
    };
  },
});
