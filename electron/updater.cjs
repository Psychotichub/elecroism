const { autoUpdater } = require("electron-updater");
const { app, dialog } = require("electron");

/** @typedef {'idle' | 'checking' | 'available' | 'not-available' | 'downloading' | 'downloaded' | 'error'} UpdatePhase */

/**
 * Wire electron-updater events and expose status to the renderer.
 * @param {import('electron').BrowserWindow} win
 */
function setupAutoUpdater(win) {
  if (!app.isPackaged) {
    return;
  }

  autoUpdater.autoDownload = true;
  autoUpdater.autoInstallOnAppQuit = true;
  autoUpdater.allowDowngrade = false;

  /** @param {UpdatePhase} phase @param {Record<string, unknown>} [extra] */
  function send(phase, extra = {}) {
    if (!win.isDestroyed()) {
      win.webContents.send("update-status", { phase, ...extra });
    }
  }

  autoUpdater.on("checking-for-update", () => send("checking"));
  autoUpdater.on("update-available", (info) =>
    send("available", { version: info.version })
  );
  autoUpdater.on("update-not-available", (info) =>
    send("not-available", { version: info.version })
  );
  autoUpdater.on("download-progress", (progress) =>
    send("downloading", {
      percent: progress.percent,
      transferred: progress.transferred,
      total: progress.total,
    })
  );
  autoUpdater.on("update-downloaded", (info) =>
    send("downloaded", { version: info.version })
  );
  autoUpdater.on("error", (error) =>
    send("error", { message: error.message })
  );

  const check = () => {
    autoUpdater.checkForUpdates().catch((error) => {
      send("error", { message: error.message });
    });
  };

  // Initial check shortly after launch, then every four hours.
  setTimeout(check, 8_000);
  setInterval(check, 4 * 60 * 60 * 1000);
}

/**
 * Prompt the user and restart into the downloaded update.
 * @param {import('electron').BrowserWindow} win
 */
async function promptInstallUpdate(win) {
  const result = await dialog.showMessageBox(win, {
    type: "info",
    buttons: ["Restart now", "Later"],
    defaultId: 0,
    cancelId: 1,
    title: "Update ready",
    message: "A new version of ElectroSim has been downloaded.",
    detail: "Restart the app to apply the update.",
  });
  if (result.response === 0) {
    autoUpdater.quitAndInstall();
  }
}

module.exports = { setupAutoUpdater, promptInstallUpdate, autoUpdater };
