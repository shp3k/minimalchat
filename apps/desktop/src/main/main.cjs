const { app, BrowserWindow, Notification, clipboard, ipcMain, nativeImage, session, shell } = require("electron");
const { spawn } = require("node:child_process");
const { net } = require("electron");
const fs = require("node:fs");
const http = require("node:http");
const path = require("node:path");
const { copyImageUrlToClipboard } = require("./imageClipboard.cjs");

let autoUpdater = null;

try {
  autoUpdater = require("electron-updater").autoUpdater;
} catch {
  autoUpdater = null;
}

let mainWindow = null;
let serverProcess = null;
let updatesReady = false;
let checkingForUpdates = false;
let updateDownloaded = false;
const SERVER_URL = process.env.VITE_API_URL ?? "http://localhost:4000";
const PROJECT_ROOT = path.resolve(__dirname, "../../../..");
const SERVER_DIR = path.join(PROJECT_ROOT, "apps", "server");

app.setAppUserModelId("com.minimalchat.desktop");

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function checkServer() {
  return new Promise((resolve) => {
    const request = http.get(`${SERVER_URL}/health`, { timeout: 800 }, (response) => {
      response.resume();
      resolve(response.statusCode === 200);
    });

    request.on("timeout", () => {
      request.destroy();
      resolve(false);
    });
    request.on("error", () => resolve(false));
  });
}

function isLocalServerUrl() {
  return /^https?:\/\/(localhost|127\.0\.0\.1|\[::1\])(?::|\/|$)/i.test(SERVER_URL);
}

function isSafeExternalUrl(url) {
  return /^https?:\/\//i.test(url);
}

function isAppNavigationUrl(url) {
  if (!process.env.VITE_DEV_SERVER_URL) {
    return url.startsWith("file://");
  }

  try {
    return new URL(url).origin === new URL(process.env.VITE_DEV_SERVER_URL).origin;
  } catch {
    return false;
  }
}

async function waitForServer(attempts, delayMs) {
  for (let index = 0; index < attempts; index += 1) {
    if (await checkServer()) {
      return true;
    }

    await sleep(delayMs);
  }

  return false;
}

function startLocalServer() {
  if (serverProcess) return;

  const serverEntry = path.join(SERVER_DIR, "dist", "index.js");
  const hasBuiltServer = fs.existsSync(serverEntry);

  serverProcess = hasBuiltServer
    ? spawn(process.platform === "win32" ? "node.exe" : "node", [serverEntry], {
        cwd: SERVER_DIR,
        stdio: "ignore",
        windowsHide: true
      })
    : spawn(process.platform === "win32" ? "npm.cmd" : "npm", ["run", "dev", "-w", "@minimalchat/server"], {
        cwd: PROJECT_ROOT,
        stdio: "ignore",
        windowsHide: true
      });

  serverProcess.unref();
}

async function ensureLocalServer() {
  if (await waitForServer(8, 500)) {
    return;
  }

  startLocalServer();
  await waitForServer(30, 500);
}

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1200,
    height: 760,
    minWidth: 900,
    minHeight: 600,
    frame: false,
    titleBarStyle: "hidden",
    backgroundColor: "#09090B",
    show: false,
    webPreferences: {
      preload: path.join(__dirname, "preload.cjs"),
      contextIsolation: true,
      nodeIntegration: false
    }
  });

  mainWindow.once("ready-to-show", () => {
    mainWindow.show();
  });

  mainWindow.webContents.on("console-message", (details) => {
    if (details.message.includes("Download the React DevTools")) return;

    console.log(
      `[renderer:${details.level}] ${details.message} (${details.sourceId}:${details.lineNumber})`
    );
  });

  mainWindow.webContents.on("did-fail-load", (_event, errorCode, errorDescription, validatedURL) => {
    console.error(`[renderer:load-failed] ${errorCode} ${errorDescription} ${validatedURL}`);
  });

  mainWindow.webContents.setWindowOpenHandler(({ url }) => {
    if (isSafeExternalUrl(url)) {
      shell.openExternal(url);
    }

    return { action: "deny" };
  });

  mainWindow.webContents.on("will-navigate", (event, url) => {
    if (isAppNavigationUrl(url)) return;

    event.preventDefault();

    if (isSafeExternalUrl(url)) {
      shell.openExternal(url);
    }
  });

  if (process.env.VITE_DEV_SERVER_URL) {
    mainWindow.loadURL(process.env.VITE_DEV_SERVER_URL);
  } else {
    mainWindow.loadFile(path.join(__dirname, "../../dist/renderer/index.html"));
  }
}

