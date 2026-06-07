import type { ComponentProperties } from '../../types';
import {
  buildLibraryPack,
  downloadLibraryPack,
  mergeMacroLibraries,
  parseLibraryPack,
  type LibraryMergeMode,
} from '../../utils/componentLibraryPack';
import {
  loadComponentMacros,
  saveComponentMacros,
  type ComponentMacro,
} from '../../utils/componentMacros';
import type { CircuitStoreGet, CircuitStoreSet } from './sliceTypes';

function syncLibraryToStorage(library: ComponentMacro[]): void {
  saveComponentMacros(library);
}

export function createLibraryActions(
  set: CircuitStoreSet,
  get: CircuitStoreGet
) {
  return {
    setProjectLibrary: (library: ComponentMacro[]) => {
      set((state) => ({
        project: {
          ...state.project,
          library: library.slice(0, 64),
          updatedAt: new Date().toISOString(),
        },
      }));
      syncLibraryToStorage(get().project.library);
    },

    updateLibraryMacro: (
      macroId: string,
      patch: Partial<
        Pick<ComponentMacro, 'name' | 'description' | 'tags' | 'author'>
      >
    ) => {
      set((state) => ({
        project: {
          ...state.project,
          library: state.project.library.map((m: ComponentMacro) =>
            m.id === macroId
              ? {
                  ...m,
                  ...patch,
                  updatedAt: new Date().toISOString(),
                }
              : m
          ),
          updatedAt: new Date().toISOString(),
        },
      }));
      syncLibraryToStorage(get().project.library);
    },

    updateLibraryMacroComponent: (
      macroId: string,
      componentId: string,
      patch: {
        label?: string;
        terminalLabels?: string;
        properties?: Partial<ComponentProperties>;
      }
    ) => {
      set((state) => ({
        project: {
          ...state.project,
          library: state.project.library.map((macro: ComponentMacro) => {
            if (macro.id !== macroId) return macro;
            return {
              ...macro,
              updatedAt: new Date().toISOString(),
              components: macro.components.map((c) => {
                if (c.id !== componentId) return c;
                const next = { ...c };
                if (patch.label !== undefined) next.label = patch.label;
                if (patch.properties) {
                  next.properties = { ...next.properties, ...patch.properties };
                }
                if (patch.terminalLabels !== undefined) {
                  const labels = patch.terminalLabels
                    .split(',')
                    .map((s) => s.trim())
                    .filter(Boolean);
                  next.connectionPoints = next.connectionPoints.map(
                    (cp, i) => ({
                      ...cp,
                      label: labels[i] ?? cp.label,
                    })
                  );
                }
                return next;
              }),
            };
          }),
          updatedAt: new Date().toISOString(),
        },
      }));
      syncLibraryToStorage(get().project.library);
    },

    removeLibraryMacro: (macroId: string) => {
      set((state) => ({
        project: {
          ...state.project,
          library: state.project.library.filter(
            (m: ComponentMacro) => m.id !== macroId
          ),
          updatedAt: new Date().toISOString(),
        },
      }));
      syncLibraryToStorage(get().project.library);
    },

    importGlobalMacrosToProject: () => {
      const globals = loadComponentMacros();
      if (globals.length === 0) return 0;
      const before = get().project.library.length;
      const merged = mergeMacroLibraries(
        get().project.library,
        globals,
        'merge'
      );
      get().setProjectLibrary(merged);
      return merged.length - before;
    },

    exportProjectLibraryPack: (packName?: string) => {
      const library = get().project.library;
      if (library.length === 0) return false;
      const pack = buildLibraryPack(
        library,
        packName?.trim() || get().project.name || 'Component Library',
        { author: get().project.name }
      );
      downloadLibraryPack(pack, pack.name);
      return true;
    },

    importProjectLibraryPack: (
      data: unknown,
      mode: LibraryMergeMode = 'merge'
    ) => {
      const pack = parseLibraryPack(data);
      if (!pack) return false;
      const merged = mergeMacroLibraries(
        mode === 'replace' ? [] : get().project.library,
        pack.macros,
        mode
      );
      get().setProjectLibrary(merged);
      return true;
    },
  };
}
