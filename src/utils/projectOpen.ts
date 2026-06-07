import { v4 as uuid } from 'uuid';
import { useCircuitStore } from '../store/circuitStore';
import type { ElectroProject, RecentProjectEntry, RecentProjectMeta } from '../types/project';
import {
  listRecentProjects,
  serializeProject,
  touchRecentProject,
} from './projectPersistence';
import {
  loadRecentProjectDocument,
  saveRecentProjectDocument,
} from './recentProjectStorage';

export const PROJECT_FILE_ACCEPT = '.eproj,.esim,.json';

const PROJECT_EXTENSIONS = ['.eproj', '.esim', '.json'];

export function isProjectFileName(name: string): boolean {
  const lower = name.toLowerCase();
  return PROJECT_EXTENSIONS.some((ext) => lower.endsWith(ext));
}

/** True when the drag carries external files (not palette component drags). */
export function isExternalProjectFileDrag(event: DragEvent): boolean {
  const dt = event.dataTransfer;
  if (!dt?.types.includes('Files')) return false;
  if (dt.types.includes('componentType')) return false;
  return true;
}

export function firstProjectFile(files: FileList | File[]): File | null {
  const list = Array.from(files);
  return list.find((f) => isProjectFileName(f.name)) ?? null;
}

export function readProjectFileAsText(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const value = reader.result;
      resolve(typeof value === 'string' ? value : '');
    };
    reader.onerror = () => reject(reader.error ?? new Error('read failed'));
    reader.readAsText(file);
  });
}

export async function recordRecentProject(
  project: ElectroProject,
  meta?: RecentProjectMeta
): Promise<void> {
  const storageId = meta?.storageId ?? uuid();
  await saveRecentProjectDocument(storageId, serializeProject(project));
  touchRecentProject(project, {
    displayName: meta?.displayName,
    filePath: meta?.filePath,
    storageId,
  });
  syncRecentMenuToNative();
}

export function openProjectFromText(
  text: string,
  meta?: RecentProjectMeta
): { ok: boolean; error?: string } {
  try {
    const data = JSON.parse(text) as unknown;
    const { loadProjectFromDocument } = useCircuitStore.getState();
    if (!loadProjectFromDocument(data, meta)) {
      return { ok: false, error: 'Invalid project file format' };
    }
    return { ok: true };
  } catch {
    return { ok: false, error: 'Invalid file format' };
  }
}

type FileWithPath = File & { path?: string };

export async function openProjectFromFile(
  file: File,
  meta?: RecentProjectMeta
): Promise<{ ok: boolean; error?: string }> {
  try {
    const text = await readProjectFileAsText(file);
    const filePath =
      meta?.filePath ?? (file as FileWithPath).path ?? undefined;
    return openProjectFromText(text, {
      ...meta,
      displayName: meta?.displayName ?? file.name,
      filePath,
    });
  } catch {
    return { ok: false, error: 'Invalid file format' };
  }
}

export async function openRecentProject(
  entry: RecentProjectEntry
): Promise<{ ok: boolean; error?: string }> {
  let text: string | null = null;

  if (entry.filePath && window.electronAPI?.readProjectFile) {
    text = await window.electronAPI.readProjectFile(entry.filePath);
  } else if (entry.storageId) {
    const doc = await loadRecentProjectDocument(entry.storageId);
    if (doc) text = JSON.stringify(doc);
  }

  if (!text) {
    return {
      ok: false,
      error: 'This recent project is no longer available on disk.',
    };
  }

  return openProjectFromText(text, {
    displayName: entry.displayName,
    filePath: entry.filePath,
    storageId: entry.storageId,
  });
}

export function syncRecentMenuToNative(): void {
  const api = window.electronAPI;
  if (!api?.syncRecentMenu) return;
  const items = listRecentProjects().map((entry, index) => ({
    index,
    label: entry.displayName ?? entry.name,
  }));
  api.syncRecentMenu(items);
}
