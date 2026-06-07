import { APP_VERSION } from '../constants/appVersion';
import {
  LIBRARY_PACK_VERSION,
  parseLibraryPack,
  type ComponentLibraryPack,
} from './componentLibraryPack';
import { getCuratedLibraryPack } from './curatedLibraryPacks';

export const LIBRARY_REGISTRY_VERSION = '1.0';

/** Remote registry manifest (GitHub raw); refreshed on demand in the browser. */
export const REMOTE_LIBRARY_REGISTRY_URL =
  'https://raw.githubusercontent.com/Psychotichub/elecroism/main/public/library-pack-registry.json';

export type LibraryPackRegistryEntry = {
  id: string;
  name: string;
  description: string;
  version: string;
  author?: string;
  tags: string[];
  macroCount: number;
  minPackVersion: string;
  maxPackVersion?: string;
  minAppVersion?: string;
  downloadUrl: string;
  bundled?: boolean;
  publishedAt?: string;
  releaseNotes?: string;
};

export type LibraryPackRegistry = {
  version: string;
  updatedAt: string;
  registryUrl?: string;
  packs: LibraryPackRegistryEntry[];
};

export type PackCompatibilityResult = {
  compatible: boolean;
  reason?: string;
};

function parseSemver(value: string): [number, number, number] | null {
  const parts = value
    .trim()
    .split('.')
    .map((p) => Number(p));
  if (parts.length === 0 || parts.some((n) => !Number.isFinite(n))) return null;
  return [parts[0] ?? 0, parts[1] ?? 0, parts[2] ?? 0];
}

function compareSemver(a: string, b: string): number {
  const pa = parseSemver(a);
  const pb = parseSemver(b);
  if (!pa || !pb) return 0;
  for (let i = 0; i < 3; i++) {
    if (pa[i] !== pb[i]) return pa[i] - pb[i];
  }
  return 0;
}

export function satisfiesMinVersion(
  actual: string,
  minimum: string
): boolean {
  return compareSemver(actual, minimum) >= 0;
}

export function checkPackRegistryCompatibility(
  entry: LibraryPackRegistryEntry,
  appVersion = APP_VERSION,
  packFormatVersion = LIBRARY_PACK_VERSION
): PackCompatibilityResult {
  if (
    entry.minAppVersion &&
    !satisfiesMinVersion(appVersion, entry.minAppVersion)
  ) {
    return {
      compatible: false,
      reason: `Requires ElectroSim ${entry.minAppVersion} or newer (you have ${appVersion}).`,
    };
  }
  if (!satisfiesMinVersion(packFormatVersion, entry.minPackVersion)) {
    return {
      compatible: false,
      reason: `Pack format ${entry.minPackVersion}+ required (app supports ${packFormatVersion}).`,
    };
  }
  if (
    entry.maxPackVersion &&
    compareSemver(packFormatVersion, entry.maxPackVersion) > 0
  ) {
    return {
      compatible: false,
      reason: `Pack format above ${entry.maxPackVersion} is not supported yet.`,
    };
  }
  return { compatible: true };
}

export function parseLibraryPackRegistry(
  data: unknown
): LibraryPackRegistry | null {
  if (!data || typeof data !== 'object') return null;
  const doc = data as Record<string, unknown>;
  if (!Array.isArray(doc.packs)) return null;
  const packs = doc.packs
    .filter((p): p is LibraryPackRegistryEntry => {
      if (!p || typeof p !== 'object') return false;
      const e = p as LibraryPackRegistryEntry;
      return (
        typeof e.id === 'string' &&
        typeof e.name === 'string' &&
        typeof e.downloadUrl === 'string' &&
        typeof e.minPackVersion === 'string'
      );
    })
    .map((p) => ({
      ...p,
      tags: Array.isArray(p.tags)
        ? p.tags.filter((t): t is string => typeof t === 'string')
        : [],
      macroCount:
        typeof p.macroCount === 'number' ? p.macroCount : 0,
    }));
  return {
    version:
      typeof doc.version === 'string' ? doc.version : LIBRARY_REGISTRY_VERSION,
    updatedAt:
      typeof doc.updatedAt === 'string'
        ? doc.updatedAt
        : new Date().toISOString(),
    registryUrl:
      typeof doc.registryUrl === 'string' ? doc.registryUrl : undefined,
    packs,
  };
}

