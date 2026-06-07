/**
 * Persisted sidebar palette: favorite component types.
 */

const FAVORITES_KEY = 'electroism.sidebarFavorites.v1';

function parseJsonArray(raw: string | null): unknown[] {
  if (!raw) return [];
  try {
    const v: unknown = JSON.parse(raw);
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
