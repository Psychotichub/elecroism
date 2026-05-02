/**
 * Persisted sidebar palette: favorites and recently used component types
 * (palette drag, canvas drop, duplicate, CAD paste, etc.).
 */

import type { ComponentType } from '../types';

/** Window event so the sidebar can refresh recent list after store adds a component. */
export const PALETTE_RECENT_CHANGED = 'electroism-palette-recent';

const FAVORITES_KEY = 'electroism.sidebarFavorites.v1';
const RECENT_KEY = 'electroism.sidebarRecent.v1';
export const SIDEBAR_MAX_RECENT = 20;

function parseJsonArray(raw: string | null): unknown[] {
  if (!raw) return [];
  try {
    const v = JSON.parse(raw);
    return Array.isArray(v) ? v : [];
  } catch {
    return [];
  }
}

/** Keep only strings present in `allowed` (valid ComponentType slugs). */
export function coerceStoredTypes(
  raw: unknown[],
  allowed: ReadonlySet<string>
): string[] {
  const out: string[] = [];
  for (const x of raw) {
    if (typeof x === 'string' && allowed.has(x) && !out.includes(x)) {
      out.push(x);
    }
  }
  return out;
}

export function loadFavoriteTypes(allowed: ReadonlySet<string>): string[] {
  if (typeof window === 'undefined') return [];
  return coerceStoredTypes(parseJsonArray(localStorage.getItem(FAVORITES_KEY)), allowed);
}

export function saveFavoriteTypes(types: string[]): void {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(FAVORITES_KEY, JSON.stringify(types));
  } catch {
    /* quota / private mode */
  }
}

/** Toggle type in favorites; returns the new ordered list. */
export function toggleFavoriteType(
  type: string,
  current: string[],
  allowed: ReadonlySet<string>
): string[] {
  if (!allowed.has(type)) return current;
  const next = [...current];
  const i = next.indexOf(type);
  if (i >= 0) next.splice(i, 1);
  else next.unshift(type);
  saveFavoriteTypes(next);
  return next;
}

export function loadRecentTypes(allowed: ReadonlySet<string>): string[] {
  if (typeof window === 'undefined') return [];
  return coerceStoredTypes(parseJsonArray(localStorage.getItem(RECENT_KEY)), allowed);
}

export function saveRecentTypes(types: string[]): void {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(RECENT_KEY, JSON.stringify(types));
  } catch {
    /* ignore */
  }
}

/** Prepend type, dedupe, cap length; returns new list and persists. */
export function recordRecentType(
  type: string,
  current: string[],
  allowed: ReadonlySet<string>
): string[] {
  if (!allowed.has(type)) return current;
  const next = [type, ...current.filter((t) => t !== type)].slice(
    0,
    SIDEBAR_MAX_RECENT
  );
  saveRecentTypes(next);
  return next;
}

/**
 * Call when a component is placed on the schematic (any path). Updates
 * persisted recent list and dispatches {@link PALETTE_RECENT_CHANGED}.
 */
export function appendRecentPaletteUse(type: ComponentType): void {
  if (typeof window === 'undefined') return;
  const raw = parseJsonArray(localStorage.getItem(RECENT_KEY));
  const cur = raw.filter((x): x is string => typeof x === 'string');
  const next = [type, ...cur.filter((t) => t !== type)].slice(
    0,
    SIDEBAR_MAX_RECENT
  );
  saveRecentTypes(next);
  try {
    window.dispatchEvent(
      new CustomEvent(PALETTE_RECENT_CHANGED, { detail: { type } })
    );
  } catch {
    /* ignore */
  }
}
