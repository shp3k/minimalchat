const { contextBridge, ipcRenderer } = require("electron");

contextBridge.exposeInMainWorld("minimalChatWindow", {
  minimize: () => ipcRenderer.invoke("window:minimize"),
  maximize: () => ipcRenderer.invoke("window:maximize"),
  close: () => ipcRenderer.invoke("window:close")
});

contextBridge.exposeInMainWorld("minimalChatApp", {
  openExternal: (url) => ipcRenderer.invoke("app:open-external", url),
  getVersion: () => ipcRenderer.invoke("app:get-version"),
  setUnreadCount: (count) => ipcRenderer.invoke("app:set-unread-count", count)
});

contextBridge.exposeInMainWorld("minimalChatClipboard", {
  readText: () => ipcRenderer.invoke("clipboard:read-text"),
  readImage: () => ipcRenderer.invoke("clipboard:read-image"),
  writeText: (value) => ipcRenderer.invoke("clipboard:write-text", value),
  writeImage: (url) => ipcRenderer.invoke("clipboard:write-image", url)
});

contextBridge.exposeInMainWorld("minimalChatNotifications", {
  showMessage: (payload) => ipcRenderer.invoke("notification:show-message", payload),
  onMessageClick: (callback) => {
    const listener = (_event, payload) => callback(payload);
    ipcRenderer.on("notification:message-click", listener);
    return () => ipcRenderer.removeListener("notification:message-click", listener);
  }
});

contextBridge.exposeInMainWorld("minimalChatUpdates", {
  check: () => ipcRenderer.invoke("updates:check"),
  install: () => ipcRenderer.invoke("updates:install"),
  onStatus: (handler) => {
    const listener = (_event, status) => handler(status);
    ipcRenderer.on("updates:status", listener);
    return () => ipcRenderer.removeListener("updates:status", listener);
  }
});
