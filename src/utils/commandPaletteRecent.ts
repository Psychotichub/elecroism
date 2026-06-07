const STORAGE_KEY = 'electroism.commandPaletteRecent.v1';
const MAX_RECENT = 5;

export function loadRecentPaletteIds(): string[] {
  if (typeof window === 'undefined') return [];
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed: unknown = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed.filter((id): id is string => typeof id === 'string').slice(0, MAX_RECENT);
  } catch {
    return [];
  }
}

export function recordPaletteSelection(id: string): void {
  if (typeof window === 'undefined' || !id) return;
  try {
    const prev = loadRecentPaletteIds().filter((x) => x !== id);
    const next = [id, ...prev].slice(0, MAX_RECENT);
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
  } catch {
    // storage may be disabled; failure is non-fatal
  }
}
