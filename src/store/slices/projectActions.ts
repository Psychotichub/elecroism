import { v4 as uuid } from 'uuid';
import type {
  ElectroProject,
  ProjectSheet,
  ProjectTitleBlock,
  RevisionHistoryEntry,
} from '../../types/project';
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
} from '../../utils/projectPersistence';
import { createEmptyCircuit } from '../circuitDefaults';
import {
  deleteProjectSnapshot,
  listProjectSnapshots,
  loadProjectSnapshot,
  maybeSavePeriodicSnapshot,
  saveProjectSnapshot,
  updateProjectSnapshotLabel,
  type ProjectSnapshotSummary,
} from '../../utils/projectSnapshots';
import { diffProjects } from '../../utils/projectSnapshotDiff';
import type { ProjectSnapshotCompareResult } from '../../utils/projectSnapshotDiff';
import {
  addComponentMacro,
  saveComponentMacros,
  type ComponentMacro,
} from '../../utils/componentMacros';
import type { Circuit } from '../../types';
import type { CircuitStoreGet, CircuitStoreSet } from './sliceTypes';
import {
  findProjectSheetByName,
  parseCrossSheetReference,
  resolveCrossSheetTargetBounds,
} from '../../utils/crossSheetNavigation';
import { computeDrawingContentBounds } from '../../utils/drawingBounds';
import { recordRecentProject } from '../../utils/projectOpen';
import type { RecentProjectMeta } from '../../types/project';
import {
  applyProjectTitleBlock,
  appendRevisionHistoryEntry,
  migrateProjectTitleBlock,
} from '../../utils/projectTitleBlock';
import { BUNDLED_ORGANIZATION_TEMPLATES } from '../../templates/bundledOrganizationTemplates';
import {
  buildProjectFromOrganizationTemplate,
  checkOrgTemplateCompatibility,
  parseOrganizationTemplate,
  resolveOrganizationTemplate,
} from '../../utils/organizationTemplates';
import { establishSheetSaveBaselines } from '../../utils/sheetDirtyState';

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

    navigateCrossSheetRef: (raw: string) => {
      const ref = parseCrossSheetReference(raw.trim());
      if (!ref) return false;

      const committed = get().commitActiveSheet();
      const targetSheet = findProjectSheetByName(committed, ref.sheetName);
      if (!targetSheet) return false;

      if (committed.activeSheetId !== targetSheet.id) {
        const switched = get().switchProjectSheet(targetSheet.id);
        if (!switched) return false;
      }

      const circuit = get().circuit;
      if (ref.target) {
        const bounds = resolveCrossSheetTargetBounds(circuit, ref.target);
        if (!bounds) return false;
        const comp = circuit.components.find(
          (c) =>
            c.label.trim().toLowerCase() ===
            ref.target!.replace(/^=/, '').trim().toLowerCase()
        );
        if (comp) {
          return get().focusComponents([comp.id]);
        }
        return get().frameViewport(bounds);
      }

      const bounds = computeDrawingContentBounds(circuit);
      if (bounds) {
        return get().frameViewport(bounds);
      }
      return true;
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
        sheetSaveBaselines: establishSheetSaveBaselines(project),
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

    newProjectFromOrganizationTemplate: async (
      templateId: string
    ): Promise<string | null> => {
      try {
        const template = await resolveOrganizationTemplate(
          templateId,
          BUNDLED_ORGANIZATION_TEMPLATES
        );
        if (!template) return 'Organization template not found.';
        const compat = checkOrgTemplateCompatibility(template);
        if (!compat.compatible) return compat.reason ?? 'Template not compatible.';
        const project = await buildProjectFromOrganizationTemplate(template);
        const circuit = activeSheetCircuit(project);
        if (!circuit) return 'Template produced an invalid project.';
        set({
          project,
          sheetSaveBaselines: establishSheetSaveBaselines(project),
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
        return null;
      } catch (e) {
        return e instanceof Error ? e.message : 'Could not create project from template.';
      }
    },

    loadOrganizationTemplateFile: (data: unknown): string | null => {
      const template = parseOrganizationTemplate(data);
      if (!template) return 'Invalid organization template (.orgtemplate.json).';
      const compat = checkOrgTemplateCompatibility(template);
      if (!compat.compatible) return compat.reason ?? 'Template not compatible.';
      const existing = BUNDLED_ORGANIZATION_TEMPLATES.findIndex(
        (t) => t.id === template.id
      );
      if (existing >= 0) {
        BUNDLED_ORGANIZATION_TEMPLATES[existing] = template;
      } else {
        BUNDLED_ORGANIZATION_TEMPLATES.push(template);
      }
      return null;
    },

    setProjectTitleBlock: (patch: Partial<ProjectTitleBlock>) => {
      const committed = get().commitActiveSheet();
      const next = applyProjectTitleBlock(committed, patch);
      const circuit = activeSheetCircuit(next);
      if (!circuit) return;
      set({ project: next, circuit });
      saveAutosave(next);
    },

    addRevisionHistoryEntry: (entry: RevisionHistoryEntry) => {
      const committed = get().commitActiveSheet();
      const next = appendRevisionHistoryEntry(committed, entry);
      const circuit = activeSheetCircuit(next);
      if (!circuit) return;
      set({ project: next, circuit });
      saveAutosave(next);
    },

    loadProject: (project: ElectroProject, recentMeta?: RecentProjectMeta) => {
      const migrated = migrateProjectTitleBlock(project);
      const circuit = activeSheetCircuit(migrated);
      if (!circuit) return;
      set({
        project: migrated,
        sheetSaveBaselines: establishSheetSaveBaselines(migrated),
      });
      syncProjectLibrary(migrated);
      get().hydrateCircuit(circuit);
      void recordRecentProject(migrated, recentMeta);
      saveAutosave(migrated);
    },

    loadProjectFromDocument: (
      data: unknown,
      recentMeta?: RecentProjectMeta
    ) => {
      const project = deserializeProjectFile(data);
      if (!project) return false;
      get().loadProject(project, recentMeta);
      return true;
    },

    loadCircuitAsProject: (circuit: Circuit) => {
      get().loadProject(projectFromSingleCircuit(circuit));
    },

    saveProject: () => {
      const project = get().commitActiveSheet();
      downloadProjectFile(project);
      set({ sheetSaveBaselines: establishSheetSaveBaselines(project) });
      void recordRecentProject(project);
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

    renameProjectSnapshot: async (snapshotId: string, label: string) => {
      return updateProjectSnapshotLabel(snapshotId, label);
    },

    compareProjectSnapshot: async (
      snapshotId: string
    ): Promise<ProjectSnapshotCompareResult | null> => {
      const base = await loadProjectSnapshot(snapshotId);
      if (!base) return null;
      const compare = get().commitActiveSheet();
      const record = await listProjectSnapshots(200).then((list) =>
        list.find((s) => s.id === snapshotId)
      );
      const baseLabel = record?.label ?? 'Snapshot';
      return {
        diff: diffProjects(base, compare, baseLabel, 'Current project'),
        baseProject: base,
      };
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
