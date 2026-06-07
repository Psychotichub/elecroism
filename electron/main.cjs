const { app, BrowserWindow, ipcMain, session } = require("electron");
const path = require("node:path");
const {
  applyContentSecurityPolicy,
  hardenWebContents,
} = require("./security.cjs");
const { setupAutoUpdater, promptInstallUpdate } = require("./updater.cjs");
const {
  setApplicationMenu,
  showAboutDialog,
  checkForUpdates,
  setRecentMenuItems,
  showOpenProjectDialog,
  readProjectFile,
} = require("./appMenu.cjs");

const isDev = Boolean(process.env.VITE_DEV_SERVER_URL);

/** @type {import('electron').BrowserWindow | null} */
let mainWindow = null;

function createWindow() {
  const win = new BrowserWindow({
    width: 1280,
    height: 800,
    minWidth: 900,
    minHeight: 600,
    show: false,
    webPreferences: {
      preload: path.join(__dirname, "preload.cjs"),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: true,
      webSecurity: true,
    },
  });

  mainWindow = win;

  win.once("ready-to-show", () => {
    win.show();
  });

  if (isDev) {
    win.loadURL(process.env.VITE_DEV_SERVER_URL);
    win.webContents.openDevTools({ mode: "detach" });
  } else {
    win.loadFile(path.join(__dirname, "..", "dist", "index.html"));
  }

  setupAutoUpdater(win);
  setApplicationMenu(win, { isPackaged: app.isPackaged });
}

app.whenReady().then(() => {
  applyContentSecurityPolicy(session.defaultSession, isDev);

  app.on("web-contents-created", (_event, contents) => {
    hardenWebContents(contents);
  });

  ipcMain.handle("install-update", async () => {
    if (mainWindow) {
      await promptInstallUpdate(mainWindow);
    }
  });

  ipcMain.handle("show-about", async () => {
    await showAboutDialog(mainWindow);
  });

  ipcMain.handle("check-for-updates", async () => {
    await checkForUpdates(mainWindow, app.isPackaged);
  });

  ipcMain.handle("show-open-project-dialog", async () => {
    return showOpenProjectDialog(mainWindow);
  });

  ipcMain.handle("read-project-file", async (_event, filePath) => {
    if (typeof filePath !== "string" || !filePath) return null;
    return readProjectFile(filePath);
  });

  ipcMain.on("sync-recent-menu", (_event, items) => {
    setRecentMenuItems(items);
    if (mainWindow && !mainWindow.isDestroyed()) {
      setApplicationMenu(mainWindow, { isPackaged: app.isPackaged });
    }
  });

  createWindow();

  app.on("open-file", (event, filePath) => {
    event.preventDefault();
    if (mainWindow && !mainWindow.isDestroyed()) {
      mainWindow.webContents.send("open-project-path", filePath);
    }
  });

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