export const DEFAULT_LIBRARY_PACK_REGISTRY: LibraryPackRegistry = {
  version: LIBRARY_REGISTRY_VERSION,
  updatedAt: '2026-06-07T00:00:00.000Z',
  registryUrl: REMOTE_LIBRARY_REGISTRY_URL,
  packs: [
    {
      id: 'iec-symbols-starter',
      name: 'IEC Symbols Starter',
      description:
        'MCB and contactor templates with IEC-style device tags for panel drawings.',
      version: '1.0.0',
      author: 'ElectroSim',
      tags: ['iec', 'symbols', 'protection'],
      macroCount: 3,
      minPackVersion: '1.0',
      minAppVersion: '0.0.0',
      downloadUrl:
        'https://github.com/Psychotichub/elecroism/releases/download/library-packs-v1.0.0/iec-symbols-starter.elib.json',
      bundled: true,
      publishedAt: '2026-06-07',
      releaseNotes: 'Initial curated IEC symbol macros.',
    },
    {
      id: 'motor-starters-starter',
      name: 'Motor Starters Starter',
      description:
        'DOL starter macro (MCB + contactor) and motor protection breaker templates.',
      version: '1.0.0',
      author: 'ElectroSim',
      tags: ['motor', 'starter', 'dol'],
      macroCount: 2,
      minPackVersion: '1.0',
      minAppVersion: '0.0.0',
      downloadUrl:
        'https://raw.githubusercontent.com/Psychotichub/elecroism/main/public/library-packs/motor-starters-starter.elib.json',
      bundled: true,
      publishedAt: '2026-06-07',
      releaseNotes: 'DOL starter and motor MCB macros.',
    },
    {
      id: 'bms-io-starter',
      name: 'BMS I/O Starter',
      description:
        'Digital and analog BMS I/O module templates for supervisory panels.',
      version: '1.0.0',
      author: 'ElectroSim',
      tags: ['bms', 'io', 'di', 'ai'],
      macroCount: 3,
      minPackVersion: '1.0',
      minAppVersion: '0.0.0',
      downloadUrl:
        'https://github.com/Psychotichub/elecroism/releases/download/library-packs-v1.0.0/bms-io-starter.elib.json',
      bundled: true,
      publishedAt: '2026-06-07',
      releaseNotes: 'DI, AI, and paired I/O module macros.',
    },
  ],
};

function resolveRegistryUrl(url: string): string {
  if (url.startsWith('http://') || url.startsWith('https://')) return url;
  const base =
    typeof window !== 'undefined'
      ? window.location.origin
      : 'http://localhost';
  return new URL(url, `${base}/`).toString();
}

export async function fetchLibraryPackRegistry(
  remoteUrl = REMOTE_LIBRARY_REGISTRY_URL
): Promise<LibraryPackRegistry> {
  const attempts = [
    remoteUrl,
    '/library-pack-registry.json',
  ];
  for (const url of attempts) {
    try {
      const res = await fetch(resolveRegistryUrl(url), {
        cache: 'no-store',
      });
      if (!res.ok) continue;
      const data = (await res.json()) as unknown;
      const parsed = parseLibraryPackRegistry(data);
      if (parsed && parsed.packs.length > 0) return parsed;
    } catch {
      // try next source
    }
  }
  return DEFAULT_LIBRARY_PACK_REGISTRY;
}

export async function fetchLibraryPackForEntry(
  entry: LibraryPackRegistryEntry
): Promise<ComponentLibraryPack | null> {
  if (entry.bundled) {
    const curated = getCuratedLibraryPack(entry.id);
    if (curated) return curated;
  }
  try {
    const res = await fetch(resolveRegistryUrl(entry.downloadUrl), {
      cache: 'no-store',
    });
    if (!res.ok) return entry.bundled ? getCuratedLibraryPack(entry.id) : null;
    const data = (await res.json()) as unknown;
    return parseLibraryPack(data);
  } catch {
    return entry.bundled ? getCuratedLibraryPack(entry.id) : null;
  }
}
