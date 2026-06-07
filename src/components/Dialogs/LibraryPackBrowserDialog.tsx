import React, { useCallback, useMemo, useState } from 'react';
import { FiDownload, FiRefreshCw, FiX } from 'react-icons/fi';
import { useThemeStore, themeColors } from '../../store/themeStore';
import { useUiStore } from '../../store/uiStore';
import { useCircuitStore } from '../../store/circuitStore';
import { APP_VERSION } from '../../constants/appVersion';
import type { LibraryMergeMode } from '../../utils/componentLibraryPack';
import {
  checkPackRegistryCompatibility,
  DEFAULT_LIBRARY_PACK_REGISTRY,
  fetchLibraryPackRegistry,
  type LibraryPackRegistry,
  type LibraryPackRegistryEntry,
} from '../../utils/libraryPackRegistry';

const LibraryPackBrowserDialog: React.FC = () => {
  const theme = useThemeStore((s) => s.theme);
  const tc = themeColors[theme];
  const open = useUiStore((s) => s.libraryPackBrowserOpen);
  const setOpen = useUiStore((s) => s.setLibraryPackBrowserOpen);
  const installRegistryLibraryPack = useCircuitStore(
    (s) => s.installRegistryLibraryPack
  );

  const [registry, setRegistry] = useState<LibraryPackRegistry>(
    DEFAULT_LIBRARY_PACK_REGISTRY
  );
  const [loading, setLoading] = useState(false);
  const [installingId, setInstallingId] = useState<string | null>(null);
  const [query, setQuery] = useState('');
  const [msg, setMsg] = useState<string | null>(null);
  const [mergeMode, setMergeMode] = useState<LibraryMergeMode>('merge');

  const refreshRegistry = useCallback(async () => {
    setLoading(true);
    setMsg(null);
    try {
      const next = await fetchLibraryPackRegistry();
      setRegistry(next);
      setMsg('Registry updated.');
    } catch {
      setRegistry(DEFAULT_LIBRARY_PACK_REGISTRY);
      setMsg('Using built-in pack catalog (could not reach remote registry).');
    } finally {
      setLoading(false);
    }
  }, []);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return registry.packs;
    return registry.packs.filter(
      (p) =>
        p.name.toLowerCase().includes(q) ||
        p.description.toLowerCase().includes(q) ||
        p.tags.some((t) => t.toLowerCase().includes(q))
    );
  }, [registry.packs, query]);

  const handleInstall = useCallback(
    async (entry: LibraryPackRegistryEntry) => {
      setMsg(null);
      setInstallingId(entry.id);
      try {
        const err = await installRegistryLibraryPack(entry, mergeMode);
        if (err) setMsg(err);
        else setMsg(`Installed "${entry.name}" (${mergeMode}).`);
      } finally {
        setInstallingId(null);
      }
    },
    [installRegistryLibraryPack, mergeMode]
  );

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-[200] flex items-center justify-center bg-black/50 p-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby="library-pack-browser-title"
    >
      <div
        className={`flex max-h-[90vh] w-full max-w-2xl flex-col rounded-lg border shadow-xl ${tc.panel} ${tc.border}`}
      >
        <div
          className={`flex shrink-0 items-center justify-between border-b px-4 py-3 ${tc.border}`}
        >
          <div>
            <h2
              id="library-pack-browser-title"
              className={`text-sm font-bold ${tc.textBright}`}
            >
              Get component library packs
            </h2>
            <p className={`text-[10px] ${tc.textMuted}`}>
              ElectroSim {APP_VERSION} · pack format 1.0
            </p>
          </div>
          <button
            type="button"
            onClick={() => setOpen(false)}
            className={`rounded p-1 ${tc.textMuted}`}
            aria-label="Close"
          >
            <FiX size={18} />
          </button>
        </div>

        <div className="min-h-0 flex-1 overflow-y-auto px-4 py-3">
          <div className="mb-3 flex flex-wrap items-center gap-2">
            <input
              type="search"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search packs…"
              className="input-field min-w-[12rem] flex-1 py-1 text-xs"
            />
            <button
              type="button"
              onClick={() => void refreshRegistry()}
              disabled={loading}
              className="inline-flex items-center gap-1 rounded bg-slate-600 px-2 py-1 text-[10px] text-white hover:bg-slate-500 disabled:opacity-60"
            >
              <FiRefreshCw size={10} className={loading ? 'animate-spin' : ''} />
              Refresh
            </button>
            <label className={`flex items-center gap-1 text-[10px] ${tc.textMuted}`}>
              <select
                value={mergeMode}
                onChange={(e) =>
                  setMergeMode(e.target.value as LibraryMergeMode)
                }
                className="input-field py-0.5 text-[10px]"
              >
                <option value="merge">Merge into library</option>
                <option value="replace">Replace library</option>
              </select>
            </label>
          </div>

          <ul className="space-y-2">
            {filtered.map((entry) => {
              const compat = checkPackRegistryCompatibility(entry);
              return (
                <li
                  key={entry.id}
                  className={`rounded border p-3 ${tc.border} ${
                    theme === 'dark' ? 'bg-black/20' : 'bg-white/60'
                  }`}
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <p className={`text-xs font-semibold ${tc.textBright}`}>
                        {entry.name}
                        <span className={`ml-2 font-normal ${tc.textMuted}`}>
                          v{entry.version}
                        </span>
                      </p>
                      <p className={`mt-0.5 text-[10px] leading-snug ${tc.text}`}>
                        {entry.description}
                      </p>
                      <p className={`mt-1 text-[9px] ${tc.textMuted}`}>
                        {entry.macroCount} macro
                        {entry.macroCount === 1 ? '' : 's'}
                        {entry.author ? ` · ${entry.author}` : ''}
                        {entry.bundled ? ' · bundled' : ''}
                        {entry.publishedAt ? ` · ${entry.publishedAt}` : ''}
                      </p>
                      {entry.tags.length > 0 ? (
                        <p className={`mt-1 text-[9px] ${tc.textMuted}`}>
                          {entry.tags.map((t) => `#${t}`).join(' ')}
                        </p>
                      ) : null}
                      {entry.releaseNotes ? (
                        <p className={`mt-1 text-[9px] italic ${tc.textMuted}`}>
                          {entry.releaseNotes}
                        </p>
                      ) : null}
                      {!compat.compatible ? (
                        <p className="mt-1 text-[9px] text-amber-400">
                          {compat.reason}
                        </p>
                      ) : null}
                    </div>
                    <button
                      type="button"
                      disabled={!compat.compatible || installingId === entry.id}
                      onClick={() => void handleInstall(entry)}
                      className="inline-flex shrink-0 items-center gap-1 rounded bg-indigo-700 px-2 py-1 text-[10px] text-white hover:bg-indigo-600 disabled:cursor-not-allowed disabled:opacity-50"
                    >
                      <FiDownload size={10} />
                      {installingId === entry.id ? 'Installing…' : 'Install'}
                    </button>
                  </div>
                </li>
              );
            })}
          </ul>

          {filtered.length === 0 ? (
            <p className={`text-[10px] ${tc.textMuted}`}>No packs match your search.</p>
          ) : null}
        </div>

        <div
          className={`shrink-0 border-t px-4 py-3 text-[10px] ${tc.border} ${tc.textMuted}`}
        >
          {msg ?? (
            <>
              Curated packs ship with the app; remote registry and GitHub
              Release assets refresh on demand.
            </>
          )}
        </div>
      </div>
    </div>
  );
};

export default LibraryPackBrowserDialog;
