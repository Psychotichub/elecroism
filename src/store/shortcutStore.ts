import { create } from 'zustand';
import {
  DEFAULT_TOOLBAR_SLOTS,
  SHORTCUT_DEFINITIONS,
  TOOLBAR_SLOT_COUNT,
  type ShortcutActionId,
} from '../shortcuts/shortcutRegistry';
import { normalizeShortcut } from '../shortcuts/shortcutMatching';

const BINDINGS_KEY = 'electroism.shortcuts.bindings.v1';
const TOOLBAR_KEY = 'electroism.shortcuts.toolbar.v1';

function loadBindings(): Partial<Record<ShortcutActionId, string>> {
  if (typeof window === 'undefined') return {};
  try {
    const raw = window.localStorage.getItem(BINDINGS_KEY);
    if (!raw) return {};
    const parsed = JSON.parse(raw) as Record<string, string>;
    const out: Partial<Record<ShortcutActionId, string>> = {};
    for (const [id, binding] of Object.entries(parsed)) {
      if (typeof binding === 'string' && binding.trim()) {
        out[id as ShortcutActionId] = binding.trim();
      }
    }
    return out;
  } catch {
    return {};
  }
}

function saveBindings(bindings: Partial<Record<ShortcutActionId, string>>): void {
  try {
    window.localStorage.setItem(BINDINGS_KEY, JSON.stringify(bindings));
  } catch {
    // ignore
  }
}

function loadToolbarSlots(): (ShortcutActionId | null)[] {
  if (typeof window === 'undefined') {
    return [...DEFAULT_TOOLBAR_SLOTS];
  }
  try {
    const raw = window.localStorage.getItem(TOOLBAR_KEY);
    if (!raw) return [...DEFAULT_TOOLBAR_SLOTS];
    const parsed = JSON.parse(raw) as unknown;
    if (!Array.isArray(parsed)) return [...DEFAULT_TOOLBAR_SLOTS];
    const slots: (ShortcutActionId | null)[] = [];
    for (let i = 0; i < TOOLBAR_SLOT_COUNT; i++) {
      const v: unknown = parsed[i];
      slots.push(typeof v === 'string' ? (v as ShortcutActionId) : null);
    }
    return slots;
  } catch {
    return [...DEFAULT_TOOLBAR_SLOTS];
  }
}

function saveToolbarSlots(slots: (ShortcutActionId | null)[]): void {
  try {
    window.localStorage.setItem(TOOLBAR_KEY, JSON.stringify(slots));
  } catch {
    // ignore
  }
}

interface ShortcutStore {
  bindings: Partial<Record<ShortcutActionId, string>>;
  toolbarSlots: (ShortcutActionId | null)[];
  settingsOpen: boolean;
  getBinding: (id: ShortcutActionId) => string | null;
  setBinding: (id: ShortcutActionId, binding: string | null) => void;
  resetAllBindings: () => void;
  setToolbarSlot: (index: number, id: ShortcutActionId | null) => void;
  resetToolbarSlots: () => void;
  findActionForEvent: (e: KeyboardEvent) => ShortcutActionId | null;
  findConflict: (
    binding: string,
    exceptId?: ShortcutActionId
  ) => ShortcutActionId | null;
  setSettingsOpen: (open: boolean) => void;
}

export const useShortcutStore = create<ShortcutStore>((set, get) => ({
  bindings: loadBindings(),
  toolbarSlots: loadToolbarSlots(),
  settingsOpen: false,

  getBinding: (id) => {
    const override = get().bindings[id];
    if (override !== undefined) return override || null;
    const def = SHORTCUT_DEFINITIONS.find((d) => d.id === id);
    return def?.defaultBinding ?? null;
  },

  setBinding: (id, binding) => {
    set((s) => {
      const next = { ...s.bindings };
      if (binding == null || binding === '') {
        delete next[id];
      } else {
        next[id] = binding;
      }
      saveBindings(next);
      return { bindings: next };
    });
  },

  resetAllBindings: () => {
    saveBindings({});
    set({ bindings: {} });
  },

  setToolbarSlot: (index, id) => {
    if (index < 0 || index >= TOOLBAR_SLOT_COUNT) return;
    set((s) => {
      const next = [...s.toolbarSlots];
      next[index] = id;
      saveToolbarSlots(next);
      return { toolbarSlots: next };
    });
  },

  resetToolbarSlots: () => {
    const next = [...DEFAULT_TOOLBAR_SLOTS];
    saveToolbarSlots(next);
    set({ toolbarSlots: next });
  },

  findActionForEvent: (e) => {
    const normalized = normalizeShortcut(eventToShortcutSafe(e));
    for (const def of SHORTCUT_DEFINITIONS) {
      const binding = get().getBinding(def.id);
      if (!binding) continue;
      if (normalizeShortcut(binding) === normalized) {
        return def.id;
      }
    }
    return null;
  },

  findConflict: (binding, exceptId) => {
    const normalized = normalizeShortcut(binding);
    for (const def of SHORTCUT_DEFINITIONS) {
      if (def.id === exceptId) continue;
      const existing = get().getBinding(def.id);
      if (existing && normalizeShortcut(existing) === normalized) {
        return def.id;
      }
    }
    return null;
  },

  setSettingsOpen: (open) => set({ settingsOpen: open }),
}));

function eventToShortcutSafe(e: KeyboardEvent): string {
  const parts: string[] = [];
  if (e.ctrlKey || e.metaKey) parts.push('Ctrl');
  if (e.altKey) parts.push('Alt');
  if (e.shiftKey) parts.push('Shift');
  let key = e.key;
  if (key === ' ') key = 'Space';
  else if (key.length === 1) key = key.toUpperCase();
  parts.push(key);
  return parts.join('+');
}
