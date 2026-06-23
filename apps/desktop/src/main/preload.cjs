const { contextBridge, ipcRenderer } = require("electron");

contextBridge.exposeInMainWorld("minimalChatWindow", {
  minimize: () => ipcRenderer.invoke("window:minimize"),
  maximize: () => ipcRenderer.invoke("window:maximize"),
  close: () => ipcRenderer.invoke("window:close")
});

contextBridge.exposeInMainWorld("minimalChatApp", {
  openExternal: (url) => ipcRenderer.invoke("app:open-external", url)
});
