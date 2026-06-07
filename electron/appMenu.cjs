const { app, Menu, dialog } = require("electron");
const fs = require("node:fs/promises");
const path = require("node:path");
const { autoUpdater } = require("./updater.cjs");

/** @typedef {{ type: 'action'; id: string; label: string; accelerator?: string; platforms?: string[] }} ActionItem */
/** @typedef {{ type: 'separator'; platforms?: string[] }} SeparatorItem */
/** @typedef {{ type: 'role'; role: string; platforms?: string[] }} RoleItem */
/** @typedef {{ type: 'submenu'; id: string; label: string; dynamic?: string; platforms?: string[] }} SubmenuItem */
/** @typedef {ActionItem | SeparatorItem | RoleItem | SubmenuItem} MenuItemDef */

/** @type {{ menus: { id: string; label: string; platforms?: string[]; items: MenuItemDef[] }[]; darwinAppMenu: { items: MenuItemDef[] } }} */
const menuDef = require(path.join(__dirname, "..", "shared", "nativeMenu.json"));

/** @type {{ index: number; label: string }[]} */
let recentMenuItems = [];

/**
 * @param {import('electron').BrowserWindow} win
 * @param {{ isPackaged: boolean }} opts
 */
function sendMenuAction(win, actionId) {
  if (!win || win.isDestroyed()) return;
  win.webContents.send("menu-action", actionId);
}

/**
 * @param {{ index: number; label: string }[]} items
 */
function setRecentMenuItems(items) {
  recentMenuItems = Array.isArray(items) ? items : [];
}

/**
 * @param {import('electron').BrowserWindow | null} win
 */
async function showAboutDialog(win) {
  const parent = win && !win.isDestroyed() ? win : undefined;
  await dialog.showMessageBox(parent, {
    type: "info",
    title: "About ElectroSim",
    message: "ElectroSim",
    detail: [
      `Version ${app.getVersion()}`,
      "",
      "Desktop electrical simulation and schematic builder.",
      "https://github.com/Psychotichub/elecroism",
    ].join("\n"),
    buttons: ["OK"],
  });
}

/**
 * @param {import('electron').BrowserWindow | null} win
 * @param {boolean} isPackaged
 */
async function checkForUpdates(win, isPackaged) {
  const parent = win && !win.isDestroyed() ? win : undefined;
  if (!isPackaged) {
    await dialog.showMessageBox(parent, {
      type: "info",
      title: "Updates",
      message: "Development build",
      detail: "Automatic update checks run in packaged desktop builds only.",
      buttons: ["OK"],
    });
    return;
  }
  try {
    await autoUpdater.checkForUpdates();
    await dialog.showMessageBox(parent, {
      type: "info",
      title: "Check for updates",
      message: "Checking for updates…",
      detail: "You will be notified when a newer version is available.",
      buttons: ["OK"],
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    await dialog.showMessageBox(parent, {
      type: "error",
      title: "Update check failed",
      message: "Could not check for updates",
      detail: message,
      buttons: ["OK"],
    });
  }
}

/**
 * @param {MenuItemDef} item
 * @param {string} platform
 */
function itemVisibleOnPlatform(item, platform) {
  if (!item.platforms || item.platforms.length === 0) return true;
  return item.platforms.includes(platform);
}

/**
 * @param {MenuItemDef[]} items
 * @param {import('electron').BrowserWindow} win
 * @param {{ isPackaged: boolean }} opts
 * @returns {import('electron').MenuItemConstructorOptions[]}
 */
function buildItems(items, win, opts) {
  const platform = process.platform;
  /** @type {import('electron').MenuItemConstructorOptions[]} */
  const out = [];

  for (const item of items) {
    if (!itemVisibleOnPlatform(item, platform)) continue;

    if (item.type === "separator") {
      out.push({ type: "separator" });
      continue;
    }

    if (item.type === "submenu") {
      if (item.dynamic === "recent") {
        /** @type {import('electron').MenuItemConstructorOptions[]} */
        const recentSubmenu =
          recentMenuItems.length > 0
            ? recentMenuItems.map((entry) => ({
                label: entry.label,
                click: () => sendMenuAction(win, `open-recent-${entry.index}`),
              }))
            : [{ label: "No recent projects", enabled: false }];
        out.push({
          label: item.label,
          submenu: recentSubmenu,
        });
        continue;
      }
      continue;
    }

    if (item.type === "role") {
      /** @type {import('electron').MenuItemConstructorOptions} */
      const roleItem = { role: item.role };
      out.push(roleItem);
      continue;
    }

    if (item.id === "about") {
      out.push({
        label: item.label,
        click: () => void showAboutDialog(win),
      });
      continue;
    }

    if (item.id === "check-for-updates") {
      out.push({
        label: item.label,
        enabled: true,
        click: () => void checkForUpdates(win, opts.isPackaged),
      });
      continue;
    }

    /** @type {import('electron').MenuItemConstructorOptions} */
    const entry = {
      label: item.label,
      click: () => sendMenuAction(win, item.id),
    };
    if (item.accelerator) entry.accelerator = item.accelerator;
    out.push(entry);
  }

  return out;
}

/**
 * @param {import('electron').BrowserWindow} win
 * @param {{ isPackaged: boolean }} opts
 * @returns {import('electron').MenuItemConstructorOptions[]}
 */
function buildApplicationMenuTemplate(win, opts) {
  const platform = process.platform;
  /** @type {import('electron').MenuItemConstructorOptions[]} */
  const template = [];

  if (platform === "darwin") {
    template.push({
      label: app.name,
      submenu: buildItems(menuDef.darwinAppMenu.items, win, opts),
    });
  }

  for (const menu of menuDef.menus) {
    if (menu.platforms && !menu.platforms.includes(platform)) continue;
    template.push({
      label: menu.label,
      submenu: buildItems(menu.items, win, opts),
    });
  }

  return template;
}

/**
 * @param {import('electron').BrowserWindow} win
 * @param {{ isPackaged: boolean }} opts
 */
function setApplicationMenu(win, opts) {
  const template = buildApplicationMenuTemplate(win, opts);
  const menu = Menu.buildFromTemplate(template);
  Menu.setApplicationMenu(menu);
}

/**
 * @param {import('electron').BrowserWindow | null} parent
 */
async function showOpenProjectDialog(parent) {
  const win = parent && !parent.isDestroyed() ? parent : undefined;
  const result = await dialog.showOpenDialog(win, {
    title: "Open ElectroSim project",
    filters: [
      {
        name: "ElectroSim project",
        extensions: ["eproj", "esim", "json"],
      },
    ],
    properties: ["openFile"],
  });
  if (result.canceled || !result.filePaths[0]) {
    return { ok: false };
  }
  const filePath = result.filePaths[0];
  try {
    const text = await fs.readFile(filePath, "utf8");
    return { ok: true, filePath, text };
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    return { ok: false, error: message };
  }
}

/**
 * @param {string} filePath
 */
async function readProjectFile(filePath) {
  try {
    return await fs.readFile(filePath, "utf8");
  } catch {
    return null;
  }
}

module.exports = {
  setApplicationMenu,
  buildApplicationMenuTemplate,
  showAboutDialog,
  checkForUpdates,
  setRecentMenuItems,
  showOpenProjectDialog,
  readProjectFile,
};