function sendUpdateStatus(status) {
  mainWindow?.webContents.send("updates:status", status);
}

function setupAutoUpdates() {
  if (!app.isPackaged || !autoUpdater) return;
  if (updatesReady) return;

  updatesReady = true;
  autoUpdater.autoDownload = false;
  autoUpdater.autoInstallOnAppQuit = true;

  autoUpdater.on("checking-for-update", () => {
    checkingForUpdates = true;
    sendUpdateStatus({ state: "checking" });
  });

  autoUpdater.on("update-available", (info) => {
    checkingForUpdates = false;
    updateDownloaded = false;
    sendUpdateStatus({ state: "available", version: info.version });
    autoUpdater.downloadUpdate().catch((error) => {
      sendUpdateStatus({ state: "error", message: error instanceof Error ? error.message : "Не удалось скачать обновление" });
    });
  });

  autoUpdater.on("update-not-available", () => {
    checkingForUpdates = false;
    updateDownloaded = false;
    sendUpdateStatus({ state: "not-available" });
  });

  autoUpdater.on("download-progress", (progress) => {
    sendUpdateStatus({
      state: "downloading",
      percent: Math.round(progress.percent),
      transferred: progress.transferred,
      total: progress.total
    });
  });

  autoUpdater.on("update-downloaded", (info) => {
    updateDownloaded = true;
    sendUpdateStatus({ state: "downloaded", version: info.version });
  });

  autoUpdater.on("error", (error) => {
    checkingForUpdates = false;
    sendUpdateStatus({ state: "error", message: error instanceof Error ? error.message : "Не удалось проверить обновление" });
  });

  autoUpdater.checkForUpdates().catch((error) => {
    checkingForUpdates = false;
    sendUpdateStatus({ state: "error", message: error instanceof Error ? error.message : "Не удалось проверить обновление" });
  });

  const interval = setInterval(() => {
    if (checkingForUpdates) return;
    autoUpdater.checkForUpdates().catch(() => {});
  }, 1000 * 60 * 30);

  interval.unref?.();
}

function focusMainWindow() {
  if (!mainWindow) return;

  if (mainWindow.isMinimized()) {
    mainWindow.restore();
  }

  mainWindow.show();
  mainWindow.focus();
}

function shouldShowMessageNotification(force) {
  if (force) return true;
  if (!mainWindow) return true;
  return mainWindow.isMinimized() || !mainWindow.isFocused();
}

function setUnreadBadge(count) {
  const unreadCount = Math.max(0, Math.min(Number(count) || 0, 999));

  app.setBadgeCount(unreadCount);

  if (process.platform !== "win32" || !mainWindow) return;

  if (unreadCount === 0) {
    mainWindow.setOverlayIcon(null, "");
    return;
  }

  mainWindow.setOverlayIcon(
    nativeImage.createFromDataURL(createBadgeIconDataUrl(unreadCount)),
    `${unreadCount} unread messages`
  );
}

