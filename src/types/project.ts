import type { Circuit } from './index';
import type { ComponentMacro } from '../utils/componentMacros';
import type { PluginManifest } from './plugin';

/** Circuit payload stored inside a project sheet (full circuit document). */
export type SheetCircuitData = Circuit;

export interface ProjectSheet {
  id: string;
  name: string;
  sortOrder: number;
  circuit: SheetCircuitData;
}

export type RevisionHistoryEntry = {
  revision: string;
  date: string;
  description: string;
  drawnBy?: string;
  checkedBy?: string;
  approvedBy?: string;
};

export type ProjectTitleBlock = {
  /** Organization / company brand shown in the title block header. */
  brandName?: string;
  /** Brand logo URL (app path or data URL) for UI and PDF export. */
  logoUrl?: string;
  /** Client / site name on exported drawings. */
  client?: string;
  drawingNumber?: string;
  revision?: string;
  /** Drawing scale label (e.g. `1:50`, `NTS`). */
  scale?: string;
  drawnBy?: string;
  checkedBy?: string;
  approvedBy?: string;
  revisionHistory?: RevisionHistoryEntry[];
};

export interface ElectroProject {
  id: string;
  name: string;
  createdAt: string;
  updatedAt: string;
  activeSheetId: string;
  sheets: ProjectSheet[];
  /** Shared macro library saved with the project file. */
  library: ComponentMacro[];
  /** Project-wide title block applied to every sheet on export. */
  titleBlock?: ProjectTitleBlock;
  /** JSON plugin manifests loaded into this project. */
  plugins?: PluginManifest[];
}

export interface RecentProjectEntry {
  name: string;
  updatedAt: string;
  sheetCount: number;
  /** Filename or path tail shown in Open Recent. */
  displayName?: string;
  /** Absolute path when opened from disk (Electron). */
  filePath?: string;
  /** IndexedDB key for reopen in browser or when path is unavailable. */
  storageId?: string;
}

export type RecentProjectMeta = {
  displayName?: string;
  filePath?: string;
  storageId?: string;
};

export const PROJECT_FILE_VERSION = '2.0';

export interface ProjectFileDocument {
  version: string;
  name: string;
  created: string;
  updated: string;
  activeSheetId: string;
  sheets: ProjectSheet[];
  library: ComponentMacro[];
  titleBlock?: ProjectTitleBlock;
  plugins?: PluginManifest[];
}
