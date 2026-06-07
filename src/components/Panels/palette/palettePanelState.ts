const COLLAPSE_STORAGE_KEY = 'electrosim.sidebarCollapsedGroups.v1';
const PALETTE_SEARCH_PANEL_KEY = 'electrosim.sidebarPaletteSearchExpanded.v1';
const PALETTE_COMPONENT_LIST_KEY = 'electrosim.sidebarPaletteListExpanded.v1';
const LEGACY_PALETTE_BODY_KEY = 'electrosim.sidebarPaletteBodyExpanded.v1';

export function loadCollapsedGroups(): Set<string> {
  if (typeof window === 'undefined') return new Set();
  try {
    const raw = window.localStorage.getItem(COLLAPSE_STORAGE_KEY);
    if (!raw) return new Set();
    const parsed: unknown = JSON.parse(raw);
    if (Array.isArray(parsed)) {
      return new Set(parsed.filter((s) => typeof s === 'string'));
    }
  } catch {
    // ignore corrupt storage
  }
  return new Set();
}

export function saveCollapsedGroups(set: Set<string>): void {
  if (typeof window === 'undefined') return;
  try {
    window.localStorage.setItem(
      COLLAPSE_STORAGE_KEY,
      JSON.stringify(Array.from(set))
    );
  } catch {
    // storage may be disabled; failure is non-fatal
  }
}

function readBoolLocalStorage(key: string): boolean | null {
  if (typeof window === 'undefined') return null;
  try {
    const raw = window.localStorage.getItem(key);
    if (raw === null) return null;
    if (raw === 'true') return true;
    if (raw === 'false') return false;
  } catch {
    // ignore corrupt storage
  }
  return null;
}

function writeBoolLocalStorage(key: string, open: boolean): void {
  if (typeof window === 'undefined') return;
  try {
    window.localStorage.setItem(key, open ? 'true' : 'false');
  } catch {
    // storage may be disabled; failure is non-fatal
  }
}

export function loadSearchPanelOpen(): boolean {
  const own = readBoolLocalStorage(PALETTE_SEARCH_PANEL_KEY);
  if (own !== null) return own;
  const legacy = readBoolLocalStorage(LEGACY_PALETTE_BODY_KEY);
  if (legacy !== null) return legacy;
  return true;
}

export function saveSearchPanelOpen(open: boolean): void {
  writeBoolLocalStorage(PALETTE_SEARCH_PANEL_KEY, open);
}

export function loadComponentListOpen(): boolean {
  const own = readBoolLocalStorage(PALETTE_COMPONENT_LIST_KEY);
  if (own !== null) return own;
  const legacy = readBoolLocalStorage(LEGACY_PALETTE_BODY_KEY);
  if (legacy !== null) return legacy;
  return true;
}

export function saveComponentListOpen(open: boolean): void {
  writeBoolLocalStorage(PALETTE_COMPONENT_LIST_KEY, open);
}
