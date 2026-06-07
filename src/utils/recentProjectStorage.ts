import type { ProjectFileDocument } from '../types/project';

const DB_NAME = 'electroism.recentProjects';
const STORE = 'documents';
const DB_VERSION = 1;

function withStore<T>(
  mode: IDBTransactionMode,
  fn: (store: IDBObjectStore) => IDBRequest<T>
): Promise<T> {
  return new Promise((resolve, reject) => {
    if (typeof indexedDB === 'undefined') {
      reject(new Error('IndexedDB unavailable'));
      return;
    }
    const req = indexedDB.open(DB_NAME, DB_VERSION);
    req.onerror = () => reject(req.error ?? new Error('IndexedDB open failed'));
    req.onupgradeneeded = () => {
      const db = req.result;
      if (!db.objectStoreNames.contains(STORE)) {
        db.createObjectStore(STORE);
      }
    };
    req.onsuccess = () => {
      const db = req.result;
      const tx = db.transaction(STORE, mode);
      const store = tx.objectStore(STORE);
      const op = fn(store);
      op.onsuccess = () => resolve(op.result);
      op.onerror = () => reject(op.error ?? new Error('IndexedDB operation failed'));
      tx.oncomplete = () => db.close();
      tx.onerror = () => reject(tx.error ?? new Error('IndexedDB transaction failed'));
    };
  });
}

export async function saveRecentProjectDocument(
  storageId: string,
  document: ProjectFileDocument
): Promise<void> {
  if (typeof indexedDB === 'undefined') return;
  try {
    await withStore('readwrite', (store) => store.put(document, storageId));
  } catch {
    // ignore — recent list still works without persisted copy
  }
}

export async function loadRecentProjectDocument(
  storageId: string
): Promise<ProjectFileDocument | null> {
  if (typeof indexedDB === 'undefined') return null;
  try {
    const doc = await withStore<ProjectFileDocument | undefined>('readonly', (store) => {
      const req = store.get(storageId);
      return req as IDBRequest<ProjectFileDocument | undefined>;
    });
    return doc ?? null;
  } catch {
    return null;
  }
}
