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
});
