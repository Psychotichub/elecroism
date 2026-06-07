import { v4 as uuid } from 'uuid';
import type { ElectroProject, ProjectSheet } from '../../types/project';
import {
  activeSheetCircuit,
  circuitToSheetData,
  clearAutosave,
  commitCircuitToProject,
  createEmptyProject,
  deserializeProjectFile,
  downloadProjectFile,
  listRecentProjects,
  loadAutosave,
  projectFromSingleCircuit,
  saveAutosave,
  touchRecentProject,
} from '../../utils/projectPersistence';
import { createEmptyCircuit } from '../circuitDefaults';
import {
  deleteProjectSnapshot,
  listProjectSnapshots,
  loadProjectSnapshot,
  maybeSavePeriodicSnapshot,
  saveProjectSnapshot,
  type ProjectSnapshotSummary,
} from '../../utils/projectSnapshots';
import {
  addComponentMacro,
  saveComponentMacros,
  type ComponentMacro,
} from '../../utils/componentMacros';
import type { Circuit } from '../../types';
import type { CircuitStoreGet, CircuitStoreSet } from './sliceTypes';

function syncProjectLibrary(project: ElectroProject): void {
  saveComponentMacros(project.library);
}

export function createProjectActions(
  set: CircuitStoreSet,
  get: CircuitStoreGet
) {
  return {
    commitActiveSheet: () => {
      const { project, circuit } = get();
      const next = commitCircuitToProject(project, circuit);
      set({ project: next });
      return next;
    },

    switchProjectSheet: (sheetId: string) => {
      const committed = get().commitActiveSheet();
      if (!committed.sheets.some((s: ProjectSheet) => s.id === sheetId)) {
        return false;
      }
      const project: ElectroProject = {
        ...committed,
        activeSheetId: sheetId,
      };
      const circuit = activeSheetCircuit(project);
      if (!circuit) return false;
      set({ project });
      syncProjectLibrary(project);
      get().hydrateCircuit(circuit);
      return true;
    },

    addProjectSheet: (name?: string) => {
      const committed = get().commitActiveSheet();
      const nextNum =
        committed.sheets.reduce(
          (m: number, s: ProjectSheet) => Math.max(m, s.sortOrder),
          0
        ) + 1;
      const sheetId = uuid();
      const sheetCircuit = createEmptyCircuit();
      sheetCircuit.name = name?.trim() || `Sheet ${nextNum + 1}`;
      const sheet = {
        id: sheetId,
        name: sheetCircuit.name,
        sortOrder: nextNum,
        circuit: circuitToSheetData(sheetCircuit),
      };
      const project: ElectroProject = {
        ...committed,
        activeSheetId: sheetId,
        sheets: [...committed.sheets, sheet],
        updatedAt: new Date().toISOString(),
      };
      set({ project });
      get().hydrateCircuit(sheetCircuit);
      get().pushHistory('Added sheet');
      return sheetId;
    },

    duplicateProjectSheet: (sheetId: string) => {
      const committed = get().commitActiveSheet();
      const source = committed.sheets.find((s: ProjectSheet) => s.id === sheetId);
      if (!source) return null;
      const newId = uuid();
      const nextNum =
        committed.sheets.reduce(
          (m: number, s: ProjectSheet) => Math.max(m, s.sortOrder),
          0
        ) + 1;
      const cloneName = `${source.name} copy`;
      const cloneCircuit = structuredClone(source.circuit);
      cloneCircuit.name = cloneName;
      const sheet = {
        id: newId,
        name: cloneName,
        sortOrder: nextNum,
        circuit: cloneCircuit,
      };
      const project: ElectroProject = {
        ...committed,
        activeSheetId: newId,
        sheets: [...committed.sheets, sheet],
        updatedAt: new Date().toISOString(),
      };
      const circuit = activeSheetCircuit(project);
      if (!circuit) return null;
      set({ project });
      get().loadCircuit(circuit);
      get().pushHistory('Duplicated sheet');
      return newId;
    },

    renameProjectSheet: (sheetId: string, name: string) => {
      const trimmed = name.trim();
      if (!trimmed) return;
      set((state) => ({
        project: {
          ...state.project,
          sheets: state.project.sheets.map((s: ProjectSheet) =>
            s.id === sheetId ? { ...s, name: trimmed } : s
          ),
          updatedAt: new Date().toISOString(),
        },
        circuit:
          state.project.activeSheetId === sheetId
            ? { ...state.circuit, name: trimmed }
            : state.circuit,
      }));
    },

    removeProjectSheet: (sheetId: string) => {
      const committed = get().commitActiveSheet();
      if (committed.sheets.length <= 1) return false;
      const remaining = committed.sheets.filter(
        (s: ProjectSheet) => s.id !== sheetId
      );
      const activeSheetId =
        committed.activeSheetId === sheetId
          ? remaining[0].id
          : committed.activeSheetId;
      const project: ElectroProject = {
        ...committed,
        sheets: remaining,
        activeSheetId,
        updatedAt: new Date().toISOString(),
      };
      const circuit = activeSheetCircuit(project);
      if (!circuit) return false;
      set({ project });
      get().hydrateCircuit(circuit);
      get().pushHistory('Removed sheet');
      return true;
    },

    setProjectName: (name: string) => {
      const trimmed = name.trim();
      if (!trimmed) return;
      set((state) => ({
        project: {
          ...state.project,
          name: trimmed,
          updatedAt: new Date().toISOString(),
        },
      }));
    },

    newProject: (name?: string) => {
      const project = createEmptyProject(name?.trim() || 'Untitled Project');
      const circuit = activeSheetCircuit(project);
      if (!circuit) return;
      set({
        project,
        simulationResult: null,
        selectedId: null,
        wireGripVertexIndex: null,
        history: [],
        historyIndex: -1,
        bmsSimLog: [],
      });
      syncProjectLibrary(project);
      get().hydrateCircuit(circuit);
      clearAutosave();
    },

    loadProject: (project: ElectroProject) => {
      const circuit = activeSheetCircuit(project);
      if (!circuit) return;
      set({ project });
      syncProjectLibrary(project);
      get().hydrateCircuit(circuit);
      touchRecentProject(project);
      saveAutosave(project);
    },

    loadProjectFromDocument: (data: unknown) => {
      const project = deserializeProjectFile(data);
      if (!project) return false;
      get().loadProject(project);
      return true;
    },

    loadCircuitAsProject: (circuit: Circuit) => {
      get().loadProject(projectFromSingleCircuit(circuit));
    },

    saveProject: () => {
      const project = get().commitActiveSheet();
      downloadProjectFile(project);
      touchRecentProject(project);
      saveAutosave(project);
    },

    autosaveProject: () => {
      const project = get().commitActiveSheet();
      saveAutosave(project);
      void maybeSavePeriodicSnapshot(project);
    },

    createProjectSnapshot: async (label?: string) => {
      const project = get().commitActiveSheet();
      const summary = await saveProjectSnapshot(
        project,
        label?.trim() || 'Manual snapshot'
      );
      return summary != null;
    },

    listStoredSnapshots: async (): Promise<ProjectSnapshotSummary[]> => {
      return listProjectSnapshots(30);
    },

    restoreProjectSnapshot: async (snapshotId: string) => {
      const project = await loadProjectSnapshot(snapshotId);
      if (!project) return false;
      get().loadProject(project);
      return true;
    },

    deleteProjectSnapshot: async (snapshotId: string) => {
      return deleteProjectSnapshot(snapshotId);
    },

    restoreAutosavedProject: () => {
      const project = loadAutosave();
      if (!project) return false;
      get().loadProject(project);
      return true;
    },

    discardAutosavedProject: () => {
      clearAutosave();
    },

    getRecentProjects: () => listRecentProjects(),

    getProjectLibrary: (): ComponentMacro[] => get().project.library,

    addMacroToProjectLibrary: (
      name: string,
      components: ComponentMacro['components'],
      wires: ComponentMacro['wires']
    ): ComponentMacro => {
      const macro = addComponentMacro(name, components, wires);
      set((state) => {
        const library = [
          macro,
          ...state.project.library.filter(
            (m: ComponentMacro) => m.id !== macro.id
          ),
        ].slice(0, 64);
        const project = {
          ...state.project,
          library,
          updatedAt: new Date().toISOString(),
        };
        syncProjectLibrary(project);
        return { project };
      });
      return macro;
    },
  };
}
