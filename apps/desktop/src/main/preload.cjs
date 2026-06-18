const { contextBridge, ipcRenderer } = require("electron");

contextBridge.exposeInMainWorld("minimalChatWindow", {
  minimize: () => ipcRenderer.invoke("window:minimize"),
  maximize: () => ipcRenderer.invoke("window:maximize"),
  close: () => ipcRenderer.invoke("window:close")
});