function createBadgeIconDataUrl(count) {
  const label = count > 99 ? "99+" : String(count);
  const fontSize = label.length > 2 ? 8 : label.length > 1 ? 9 : 11;
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 32 32">
    <circle cx="16" cy="16" r="15" fill="#7C3AED"/>
    <circle cx="16" cy="16" r="15" fill="none" stroke="white" stroke-opacity=".95" stroke-width="2"/>
    <text x="16" y="20" text-anchor="middle" font-family="Arial, Helvetica, sans-serif" font-size="${fontSize}" font-weight="700" fill="white">${label}</text>
  </svg>`;

  return `data:image/svg+xml;base64,${Buffer.from(svg).toString("base64")}`;
}

app.whenReady().then(async () => {
  session.defaultSession.setPermissionRequestHandler((_webContents, permission, callback) => {
    callback(permission === "media");
  });

  if (!app.isPackaged && process.env.VITE_USE_LOCAL_SERVER === "true" && isLocalServerUrl()) {
    await ensureLocalServer();
  }
  createWindow();
  setupAutoUpdates();

  app.on("activate", () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow();
    }
  });
});

app.on("window-all-closed", () => {
  if (process.platform !== "darwin") {
    app.quit();
  }
});

app.on("before-quit", () => {
  if (serverProcess && !serverProcess.killed) {
    serverProcess.kill();
  }
});

ipcMain.handle("window:minimize", () => mainWindow?.minimize());
ipcMain.handle("window:maximize", () => {
  if (!mainWindow) return;
  if (mainWindow.isMaximized()) {
    mainWindow.unmaximize();
  } else {
    mainWindow.maximize();
  }
});
ipcMain.handle("window:close", () => mainWindow?.close());
ipcMain.handle("app:open-external", (_event, url) => {
  if (typeof url !== "string" || !isSafeExternalUrl(url)) return;
  return shell.openExternal(url);
});
ipcMain.handle("app:get-version", () => app.getVersion());
ipcMain.handle("clipboard:read-text", () => clipboard.readText());
ipcMain.handle("clipboard:read-image", () => {
  const image = clipboard.readImage();

  if (image.isEmpty()) {
    return { ok: false, code: "IMAGE_NOT_FOUND" };
  }

  const buffer = image.toPNG();

  if (!buffer.length || buffer.length > 50 * 1024 * 1024) {
    return { ok: false, code: "INVALID_IMAGE_SIZE" };
  }

  return {
    ok: true,
    dataUrl: `data:image/png;base64,${buffer.toString("base64")}`,
    size: buffer.length
  };
});
ipcMain.handle("clipboard:write-text", (_event, value) => {
  clipboard.writeText(String(value ?? ""));
});
ipcMain.handle("clipboard:write-image", async (_event, url) => {
  return copyImageUrlToClipboard(url, {
    isSafeExternalUrl,
    fetch: (imageUrl) => net.fetch(imageUrl),
    createImage: (buffer) => nativeImage.createFromBuffer(buffer),
    writeImage: (image) => clipboard.writeImage(image)
  });
});
ipcMain.handle("notification:show-message", (_event, payload) => {
  if (!Notification.isSupported() || !shouldShowMessageNotification(Boolean(payload?.force))) {
    return false;
  }

  const title = String(payload?.title ?? "MinimalChat").slice(0, 80);
  const body = String(payload?.body ?? "").slice(0, 240);
  const senderId = typeof payload?.senderId === "string" ? payload.senderId : "";
  const notification = new Notification({
    title,
    body,
    silent: Boolean(payload?.silent)
  });

  notification.on("click", () => {
    focusMainWindow();

    if (senderId) {
      mainWindow?.webContents.send("notification:message-click", { senderId });
    }
  });

  notification.show();
  return true;
});
ipcMain.handle("app:set-unread-count", (_event, count) => {
  setUnreadBadge(count);
});
ipcMain.handle("updates:check", async () => {
  if (!app.isPackaged || !autoUpdater) {
    return { ok: false, code: "UPDATES_UNAVAILABLE" };
  }

  if (checkingForUpdates) {
    return { ok: true };
  }

  checkingForUpdates = true;
  await autoUpdater.checkForUpdates();
  return { ok: true };
});
ipcMain.handle("updates:install", () => {
  if (!app.isPackaged || !autoUpdater) {
    return { ok: false, code: "UPDATES_UNAVAILABLE" };
  }

  if (!updateDownloaded) {
    return { ok: false, code: "UPDATE_NOT_DOWNLOADED" };
  }

  sendUpdateStatus({ state: "installing" });
  setImmediate(() => autoUpdater.quitAndInstall(true, true));
  return { ok: true };
});
