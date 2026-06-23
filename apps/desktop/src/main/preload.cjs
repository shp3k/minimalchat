const { contextBridge, ipcRenderer } = require("electron");

contextBridge.exposeInMainWorld("minimalChatWindow", {
  minimize: () => ipcRenderer.invoke("window:minimize"),
  maximize: () => ipcRenderer.invoke("window:maximize"),
  close: () => ipcRenderer.invoke("window:close")
});

contextBridge.exposeInMainWorld("minimalChatApp", {
  openExternal: (url) => ipcRenderer.invoke("app:open-external", url)
});

contextBridge.exposeInMainWorld("minimalChatClipboard", {
  readText: () => ipcRenderer.invoke("clipboard:read-text"),
  writeText: (value) => ipcRenderer.invoke("clipboard:write-text", value)
});

contextBridge.exposeInMainWorld("minimalChatNotifications", {
  showMessage: (payload) => ipcRenderer.invoke("notification:show-message", payload),
  onMessageClick: (callback) => {
    const listener = (_event, payload) => callback(payload);
    ipcRenderer.on("notification:message-click", listener);
    return () => ipcRenderer.removeListener("notification:message-click", listener);
  }
});
