import { mkdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import { APP_VERSION } from '../../constants/appVersion';
import { CURATED_LIBRARY_PACKS } from '../curatedLibraryPacks';
import {
  checkPackRegistryCompatibility,
  DEFAULT_LIBRARY_PACK_REGISTRY,
  fetchLibraryPackForEntry,
  parseLibraryPackRegistry,
  satisfiesMinVersion,
} from '../libraryPackRegistry';
import { parseLibraryPack } from '../componentLibraryPack';

describe('libraryPackRegistry', () => {
  it('parses registry manifests', () => {
    const parsed = parseLibraryPackRegistry(DEFAULT_LIBRARY_PACK_REGISTRY);
    expect(parsed?.packs).toHaveLength(3);
    expect(parsed?.packs[0].id).toBe('iec-symbols-starter');
  });

  it('checks app and pack format compatibility', () => {
    const entry = DEFAULT_LIBRARY_PACK_REGISTRY.packs[0];
    expect(checkPackRegistryCompatibility(entry, APP_VERSION).compatible).toBe(
      true
    );
    expect(
      checkPackRegistryCompatibility(entry, '0.0.0', '0.9').compatible
    ).toBe(false);
    expect(satisfiesMinVersion('1.2.0', '1.0.0')).toBe(true);
    expect(satisfiesMinVersion('0.9.0', '1.0.0')).toBe(false);
  });

  it('loads bundled curated packs offline', async () => {
    const entry = DEFAULT_LIBRARY_PACK_REGISTRY.packs.find(
      (p) => p.id === 'motor-starters-starter'
    )!;
    const pack = await fetchLibraryPackForEntry(entry);
    expect(pack).not.toBeNull();
    expect(parseLibraryPack(pack)?.macros.length).toBeGreaterThan(0);
  });

  it('ships valid curated pack documents', () => {
    for (const pack of Object.values(CURATED_LIBRARY_PACKS)) {
      const parsed = parseLibraryPack(pack);
      expect(parsed?.macros.length).toBeGreaterThan(0);
    }
  });

  it('optionally exports public pack assets when UPDATE_LIBRARY_PACKS=1', () => {
    if (process.env.UPDATE_LIBRARY_PACKS !== '1') return;
    const root = join(process.cwd(), 'public');
    const packsDir = join(root, 'library-packs');
    mkdirSync(packsDir, { recursive: true });
    writeFileSync(
      join(root, 'library-pack-registry.json'),
      JSON.stringify(DEFAULT_LIBRARY_PACK_REGISTRY, null, 2)
    );
    for (const [id, pack] of Object.entries(CURATED_LIBRARY_PACKS)) {
      writeFileSync(
        join(packsDir, `${id}.elib.json`),
        JSON.stringify(pack, null, 2)
      );
    }
  });
});
