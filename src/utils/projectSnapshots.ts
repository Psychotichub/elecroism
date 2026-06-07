import { v4 as uuid } from 'uuid';
import type { ElectroProject, ProjectFileDocument } from '../types/project';
import { deserializeProjectFile, serializeProject } from './projectPersistence';

const DB_NAME = 'electroism.snapshots.v1';
const STORE = 'snapshots';
const DB_VERSION = 1;
export const SNAPSHOT_INTERVAL_MS = 5 * 60 * 1000;
const MAX_SNAPSHOTS = 40;

export type ProjectSnapshotRecord = {
  id: string;
  projectId: string;
  projectName: string;
  savedAt: string;
  label: string;
  sheetCount: number;
  document: ProjectFileDocument;
};

export type ProjectSnapshotSummary = {
  id: string;
  projectId: string;
  projectName: string;
  savedAt: string;
  label: string;
  sheetCount: number;
};

let lastPeriodicSnapshotAt = 0;

export function shouldTakePeriodicSnapshot(
  lastAt: number,
  now: number,
  intervalMs = SNAPSHOT_INTERVAL_MS
): boolean {
  return now - lastAt >= intervalMs;
}

export function buildSnapshotRecord(
  project: ElectroProject,
  label: string
): ProjectSnapshotRecord {
  return {
    id: uuid(),
    projectId: project.id,
    projectName: project.name,
    savedAt: new Date().toISOString(),
    label: label.trim() || 'Snapshot',
    sheetCount: project.sheets.length,
    document: serializeProject(project),
  };
}

export function snapshotToSummary(
  record: ProjectSnapshotRecord
): ProjectSnapshotSummary {
  return {
    id: record.id,
    projectId: record.projectId,
    projectName: record.projectName,
    savedAt: record.savedAt,
    label: record.label,
    sheetCount: record.sheetCount,
  };
}

export function formatSnapshotTime(iso: string): string {
  try {
    return new Date(iso).toLocaleString();
  } catch {
    return iso;
  }
}

function openSnapshotDb(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    if (typeof indexedDB === 'undefined') {
      reject(new Error('IndexedDB unavailable'));
      return;
    }
    const req = indexedDB.open(DB_NAME, DB_VERSION);
    req.onupgradeneeded = () => {
      const db = req.result;
      if (!db.objectStoreNames.contains(STORE)) {
        const os = db.createObjectStore(STORE, { keyPath: 'id' });
        os.createIndex('savedAt', 'savedAt');
        os.createIndex('projectId', 'projectId');
      }
    };
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error ?? new Error('IndexedDB open failed'));
  });
}

function withStore<T>(
  mode: IDBTransactionMode,
  fn: (store: IDBObjectStore) => IDBRequest<T>
): Promise<T> {
  return openSnapshotDb().then(
    (db) =>
      new Promise<T>((resolve, reject) => {
        const tx = db.transaction(STORE, mode);
        const store = tx.objectStore(STORE);
        const req = fn(store);
        req.onsuccess = () => resolve(req.result);
        req.onerror = () =>
          reject(req.error ?? new Error('IndexedDB request failed'));
        tx.oncomplete = () => db.close();
        tx.onerror = () =>
          reject(tx.error ?? new Error('IndexedDB transaction failed'));
      })
  );
}

async function pruneSnapshots(): Promise<void> {
  const all = await listProjectSnapshots(500);
  if (all.length <= MAX_SNAPSHOTS) return;
  const toDelete = all.slice(MAX_SNAPSHOTS);
  for (const s of toDelete) {
    await deleteProjectSnapshot(s.id);
  }
}

export async function saveProjectSnapshot(
  project: ElectroProject,
  label = 'Snapshot'
): Promise<ProjectSnapshotSummary | null> {
  if (typeof indexedDB === 'undefined') return null;
  try {
    const record = buildSnapshotRecord(project, label);
    await withStore('readwrite', (store) => store.put(record));
    await pruneSnapshots();
    return snapshotToSummary(record);
  } catch {
    return null;
  }
}

export async function maybeSavePeriodicSnapshot(
  project: ElectroProject
): Promise<void> {
  const now = Date.now();
  if (!shouldTakePeriodicSnapshot(lastPeriodicSnapshotAt, now)) return;
  const saved = await saveProjectSnapshot(project, 'Auto snapshot');
  if (saved) lastPeriodicSnapshotAt = now;
}

export function resetPeriodicSnapshotThrottle(): void {
  lastPeriodicSnapshotAt = 0;
}

export async function listProjectSnapshots(
  limit = 20
): Promise<ProjectSnapshotSummary[]> {
  if (typeof indexedDB === 'undefined') return [];
  try {
    const records = await withStore<ProjectSnapshotRecord[]>('readonly', (store) =>
      store.getAll() as IDBRequest<ProjectSnapshotRecord[]>
    );
    return records
      .sort((a, b) => b.savedAt.localeCompare(a.savedAt))
      .slice(0, limit)
      .map(snapshotToSummary);
  } catch {
    return [];
  }
}

export async function loadProjectSnapshot(
  id: string
): Promise<ElectroProject | null> {
  if (typeof indexedDB === 'undefined') return null;
  try {
    const record = await withStore<ProjectSnapshotRecord | undefined>(
      'readonly',
      (store) => store.get(id) as IDBRequest<ProjectSnapshotRecord | undefined>
    );
    if (!record?.document) return null;
    return deserializeProjectFile(record.document);
  } catch {
    return null;
  }
}

export async function deleteProjectSnapshot(id: string): Promise<boolean> {
  if (typeof indexedDB === 'undefined') return false;
  try {
    await withStore('readwrite', (store) => store.delete(id));
    return true;
  } catch {
    return false;
  }
}

export async function hasAnySnapshots(): Promise<boolean> {
  const list = await listProjectSnapshots(1);
  return list.length > 0;
}
