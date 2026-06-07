import { v4 as uuid } from 'uuid';
import type { ComponentMacro } from './componentMacros';

export const LIBRARY_PACK_VERSION = '1.0';

export interface ComponentLibraryPack {
  version: string;
  name: string;
  exportedAt: string;
  author?: string;
  description?: string;
  macros: ComponentMacro[];
}

function isMacro(value: unknown): value is ComponentMacro {
  if (!value || typeof value !== 'object') return false;
  const m = value as ComponentMacro;
  return (
    typeof m.id === 'string' &&
    typeof m.name === 'string' &&
    Array.isArray(m.components)
  );
}

export function buildLibraryPack(
  macros: ComponentMacro[],
  name: string,
  meta?: { author?: string; description?: string }
): ComponentLibraryPack {
  return {
    version: LIBRARY_PACK_VERSION,
    name: name.trim() || 'Component Library',
    exportedAt: new Date().toISOString(),
    author: meta?.author,
    description: meta?.description,
    macros: macros.map((m) => structuredClone(m)),
  };
}

export function parseLibraryPack(data: unknown): ComponentLibraryPack | null {
  if (!data || typeof data !== 'object') return null;
  const doc = data as Record<string, unknown>;
  if (!Array.isArray(doc.macros)) return null;
  const macros = doc.macros.filter(isMacro);
  if (macros.length === 0) return null;
  return {
    version:
      typeof doc.version === 'string' ? doc.version : LIBRARY_PACK_VERSION,
    name: typeof doc.name === 'string' ? doc.name : 'Imported Library',
    exportedAt:
      typeof doc.exportedAt === 'string'
        ? doc.exportedAt
        : new Date().toISOString(),
    author: typeof doc.author === 'string' ? doc.author : undefined,
    description:
      typeof doc.description === 'string' ? doc.description : undefined,
    macros,
  };
}

export type LibraryMergeMode = 'merge' | 'replace';

/** Merge imported macros into an existing library (dedupe by id, then by name). */
export function mergeMacroLibraries(
  existing: ComponentMacro[],
  imported: ComponentMacro[],
  mode: LibraryMergeMode
): ComponentMacro[] {
  if (mode === 'replace') {
    return imported.map((m) => ({ ...structuredClone(m), id: uuid() }));
  }
  const byId = new Map(existing.map((m) => [m.id, m]));
  const byName = new Map(
    existing.map((m) => [m.name.trim().toLowerCase(), m])
  );
  const out = [...existing];
  for (const raw of imported) {
    const macro = { ...structuredClone(raw), id: uuid() };
    if (byId.has(raw.id)) continue;
    const nameKey = macro.name.trim().toLowerCase();
    if (byName.has(nameKey)) continue;
    out.unshift(macro);
    byId.set(macro.id, macro);
    byName.set(nameKey, macro);
  }
  return out.slice(0, 64);
}

export function downloadLibraryPack(
  pack: ComponentLibraryPack,
  baseFileName?: string
): void {
  const json = JSON.stringify(pack, null, 2);
  const blob = new Blob([json], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  const safe = (baseFileName ?? pack.name)
    .replace(/[^\w-]+/g, '_')
    .slice(0, 80);
  a.href = url;
  a.download = `${safe}.elib.json`;
  a.click();
  URL.revokeObjectURL(url);
}
