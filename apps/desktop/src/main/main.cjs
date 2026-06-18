const { app, BrowserWindow, ipcMain, session, shell } = require("electron");
const { spawn } = require("node:child_process");
const fs = require("node:fs");
const http = require("node:http");
const path = require("node:path");

let autoUpdater = null;

try {
  autoUpdater = require("electron-updater").autoUpdater;
} catch {
  autoUpdater = null;
}

let mainWindow = null;
let serverProcess = null;
const SERVER_URL = process.env.VITE_API_URL ?? "http://localhost:4000";
const PROJECT_ROOT = path.resolve(__dirname, "../../../..");
const SERVER_DIR = path.join(PROJECT_ROOT, "apps", "server");

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

  mainWindow.webContents.on("console-message", (_event, level, message, line, sourceId) => {
    const prefix = ["log", "warn", "error", "debug"][level] ?? "console";
    console.log(`[renderer:${prefix}] ${message} (${sourceId}:${line})`);
  });

  mainWindow.webContents.on("did-fail-load", (_event, errorCode, errorDescription, validatedURL) => {
    console.error(`[renderer:load-failed] ${errorCode} ${errorDescription} ${validatedURL}`);
  });

  mainWindow.webContents.setWindowOpenHandler(({ url }) => {
    if (/^https?:\/\//i.test(url)) {
      shell.openExternal(url);
    }

    return { action: "deny" };
  });

  if (process.env.VITE_DEV_SERVER_URL) {
    mainWindow.loadURL(process.env.VITE_DEV_SERVER_URL);
  } else {
    mainWindow.loadFile(path.join(__dirname, "../../dist/renderer/index.html"));
  }
}

function setupAutoUpdates() {
  if (!app.isPackaged || !autoUpdater) return;

  autoUpdater.autoDownload = true;
  autoUpdater.autoInstallOnAppQuit = true;
  autoUpdater.checkForUpdatesAndNotify().catch(() => {});

  const interval = setInterval(() => {
    autoUpdater.checkForUpdatesAndNotify().catch(() => {});
  }, 1000 * 60 * 30);

  interval.unref?.();
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
