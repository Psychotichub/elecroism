import { create } from 'zustand';
import type { DrawingLayerId } from '../types';
import {
  DRAWING_LAYER_LABELS,
  DRAWING_LAYER_ORDER,
  DRAWING_LAYER_WASH_COLORS,
} from '../utils/drawingLayers';

const STORAGE_KEY = 'electroism.drawingLayers.v1';

export type DrawingLayerSettings = {
  id: DrawingLayerId;
  label: string;
  visible: boolean;
  locked: boolean;
  colorWash: boolean;
  washColor: string;
  exportInclude: boolean;
};

function defaultLayers(): DrawingLayerSettings[] {
  return DRAWING_LAYER_ORDER.map((id) => ({
    id,
    label: DRAWING_LAYER_LABELS[id],
    visible: true,
    locked: false,
    colorWash: false,
    washColor: DRAWING_LAYER_WASH_COLORS[id],
    exportInclude: true,
  }));
}

function loadState(): {
  layers: DrawingLayerSettings[];
  activeLayer: DrawingLayerId;
  selectActiveLayerOnly: boolean;
} {
  const fallback = {
    layers: defaultLayers(),
    activeLayer: 'power' as DrawingLayerId,
    selectActiveLayerOnly: false,
  };
  if (typeof window === 'undefined') return fallback;
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return fallback;
    const parsed = JSON.parse(raw) as {
      layers?: DrawingLayerSettings[];
      activeLayer?: DrawingLayerId;
      selectActiveLayerOnly?: boolean;
    };
    const byId = new Map(
      (parsed.layers ?? []).map((layer) => [layer.id, layer])
    );
    const layers = defaultLayers().map((base) => ({
      ...base,
      ...(byId.get(base.id) ?? {}),
      id: base.id,
      label: base.label,
      washColor: base.washColor,
    }));
    return {
      layers,
      activeLayer:
        parsed.activeLayer && DRAWING_LAYER_ORDER.includes(parsed.activeLayer)
          ? parsed.activeLayer
          : 'power',
      selectActiveLayerOnly: parsed.selectActiveLayerOnly === true,
    };
  } catch {
    return fallback;
  }
}

function saveState(state: {
  layers: DrawingLayerSettings[];
  activeLayer: DrawingLayerId;
  selectActiveLayerOnly: boolean;
}): void {
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  } catch {
    // ignore
  }
}

interface DrawingLayerStore {
  layers: DrawingLayerSettings[];
  activeLayer: DrawingLayerId;
  selectActiveLayerOnly: boolean;
  getLayer: (id: DrawingLayerId) => DrawingLayerSettings;
  setLayerVisible: (id: DrawingLayerId, visible: boolean) => void;
  setLayerLocked: (id: DrawingLayerId, locked: boolean) => void;
  setLayerColorWash: (id: DrawingLayerId, colorWash: boolean) => void;
  setLayerExportInclude: (id: DrawingLayerId, exportInclude: boolean) => void;
  setActiveLayer: (id: DrawingLayerId) => void;
  setSelectActiveLayerOnly: (on: boolean) => void;
  resetLayers: () => void;
  isLayerVisible: (id: DrawingLayerId) => boolean;
  isLayerLocked: (id: DrawingLayerId) => boolean;
  isLayerSelectable: (id: DrawingLayerId) => boolean;
  shouldExportLayer: (id: DrawingLayerId) => boolean;
}

export const useDrawingLayerStore = create<DrawingLayerStore>((set, get) => {
  const initial = loadState();
  const persist = () => {
    const s = get();
    saveState({
      layers: s.layers,
      activeLayer: s.activeLayer,
      selectActiveLayerOnly: s.selectActiveLayerOnly,
    });
  };

  return {
    ...initial,

    getLayer: (id) => {
      const layer = get().layers.find((l) => l.id === id);
      return layer ?? defaultLayers().find((l) => l.id === id)!;
    },

    setLayerVisible: (id, visible) => {
      set((s) => ({
        layers: s.layers.map((l) => (l.id === id ? { ...l, visible } : l)),
      }));
      persist();
    },

    setLayerLocked: (id, locked) => {
      set((s) => ({
        layers: s.layers.map((l) => (l.id === id ? { ...l, locked } : l)),
      }));
      persist();
    },

    setLayerColorWash: (id, colorWash) => {
      set((s) => ({
        layers: s.layers.map((l) => (l.id === id ? { ...l, colorWash } : l)),
      }));
      persist();
    },

    setLayerExportInclude: (id, exportInclude) => {
      set((s) => ({
        layers: s.layers.map((l) =>
          l.id === id ? { ...l, exportInclude } : l
        ),
      }));
      persist();
    },

    setActiveLayer: (id) => {
      set({ activeLayer: id });
      persist();
    },

    setSelectActiveLayerOnly: (on) => {
      set({ selectActiveLayerOnly: on });
      persist();
    },

    resetLayers: () => {
      const layers = defaultLayers();
      set({
        layers,
        activeLayer: 'power',
        selectActiveLayerOnly: false,
      });
      persist();
    },

    isLayerVisible: (id) => get().getLayer(id).visible,

    isLayerLocked: (id) => get().getLayer(id).locked,

    isLayerSelectable: (id) => {
      const s = get();
      if (!s.isLayerVisible(id) || s.isLayerLocked(id)) return false;
      if (s.selectActiveLayerOnly && id !== s.activeLayer) return false;
      return true;
    },

    shouldExportLayer: (id) => get().getLayer(id).exportInclude,
  };
});
