const { app, contextBridge, ipcRenderer } = require("electron");

/** @typedef {'idle' | 'checking' | 'available' | 'not-available' | 'downloading' | 'downloaded' | 'error'} UpdatePhase */

/** @typedef {{ phase: UpdatePhase; version?: string; percent?: number; message?: string }} UpdateStatus */

contextBridge.exposeInMainWorld("electronAPI", {
  platform: process.platform,
  isPackaged: app.isPackaged,
  versions: {
    app: process.env.npm_package_version ?? "0.0.0",
    electron: process.versions.electron,
    chrome: process.versions.chrome,
  },
  /** @param {(status: UpdateStatus) => void} callback */
  onUpdateStatus(callback) {
    const listener = (_event, status) => {
      callback(status);
    };
    ipcRenderer.on("update-status", listener);
    return () => {
      ipcRenderer.removeListener("update-status", listener);
    };
  },
  installUpdate() {
    return ipcRenderer.invoke("install-update");
  },
  /** @param {(actionId: string) => void} callback */
  onMenuAction(callback) {
    const listener = (_event, actionId) => {
      callback(actionId);
    };
    ipcRenderer.on("menu-action", listener);
    return () => {
      ipcRenderer.removeListener("menu-action", listener);
    };
  },
  showAbout() {
    return ipcRenderer.invoke("show-about");
  },
  checkForUpdates() {
    return ipcRenderer.invoke("check-for-updates");
  },
  readProjectFile(filePath) {
    return ipcRenderer.invoke("read-project-file", filePath);
  },
  showOpenProjectDialog() {
    return ipcRenderer.invoke("show-open-project-dialog");
  },
  syncRecentMenu(items) {
    ipcRenderer.send("sync-recent-menu", items);
  },
  /** @param {(filePath: string) => void} callback */
  onOpenProjectPath(callback) {
    const listener = (_event, filePath) => {
      callback(filePath);
    };
    ipcRenderer.on("open-project-path", listener);
    return () => {
      ipcRenderer.removeListener("open-project-path", listener);
    };
  },
});
