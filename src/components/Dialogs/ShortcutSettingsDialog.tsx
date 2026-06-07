import React, { useCallback, useMemo, useState } from 'react';
import { useShortcutStore } from '../../store/shortcutStore';
import {
  SHORTCUT_DEFINITIONS,
  TOOLBAR_SLOT_COUNT,
  shortcutActionLabel,
  type ShortcutActionId,
  type ShortcutCategory,
} from '../../shortcuts/shortcutRegistry';
import {
  eventToShortcut,
  isValidCapture,
} from '../../shortcuts/shortcutMatching';
import { AppIcon, Button, Dialog, Input, Select } from '../ui';

const CATEGORY_ORDER: ShortcutCategory[] = [
  'File',
  'Edit',
  'Tools',
  'View',
  'Simulate',
  'Window',
  'Help',
];

const ShortcutSettingsDialog: React.FC = () => {
  const open = useShortcutStore((s) => s.settingsOpen);
  const setSettingsOpen = useShortcutStore((s) => s.setSettingsOpen);
  const getBinding = useShortcutStore((s) => s.getBinding);
  const setBinding = useShortcutStore((s) => s.setBinding);
  const resetAllBindings = useShortcutStore((s) => s.resetAllBindings);
  const toolbarSlots = useShortcutStore((s) => s.toolbarSlots);
  const setToolbarSlot = useShortcutStore((s) => s.setToolbarSlot);
  const resetToolbarSlots = useShortcutStore((s) => s.resetToolbarSlots);
  const findConflict = useShortcutStore((s) => s.findConflict);

  const [query, setQuery] = useState('');
  const [rebindingId, setRebindingId] = useState<ShortcutActionId | null>(null);
  const [error, setError] = useState<string | null>(null);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return SHORTCUT_DEFINITIONS;
    return SHORTCUT_DEFINITIONS.filter(
      (d) =>
        d.label.toLowerCase().includes(q) ||
        d.id.toLowerCase().includes(q) ||
        d.category.toLowerCase().includes(q) ||
        (getBinding(d.id) ?? '').toLowerCase().includes(q)
    );
  }, [query, getBinding]);

  const grouped = useMemo(() => {
    const map = new Map<ShortcutCategory, typeof SHORTCUT_DEFINITIONS>();
    for (const def of filtered) {
      const list = map.get(def.category) ?? [];
      list.push(def);
      map.set(def.category, list);
    }
    return CATEGORY_ORDER.filter((c) => map.has(c)).map((c) => ({
      category: c,
      items: map.get(c)!,
    }));
  }, [filtered]);

  const toolbarChoices = useMemo(
    () =>
      SHORTCUT_DEFINITIONS.filter((d) => d.toolbarEligible).sort((a, b) =>
        a.label.localeCompare(b.label)
      ),
    []
  );

  const onCaptureKey = useCallback(
    (e: React.KeyboardEvent) => {
      if (!rebindingId) return;
      e.preventDefault();
      e.stopPropagation();
      if (e.key === 'Escape') {
        setRebindingId(null);
        setError(null);
        return;
      }
      if (!isValidCapture(e.nativeEvent)) return;

      const captured = eventToShortcut(e.nativeEvent);
      const conflict = findConflict(captured, rebindingId);
      if (conflict) {
        setError(
          `Already assigned to “${shortcutActionLabel(conflict)}”. Press Escape to cancel.`
        );
        return;
      }
      setBinding(rebindingId, captured);
      setRebindingId(null);
      setError(null);
    },
    [findConflict, rebindingId, setBinding]
  );

  return (
    <Dialog
      open={open}
      title="Keyboard shortcuts & toolbar"
      titleId="shortcut-settings-title"
      onClose={() => setSettingsOpen(false)}
      maxWidth="lg"
      className="max-h-[90vh]"
      onKeyDown={onCaptureKey}
      footer={
        <>
          <Button variant="ghost" onClick={resetAllBindings}>
            Reset all shortcuts
          </Button>
          <Button variant="primary" onClick={() => setSettingsOpen(false)}>
            Done
          </Button>
        </>
      }
    >
      <Input
        type="search"
        placeholder="Search shortcuts…"
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        className="mb-4 es-typo-body-sm"
        autoFocus
      />

      {error ? (
        <p className="mb-3 es-typo-body-sm text-es-warning">{error}</p>
      ) : null}

      <div className="space-y-4">
        {grouped.map(({ category, items }) => (
          <section key={category}>
            <h3 className="mb-1 es-typo-label uppercase text-es-secondary">
              {category}
            </h3>
            <ul className="divide-y divide-es-borderSubtle rounded-es-md border border-es-borderSubtle">
              {items.map((def) => {
                const binding = getBinding(def.id);
                const isRebinding = rebindingId === def.id;
                return (
                  <li
                    key={def.id}
                    className="flex items-center justify-between gap-3 px-3 py-2 es-typo-body-sm"
                  >
                    <span className="min-w-0 flex-1 truncate">{def.label}</span>
                    <span className="shrink-0 font-mono es-typo-caption text-es-secondary">
                      {isRebinding ? 'Press keys…' : binding ?? '—'}
                    </span>
                    <div className="flex shrink-0 gap-1">
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        onClick={() => {
                          setError(null);
                          setRebindingId(def.id);
                        }}
                      >
                        Change
                      </Button>
                      {binding !== def.defaultBinding &&
                      (binding != null || def.defaultBinding != null) ? (
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          onClick={() => setBinding(def.id, null)}
                          title="Reset to default"
                          aria-label={`Reset ${def.label} to default`}
                        >
                          <AppIcon id="redo" size="inline" />
                        </Button>
                      ) : null}
                    </div>
                  </li>
                );
              })}
            </ul>
          </section>
        ))}
      </div>

      <section className="mt-6">
        <div className="mb-2 flex items-center justify-between">
          <h3 className="es-typo-label uppercase text-es-secondary">
            Toolbar favorites ({TOOLBAR_SLOT_COUNT} slots)
          </h3>
          <Button type="button" variant="ghost" size="sm" onClick={resetToolbarSlots}>
            Reset toolbar
          </Button>
        </div>
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
          {toolbarSlots.map((slot, index) => (
            <label
              key={`slot-${index}`}
              className="flex flex-col gap-1 rounded-es-md border border-es-borderSubtle px-2 py-1.5 es-typo-caption"
            >
              <span className="text-es-secondary">Slot {index + 1}</span>
              <Select
                value={slot ?? ''}
                onChange={(e) => {
                  const v = e.target.value;
                  setToolbarSlot(index, v ? (v as ShortcutActionId) : null);
                }}
                className="es-typo-body-sm"
              >
                <option value="">(empty)</option>
                {toolbarChoices.map((d) => (
                  <option key={d.id} value={d.id}>
                    {d.label}
                  </option>
                ))}
              </Select>
            </label>
          ))}
        </div>
      </section>
    </Dialog>
  );
};

export default ShortcutSettingsDialog;
