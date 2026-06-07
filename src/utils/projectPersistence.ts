import { v4 as uuid } from 'uuid';
import type { Circuit } from '../types';
import type {
  ElectroProject,
  ProjectFileDocument,
  ProjectSheet,
  RecentProjectEntry,
  SheetCircuitData,
} from '../types/project';
import { PROJECT_FILE_VERSION } from '../types/project';
import type { ComponentMacro } from './componentMacros';
import { createEmptyCircuit } from '../store/circuitDefaults';

const AUTOSAVE_KEY = 'electroism.autosave.v1';
const RECENT_KEY = 'electroism.recentProjects.v1';
const MAX_RECENT = 12;

export function circuitToSheetData(circuit: Circuit): SheetCircuitData {
  return structuredClone(circuit);
}

export function sheetDataToCircuit(
  data: SheetCircuitData,
  sheetName: string
): Circuit {
  return {
    ...structuredClone(data),
    name: sheetName,
    updatedAt: new Date().toISOString(),
  };
}

export function createEmptyProject(name = 'Untitled Project'): ElectroProject {
  const now = new Date().toISOString();
  const sheetId = uuid();
  const circuit = createEmptyCircuit();
  circuit.name = 'Sheet 1';
  return {
    id: uuid(),
    name,
    createdAt: now,
    updatedAt: now,
    activeSheetId: sheetId,
    sheets: [
      {
        id: sheetId,
        name: 'Sheet 1',
        sortOrder: 0,
        circuit: circuitToSheetData(circuit),
      },
    ],
    library: [],
  };
}

export function projectFromSingleCircuit(circuit: Circuit): ElectroProject {
  const now = new Date().toISOString();
  const sheetId = uuid();
  return {
    id: uuid(),
    name: circuit.name || 'Untitled Project',
    createdAt: circuit.createdAt || now,
    updatedAt: circuit.updatedAt || now,
    activeSheetId: sheetId,
    sheets: [
      {
        id: sheetId,
        name: circuit.name || 'Sheet 1',
        sortOrder: 0,
        circuit: circuitToSheetData(circuit),
      },
    ],
    library: [],
  };
}

export function commitCircuitToProject(
  project: ElectroProject,
  circuit: Circuit
): ElectroProject {
  const now = new Date().toISOString();
  const sheets = project.sheets.map((s: ProjectSheet) =>
    s.id === project.activeSheetId
      ? { ...s, circuit: circuitToSheetData(circuit) }
      : s
  );
  return { ...project, sheets, updatedAt: now };
}

export function activeSheetCircuit(
  project: ElectroProject
): Circuit | null {
  const sheet = project.sheets.find((s) => s.id === project.activeSheetId);
  if (!sheet) return null;
  return sheetDataToCircuit(sheet.circuit, sheet.name);
}

export function serializeProject(project: ElectroProject): ProjectFileDocument {
  return {
    version: PROJECT_FILE_VERSION,
    name: project.name,
    created: project.createdAt,
    updated: project.updatedAt,
    activeSheetId: project.activeSheetId,
    sheets: project.sheets,
    library: project.library,
  };
}

export function deserializeProjectFile(
  data: unknown
): ElectroProject | null {
  if (!data || typeof data !== 'object') return null;
  const doc = data as Record<string, unknown>;

  if (doc.version === PROJECT_FILE_VERSION && Array.isArray(doc.sheets)) {
    const sheets = doc.sheets as ProjectSheet[];
    if (sheets.length === 0) return null;
    const activeSheetId =
      typeof doc.activeSheetId === 'string' &&
      sheets.some((s) => s.id === doc.activeSheetId)
        ? doc.activeSheetId
        : sheets[0].id;
    const now = new Date().toISOString();
    const docName =
      typeof doc.name === 'string' ? doc.name : 'Loaded Project';
    const docCreated =
      typeof doc.created === 'string' ? doc.created : now;
    const docUpdated =
      typeof doc.updated === 'string' ? doc.updated : now;
    return {
      id: uuid(),
      name: docName,
      createdAt: docCreated,
      updatedAt: docUpdated,
      activeSheetId,
      sheets,
      library: Array.isArray(doc.library)
        ? (doc.library as ComponentMacro[])
        : [],
    };
  }

  // Legacy .esim v1.0 — single circuit wrapper
  if (doc.version === '1.0' && doc.circuit && typeof doc.circuit === 'object') {
    const legacyName =
      typeof doc.name === 'string' ? doc.name : 'Loaded Circuit';
    const legacyCreated =
      typeof doc.created === 'string'
        ? doc.created
        : new Date().toISOString();
    const legacyCircuit: Circuit = {
      ...createEmptyCircuit(),
      ...(doc.circuit as Partial<Circuit>),
      name: legacyName,
      createdAt: legacyCreated,
      updatedAt: new Date().toISOString(),
    };
    return projectFromSingleCircuit(legacyCircuit);
  }

  return null;
}

export function downloadProjectFile(project: ElectroProject): void {
  const doc = serializeProject(project);
  const json = JSON.stringify(doc, null, 2);
  const blob = new Blob([json], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  const safe = (project.name || 'project')
    .replace(/[^\w-]+/g, '_')
    .slice(0, 80);
  a.href = url;
  a.download = `${safe}.eproj`;
  a.click();
  URL.revokeObjectURL(url);
}

export function saveAutosave(project: ElectroProject): void {
  if (typeof window === 'undefined') return;
  try {
    window.localStorage.setItem(
      AUTOSAVE_KEY,
      JSON.stringify(serializeProject(project))
    );
  } catch {
    // ignore quota
  }
}

export function loadAutosave(): ElectroProject | null {
  if (typeof window === 'undefined') return null;
  try {
    const raw = window.localStorage.getItem(AUTOSAVE_KEY);
    if (!raw) return null;
    return deserializeProjectFile(JSON.parse(raw) as unknown);
  } catch {
    return null;
  }
}

export function clearAutosave(): void {
  if (typeof window === 'undefined') return;
  try {
    window.localStorage.removeItem(AUTOSAVE_KEY);
  } catch {
    // ignore
  }
}

export function listRecentProjects(): RecentProjectEntry[] {
  if (typeof window === 'undefined') return [];
  try {
    const raw = window.localStorage.getItem(RECENT_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as unknown;
    if (!Array.isArray(parsed)) return [];
    return parsed.filter(
      (e): e is RecentProjectEntry =>
        e != null &&
        typeof e === 'object' &&
        typeof (e as RecentProjectEntry).name === 'string'
    );
  } catch {
    return [];
  }
}

export function touchRecentProject(project: ElectroProject): void {
  if (typeof window === 'undefined') return;
  const entry: RecentProjectEntry = {
    name: project.name,
    updatedAt: project.updatedAt,
    sheetCount: project.sheets.length,
  };
  const next = [
    entry,
    ...listRecentProjects().filter((r) => r.name !== entry.name),
  ].slice(0, MAX_RECENT);
  try {
    window.localStorage.setItem(RECENT_KEY, JSON.stringify(next));
  } catch {
    // ignore
  }
}
