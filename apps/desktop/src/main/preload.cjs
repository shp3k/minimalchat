const { clipboard, contextBridge, ipcRenderer } = require("electron");

contextBridge.exposeInMainWorld("minimalChatWindow", {
  minimize: () => ipcRenderer.invoke("window:minimize"),
  maximize: () => ipcRenderer.invoke("window:maximize"),
  close: () => ipcRenderer.invoke("window:close")
});

contextBridge.exposeInMainWorld("minimalChatApp", {
  openExternal: (url) => ipcRenderer.invoke("app:open-external", url)
});

contextBridge.exposeInMainWorld("minimalChatClipboard", {
  readText: () => clipboard.readText(),
  writeText: (value) => clipboard.writeText(String(value ?? ""))
});
